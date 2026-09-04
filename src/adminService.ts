import { pollConfig } from './candidates'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const resultsEndpoint = supabaseUrl ? `${supabaseUrl}/functions/v1/vote-results` : ''
const sessionStorageKey = 'emoji-gomgom-results-session'
const pendingLogoutStorageKey = 'emoji-gomgom-results-pending-logout'
const sessionIdleMilliseconds = 30 * 60 * 1000
const requestTimeoutMilliseconds = 15 * 1000

export const isAdminConfigured = Boolean(resultsEndpoint && supabasePublishableKey)

export type SelectedCandidateResult = {
  candidateId: string
  code: string
  name: string
  setKey: string | null
  displayOrder: number
}

export type CandidateVoteResult = SelectedCandidateResult & {
  voteCount: number
}

export type VoteSubmission = {
  id: string
  nickname: string
  feedback: string | null
  createdAt: string
  selectedCandidates: SelectedCandidateResult[]
}

export type VoteResultsData = {
  campaignId: string
  nicknameFilter: string
  page: number
  pageSize: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  totalSubmissionCount: number
  filteredSubmissionCount: number
  feedbackCount: number
  candidateVotes: CandidateVoteResult[]
  submissions: VoteSubmission[]
}

type ResultsAccessSession = {
  token: string
  expiresAt: string
  lastValidatedAt: number
}

export class AdminAccessError extends Error {
  constructor(message = '접근 시간이 만료되었습니다. 비밀번호를 다시 입력해 주세요.') {
    super(message)
    this.name = 'AdminAccessError'
  }
}

export class AdminRateLimitError extends Error {
  constructor() {
    super('로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.')
    this.name = 'AdminRateLimitError'
  }
}

type UnknownRecord = Record<string, unknown>

let volatileSession: ResultsAccessSession | null = null
let volatilePendingLogout: ResultsAccessSession | null = null

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const readRecord = (value: unknown, fieldName: string): UnknownRecord => {
  if (!isRecord(value)) {
    throw new Error(`투표 결과의 ${fieldName} 형식이 올바르지 않아요.`)
  }

  return value
}

const readString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`투표 결과의 ${fieldName} 형식이 올바르지 않아요.`)
  }

  return value
}

const readNullableString = (value: unknown, fieldName: string): string | null => {
  if (value === null) return null
  return readString(value, fieldName)
}

const readCount = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`투표 결과의 ${fieldName} 형식이 올바르지 않아요.`)
  }

  return value
}

const readBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`투표 결과의 ${fieldName} 형식이 올바르지 않아요.`)
  }

  return value
}

const readArray = (value: unknown, fieldName: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`투표 결과의 ${fieldName} 형식이 올바르지 않아요.`)
  }

  return value
}

const parseSelectedCandidate = (value: unknown, index: number): SelectedCandidateResult => {
  const candidate = readRecord(value, `selected_candidates[${index}]`)

  return {
    candidateId: readString(candidate.candidate_id, `selected_candidates[${index}].candidate_id`),
    code: readString(candidate.code, `selected_candidates[${index}].code`),
    name: readString(candidate.name, `selected_candidates[${index}].name`),
    setKey: readNullableString(candidate.set_key, `selected_candidates[${index}].set_key`),
    displayOrder: readCount(candidate.display_order, `selected_candidates[${index}].display_order`),
  }
}

const parseCandidateVote = (value: unknown, index: number): CandidateVoteResult => {
  const candidate = readRecord(value, `candidate_votes[${index}]`)

  return {
    candidateId: readString(candidate.candidate_id, `candidate_votes[${index}].candidate_id`),
    code: readString(candidate.code, `candidate_votes[${index}].code`),
    name: readString(candidate.name, `candidate_votes[${index}].name`),
    setKey: readNullableString(candidate.set_key, `candidate_votes[${index}].set_key`),
    displayOrder: readCount(candidate.display_order, `candidate_votes[${index}].display_order`),
    voteCount: readCount(candidate.vote_count, `candidate_votes[${index}].vote_count`),
  }
}

const parseVoteSubmission = (value: unknown, index: number): VoteSubmission => {
  const submission = readRecord(value, `submissions[${index}]`)
  const selectedCandidates = readArray(
    submission.selected_candidates,
    `submissions[${index}].selected_candidates`,
  )

  return {
    id: readString(submission.id, `submissions[${index}].id`),
    nickname: readString(submission.nickname, `submissions[${index}].nickname`),
    feedback: readNullableString(submission.feedback, `submissions[${index}].feedback`),
    createdAt: readString(submission.created_at, `submissions[${index}].created_at`),
    selectedCandidates: selectedCandidates.map(parseSelectedCandidate),
  }
}

const parseVoteResults = (value: unknown): VoteResultsData => {
  const results = readRecord(value, '응답')
  const candidateVotes = readArray(results.candidate_votes, 'candidate_votes')
  const submissions = readArray(results.submissions, 'submissions')

  return {
    campaignId: readString(results.campaign_id, 'campaign_id'),
    nicknameFilter: readString(results.nickname_filter, 'nickname_filter'),
    page: readCount(results.page, 'page'),
    pageSize: readCount(results.page_size, 'page_size'),
    hasPreviousPage: readBoolean(results.has_previous_page, 'has_previous_page'),
    hasNextPage: readBoolean(results.has_next_page, 'has_next_page'),
    totalSubmissionCount: readCount(results.total_submission_count, 'total_submission_count'),
    filteredSubmissionCount: readCount(results.filtered_submission_count, 'filtered_submission_count'),
    feedbackCount: readCount(results.feedback_count, 'feedback_count'),
    candidateVotes: candidateVotes.map(parseCandidateVote),
    submissions: submissions.map(parseVoteSubmission),
  }
}

const getSessionStorage = (): Storage | null => {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

const clearStoredSession = () => {
  volatileSession = null

  try {
    getSessionStorage()?.removeItem(sessionStorageKey)
  } catch {
    return
  }
}

const saveSession = (session: ResultsAccessSession) => {
  volatileSession = session

  try {
    getSessionStorage()?.setItem(sessionStorageKey, JSON.stringify(session))
  } catch {
    return
  }
}

const validateSession = (value: unknown): ResultsAccessSession | null => {
  if (!isRecord(value)) return null

  const token = value.token
  const expiresAt = value.expiresAt
  const lastValidatedAt = value.lastValidatedAt
  const absoluteExpiry = typeof expiresAt === 'string' ? Date.parse(expiresAt) : Number.NaN

  if (
    typeof token !== 'string'
    || !/^[0-9a-f]{64}$/.test(token)
    || typeof expiresAt !== 'string'
    || !Number.isFinite(absoluteExpiry)
    || typeof lastValidatedAt !== 'number'
    || !Number.isFinite(lastValidatedAt)
    || absoluteExpiry <= Date.now()
    || lastValidatedAt + sessionIdleMilliseconds <= Date.now()
  ) {
    return null
  }

  return { token, expiresAt, lastValidatedAt }
}

const clearPendingLogout = () => {
  volatilePendingLogout = null

  try {
    getSessionStorage()?.removeItem(pendingLogoutStorageKey)
  } catch {
    return
  }
}

const savePendingLogout = (session: ResultsAccessSession) => {
  volatilePendingLogout = session

  try {
    getSessionStorage()?.setItem(pendingLogoutStorageKey, JSON.stringify(session))
  } catch {
    return
  }
}

const readPendingLogout = (): ResultsAccessSession | null => {
  const validVolatileSession = validateSession(volatilePendingLogout)
  if (validVolatileSession) return validVolatileSession
  if (volatilePendingLogout) clearPendingLogout()

  try {
    const rawSession = getSessionStorage()?.getItem(pendingLogoutStorageKey)
    if (!rawSession) return null

    const validSession = validateSession(JSON.parse(rawSession) as unknown)
    if (!validSession) {
      clearPendingLogout()
      return null
    }

    volatilePendingLogout = validSession
    return validSession
  } catch {
    clearPendingLogout()
    return null
  }
}

const readStoredSession = (): ResultsAccessSession | null => {
  const validVolatileSession = validateSession(volatileSession)
  if (validVolatileSession) return validVolatileSession
  if (volatileSession) clearStoredSession()

  try {
    const rawSession = getSessionStorage()?.getItem(sessionStorageKey)
    if (!rawSession) return null

    const parsedSession = JSON.parse(rawSession) as unknown
    const validSession = validateSession(parsedSession)
    if (!validSession) {
      clearStoredSession()
      return null
    }

    volatileSession = validSession
    return volatileSession
  } catch {
    clearStoredSession()
    return null
  }
}

const readActiveSessionToken = (): string | null => {
  if (volatileSession && /^[0-9a-f]{64}$/.test(volatileSession.token)) {
    return volatileSession.token
  }

  try {
    const rawSession = getSessionStorage()?.getItem(sessionStorageKey)
    if (!rawSession) return null
    const parsedSession = JSON.parse(rawSession) as unknown
    return isRecord(parsedSession) && typeof parsedSession.token === 'string'
      ? parsedSession.token
      : null
  } catch {
    return null
  }
}

const callResultsApi = async (body: UnknownRecord): Promise<unknown> => {
  if (!isAdminConfigured) {
    throw new Error('Supabase 환경변수가 설정되지 않아 관리자 기능을 사용할 수 없어요.')
  }

  let response: Response
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMilliseconds)

  try {
    response = await fetch(resultsEndpoint, {
      method: 'POST',
      headers: {
        apikey: supabasePublishableKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch {
    throw new Error('관리자 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  } finally {
    window.clearTimeout(timeoutId)
  }

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    if (response.ok) {
      throw new Error('관리자 서버의 응답 형식이 올바르지 않아요.')
    }
  }

  const errorPayload = isRecord(payload) ? payload : null
  const errorCode = typeof errorPayload?.error === 'string' ? errorPayload.error : ''

  if (errorCode === 'invalid_session') {
    throw new AdminAccessError()
  }

  if (response.status === 429 || errorCode === 'rate_limited') {
    throw new AdminRateLimitError()
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('관리자 서버의 API 키와 Edge Function 인증 설정을 확인해 주세요.')
    }

    if (errorCode === 'invalid_password') {
      throw new Error('비밀번호가 올바르지 않습니다.')
    }

    if (errorCode === 'not_configured') {
      throw new Error('관리자 비밀번호가 설정되지 않았습니다.')
    }

    throw new Error('관리자 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }

  return payload
}

export const hasAdminSession = (): boolean => Boolean(readStoredSession())

export const getAdminSessionDeadline = (): number | null => {
  const session = readStoredSession()
  if (!session) return null

  return Math.min(
    Date.parse(session.expiresAt),
    session.lastValidatedAt + sessionIdleMilliseconds,
  )
}

export const retryPendingAdminLogout = async (): Promise<void> => {
  const pendingSession = readPendingLogout()
  if (!pendingSession) return

  try {
    await callResultsApi({ action: 'logout', sessionToken: pendingSession.token })
    clearPendingLogout()
  } catch (error) {
    if (error instanceof AdminAccessError) {
      clearPendingLogout()
      return
    }

    throw error
  }
}

export const signInAdmin = async (password: string): Promise<void> => {
  if (!password) {
    throw new Error('비밀번호를 입력해 주세요.')
  }

  if (new TextEncoder().encode(password).byteLength > 72) {
    throw new Error('비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.')
  }

  await retryPendingAdminLogout()

  const response = readRecord(
    await callResultsApi({ action: 'login', password }),
    '로그인 응답',
  )
  const sessionToken = readString(response.sessionToken, 'sessionToken')
  const expiresAt = readString(response.expiresAt, 'expiresAt')

  if (!/^[0-9a-f]{64}$/.test(sessionToken) || !Number.isFinite(Date.parse(expiresAt))) {
    throw new Error('관리자 로그인 응답이 올바르지 않아요.')
  }

  saveSession({ token: sessionToken, expiresAt, lastValidatedAt: Date.now() })
}

export const signOutAdmin = async (): Promise<void> => {
  const session = readStoredSession()
  clearStoredSession()

  if (!session) return
  savePendingLogout(session)
  await retryPendingAdminLogout()
}

export const clearAdminSession = (): void => {
  clearStoredSession()
}

export const fetchVoteResults = async (
  nicknameFilter = '',
  page = 1,
): Promise<VoteResultsData> => {
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new Error('페이지는 1 이상의 정수여야 해요.')
  }

  const session = readStoredSession()
  if (!session) throw new AdminAccessError()

  const cleanedFilter = nicknameFilter.trim()
  const response = readRecord(
    await callResultsApi({
      action: 'results',
      sessionToken: session.token,
      campaignId: pollConfig.id,
      nicknameFilter: cleanedFilter,
      page,
    }),
    '결과 응답',
  )

  const results = parseVoteResults(response.data)
  const now = Date.now()

  if (Date.parse(session.expiresAt) <= now) {
    if (readActiveSessionToken() === session.token) clearStoredSession()
    throw new AdminAccessError()
  }

  if (readActiveSessionToken() === session.token) {
    saveSession({ ...session, lastValidatedAt: now })
  }

  return results
}
