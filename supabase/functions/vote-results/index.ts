import { createClient } from 'npm:@supabase/supabase-js@2.115.0'

const campaignId = 'd844f5be-88d4-4a98-95d4-cb6e569f68bf'
const githubPagesOrigin = 'https://jungseoro.github.io'
const productionOrigin = 'https://gomgom-vote.jungseoro.com'
const sessionTokenPattern = /^[0-9a-f]{64}$/
const requestBodyLimit = 4096

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const readKeySet = (rawValue: string | undefined): string[] => {
  if (!rawValue) return []

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!isRecord(parsed)) return []
    return Object.values(parsed).filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  ?? readKeySet(Deno.env.get('SUPABASE_SECRET_KEYS'))[0]
  ?? ''
const acceptedApiKeys = new Set([
  Deno.env.get('SUPABASE_ANON_KEY'),
  ...readKeySet(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')),
].filter((value): value is string => Boolean(value)))
const configuredOrigins = (Deno.env.get('ADMIN_RESULTS_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = new Set([githubPagesOrigin, productionOrigin, ...configuredOrigins])

const database = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null

const isAllowedOrigin = (origin: string | null) => {
  if (!origin) return true
  if (allowedOrigins.has(origin)) return true

  try {
    const url = new URL(origin)
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

const responseHeaders = (request: Request) => {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': 'application/json; charset=utf-8',
    Pragma: 'no-cache',
    Vary: 'Origin',
  }
  const origin = request.headers.get('origin')

  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Headers'] = 'apikey, content-type'
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    headers['Access-Control-Max-Age'] = '3600'
  }

  return headers
}

const jsonResponse = (
  request: Request,
  body: JsonRecord,
  status = 200,
  extraHeaders: Record<string, string> = {},
) => new Response(JSON.stringify(body), {
  status,
  headers: { ...responseHeaders(request), ...extraHeaders },
})

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const getClientAddress = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('cf-connecting-ip') || 'unknown'
}

const readBody = async (request: Request): Promise<JsonRecord | null> => {
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > requestBodyLimit) return null

  const rawBody = await request.text()
  if (!rawBody || new TextEncoder().encode(rawBody).byteLength > requestBodyLimit) return null

  try {
    const parsed = JSON.parse(rawBody) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

const handleLogin = async (request: Request, body: JsonRecord) => {
  const password = body.password
  if (
    typeof password !== 'string'
    || password.length === 0
    || new TextEncoder().encode(password).byteLength > 72
  ) {
    return jsonResponse(request, { error: 'invalid_password' }, 403)
  }

  const requestKey = await sha256Hex(getClientAddress(request))
  const { data, error } = await database!.rpc('unlock_vote_results', {
    p_password: password,
    p_request_key: requestKey,
  })

  if (error || !isRecord(data) || typeof data.status !== 'string') {
    console.error('vote-results login database error', error?.code ?? 'invalid_response')
    return jsonResponse(request, { error: 'server_error' }, 500)
  }

  if (data.status === 'rate_limited') {
    return jsonResponse(request, { error: 'rate_limited' }, 429, { 'Retry-After': '900' })
  }

  if (data.status === 'not_configured') {
    return jsonResponse(request, { error: 'not_configured' }, 503)
  }

  if (data.status !== 'ok' || typeof data.access_token !== 'string' || typeof data.expires_at !== 'string') {
    return jsonResponse(request, { error: 'invalid_password' }, 403)
  }

  return jsonResponse(request, {
    sessionToken: data.access_token,
    expiresAt: data.expires_at,
  })
}

const handleResults = async (request: Request, body: JsonRecord) => {
  const sessionToken = body.sessionToken
  const nicknameFilter = typeof body.nicknameFilter === 'string' ? body.nicknameFilter.trim() : ''
  const page = body.page

  if (
    typeof sessionToken !== 'string'
    || !sessionTokenPattern.test(sessionToken)
    || body.campaignId !== campaignId
    || nicknameFilter.length > 20
    || !Number.isSafeInteger(page)
    || (page as number) < 1
    || (page as number) > 10000
  ) {
    return jsonResponse(request, { error: 'invalid_request' }, 400)
  }

  const sessionHash = await sha256Hex(sessionToken)
  const { data, error } = await database!.rpc('get_vote_results', {
    p_session_hash: sessionHash,
    p_campaign_id: campaignId,
    p_nickname_filter: nicknameFilter || null,
    p_page: page,
    p_page_size: 50,
  })

  if (error?.code === '42501') {
    return jsonResponse(request, { error: 'invalid_session' }, 401)
  }

  if (error) {
    console.error('vote-results query database error', error.code)
    return jsonResponse(request, { error: 'server_error' }, 500)
  }

  return jsonResponse(request, { data })
}

const handleLogout = async (request: Request, body: JsonRecord) => {
  const sessionToken = body.sessionToken
  if (typeof sessionToken !== 'string' || !sessionTokenPattern.test(sessionToken)) {
    return jsonResponse(request, { ok: true })
  }

  const sessionHash = await sha256Hex(sessionToken)
  const { error } = await database!.rpc('lock_vote_results', {
    p_session_hash: sessionHash,
  })

  if (error) {
    console.error('vote-results logout database error', error.code)
    return jsonResponse(request, { error: 'server_error' }, 500)
  }

  return jsonResponse(request, { ok: true })
}

Deno.serve(async (request) => {
  if (!isAllowedOrigin(request.headers.get('origin'))) {
    return jsonResponse(request, { error: 'origin_not_allowed' }, 403)
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders(request) })
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, { error: 'method_not_allowed' }, 405, { Allow: 'POST, OPTIONS' })
  }

  const apiKey = request.headers.get('apikey')
  if (!apiKey || (acceptedApiKeys.size > 0 && !acceptedApiKeys.has(apiKey))) {
    return jsonResponse(request, { error: 'invalid_api_key' }, 401)
  }

  if (!database) {
    return jsonResponse(request, { error: 'server_error' }, 500)
  }

  const body = await readBody(request)
  if (!body || typeof body.action !== 'string') {
    return jsonResponse(request, { error: 'invalid_request' }, 400)
  }

  if (body.action === 'login') return handleLogin(request, body)
  if (body.action === 'results') return handleResults(request, body)
  if (body.action === 'logout') return handleLogout(request, body)

  return jsonResponse(request, { error: 'invalid_request' }, 400)
})
