import { createClient } from '@supabase/supabase-js'
import { pollConfig } from './candidates'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isDemoMode = !supabaseUrl || !supabasePublishableKey

const supabase = isDemoMode
  ? null
  : createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false },
    })

export type VotePayload = {
  nickname: string
  candidateIds: string[]
  feedback: string
}

export type VoteResult = {
  id: string
  mode: 'supabase' | 'demo'
}

const saveDemoVote = (payload: VotePayload, id: string) => {
  const storageKey = 'emoji-gomgom-demo-votes'
  let votes: Array<VotePayload & { id: string; createdAt: string }> = []

  try {
    votes = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]')
  } catch {
    votes = []
  }

  votes.push({ ...payload, id, createdAt: new Date().toISOString() })
  window.localStorage.setItem(storageKey, JSON.stringify(votes))
}

export const submitVote = async (payload: VotePayload): Promise<VoteResult> => {
  const submissionId = crypto.randomUUID()

  if (!supabase) {
    saveDemoVote(payload, submissionId)
    return { id: submissionId, mode: 'demo' }
  }

  const { data, error } = await supabase.rpc('submit_vote', {
    p_campaign_id: pollConfig.id,
    p_nickname: payload.nickname,
    p_candidate_ids: payload.candidateIds,
    p_feedback: payload.feedback || null,
    p_submission_id: submissionId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return { id: String(data ?? submissionId), mode: 'supabase' }
}
