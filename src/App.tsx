import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  Eye,
  MessageCircleMore,
  MousePointerClick,
  Sparkles,
} from 'lucide-react'
import { CandidateCard } from './components/CandidateCard'
import { GalaxyPreview } from './components/GalaxyPreview'
import { PreviewDialog } from './components/PreviewDialog'
import { ReviewDialog } from './components/ReviewDialog'
import { candidateGroups, candidates, pollConfig } from './candidates'
import { isDemoMode, submitVote, type VoteResult } from './voteService'

type Draft = {
  nickname: string
  selectedIds: string[]
  feedback: string
}

const draftKey = 'emoji-gomgom-vote-draft'
const heroCandidate = candidates.find((candidate) => candidate.code === '11') ?? candidates[0] ?? null

const readDraft = (): Draft => {
  try {
    const draft = JSON.parse(window.localStorage.getItem(draftKey) ?? '{}') as Partial<Draft>
    const validIds = new Set(candidates.map((candidate) => candidate.id))
    const restoredIds = Array.isArray(draft.selectedIds)
      ? draft.selectedIds.filter((id): id is string => typeof id === 'string' && validIds.has(id))
      : []
    return {
      nickname: typeof draft.nickname === 'string' ? draft.nickname : '',
      selectedIds: [...new Set(restoredIds)].slice(0, pollConfig.maxSelections),
      feedback: typeof draft.feedback === 'string' ? draft.feedback.slice(0, pollConfig.feedbackMaxLength) : '',
    }
  } catch {
    return { nickname: '', selectedIds: [], feedback: '' }
  }
}

function App() {
  const initialDraft = useMemo(readDraft, [])
  const [nickname, setNickname] = useState(initialDraft.nickname)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialDraft.selectedIds))
  const [previewId, setPreviewId] = useState(candidates[0]?.id ?? '')
  const [feedback, setFeedback] = useState(initialDraft.feedback)
  const [notice, setNotice] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null)
  const nicknameRef = useRef<HTMLInputElement>(null)

  const previewCandidate = candidates.find((candidate) => candidate.id === previewId) ?? candidates[0] ?? null
  const selectedCandidates = candidates.filter((candidate) => selectedIds.has(candidate.id))
  const atLimit = selectedIds.size >= pollConfig.maxSelections

  useEffect(() => {
    if (voteResult) return
    const draft: Draft = { nickname, selectedIds: [...selectedIds], feedback }
    window.localStorage.setItem(draftKey, JSON.stringify(draft))
  }, [feedback, nickname, selectedIds, voteResult])

  useEffect(() => {
    if (!notice) return
    const timeoutId = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  const toggleCandidate = (candidateId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(candidateId)) {
        next.delete(candidateId)
        setNotice(`선택을 취소했어요. 현재 ${next.size}개예요.`)
        return next
      }

      if (next.size >= pollConfig.maxSelections) {
        setNotice(`최대 ${pollConfig.maxSelections}개까지만 선택할 수 있어요.`)
        return current
      }

      next.add(candidateId)
      setPreviewId(candidateId)
      setNotice(`선택했어요! ${next.size}/${pollConfig.maxSelections}`)
      return next
    })
  }

  const openCandidatePreview = (candidateId: string) => {
    setPreviewId(candidateId)
    if (window.matchMedia('(max-width: 1100px)').matches) {
      setPreviewOpen(true)
    }
  }

  const openReview = () => {
    const cleanedNickname = nickname.trim()

    if (!cleanedNickname) {
      setNicknameError('투표 결과를 구분할 닉네임을 입력해 주세요.')
      nicknameRef.current?.focus()
      nicknameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    if (cleanedNickname.length > 20) {
      setNicknameError('닉네임은 20자 이하로 입력해 주세요.')
      nicknameRef.current?.focus()
      return
    }

    if (selectedIds.size === 0) {
      setNotice('마음에 드는 이모티콘을 1개 이상 선택해 주세요.')
      return
    }

    if (selectedIds.size > pollConfig.maxSelections) {
      setNotice(`최대 ${pollConfig.maxSelections}개까지만 선택할 수 있어요.`)
      return
    }

    setNickname(cleanedNickname)
    setNicknameError('')
    setSubmitError('')
    setReviewOpen(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')

    try {
      const result = await submitVote({
        nickname: nickname.trim(),
        candidateIds: selectedCandidates.map((candidate) => candidate.id),
        feedback: feedback.trim(),
      })
      setVoteResult(result)
      setReviewOpen(false)
      window.localStorage.removeItem(draftKey)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '투표를 제출하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const restartVote = () => {
    setNickname('')
    setSelectedIds(new Set())
    setFeedback('')
    setVoteResult(null)
    setSubmitError('')
    setNicknameError('')
  }

  if (voteResult) {
    return (
      <div className="site-shell success-shell">
        <SuccessScreen
          nickname={nickname}
          selectedCandidates={selectedCandidates}
          demo={voteResult.mode === 'demo'}
          onRestart={restartVote}
        />
      </div>
    )
  }

  return (
    <div className="site-shell">
      <header className="hero">
        <div className="hero-nav">
          <span className="hero-wordmark"><span aria-hidden="true">G</span> GOMGOM VOTE</span>
          <span className="hero-candidate-count">{candidates.length} CANDIDATES</span>
        </div>
        <div className="hero-inner">
          <div className="hero-badge"><Sparkles size={16} strokeWidth={3} /> GOMGOM CREW PICK</div>
          <h1>
            곰곰이 보고,<br />
            <span>그냥 골라줘</span>
          </h1>
          <p>실제 갤럭시 메시지 화면에서 확인하고<br className="mobile-break" /> 서비스하고 싶은 이모티콘에 투표해 주세요.</p>
          <div className="hero-rules">
            <span><MousePointerClick size={18} /> 최대 {pollConfig.maxSelections}개 PICK</span>
            <span><MessageCircleMore size={18} /> 폰 화면 미리보기</span>
          </div>
          <div className="hero-mascot" aria-hidden="true">
            {heroCandidate && <img src={heroCandidate.image} alt="" />}
          </div>
        </div>
      </header>

      <main className="main-content">
        {isDemoMode && (
          <div className="demo-banner">
            <strong>DEMO MODE</strong>
            <span>Supabase 환경변수를 연결하기 전이라 제출 결과가 이 기기에만 저장됩니다.</span>
          </div>
        )}

        <section className="nickname-section" aria-labelledby="nickname-title">
          <div className="step-number">01</div>
          <div className="section-copy">
            <span className="eyebrow">WHO ARE YOU?</span>
            <h2 id="nickname-title">닉네임을 알려주세요</h2>
            <p>로그인 없이 결과를 구분하는 용도로만 사용해요.</p>
          </div>
          <div className="nickname-field">
            <label htmlFor="nickname">닉네임</label>
            <input
              ref={nicknameRef}
              id="nickname"
              type="text"
              value={nickname}
              maxLength={20}
              autoComplete="nickname"
              placeholder="예: 디자인팀 곰대리"
              aria-describedby={nicknameError ? 'nickname-error' : undefined}
              aria-invalid={Boolean(nicknameError)}
              onChange={(event) => {
                setNickname(event.target.value)
                if (nicknameError) setNicknameError('')
              }}
            />
            <span className="input-count">{nickname.length}/20</span>
            {nicknameError && <span id="nickname-error" className="field-error">{nicknameError}</span>}
          </div>
        </section>

        <section className="vote-section" aria-labelledby="vote-title">
          <div className="vote-heading">
            <div>
              <span className="eyebrow">MAKE YOUR PICK</span>
              <h2 id="vote-title"><span className="step-inline">02</span> 마음에 드는 후보를 골라주세요</h2>
              <p>한 세트로 표시된 후보는 함께 선택하길 권장하지만, 마음에 드는 이모티콘만 골라도 괜찮아요.</p>
            </div>
            <div className="limit-sticker">
              <span>MAX</span>
              <strong>{pollConfig.maxSelections}</strong>
              <small>PICKS</small>
            </div>
          </div>

          <div className="vote-workspace">
            <div className="candidate-list">
              {candidateGroups.map((group) => (
                <fieldset className={`candidate-group ${group.isSet ? 'is-set' : 'is-single'}`} key={group.id}>
                  <legend>
                    <span>{group.title}</span>
                    {group.isSet && <em>한 세트</em>}
                  </legend>
                  <div className="candidate-grid">
                    {group.candidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        selected={selectedIds.has(candidate.id)}
                        atLimit={atLimit && !selectedIds.has(candidate.id)}
                        onToggle={() => toggleCandidate(candidate.id)}
                        onPreview={() => openCandidatePreview(candidate.id)}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <aside className="desktop-preview">
              <div className="desktop-preview-heading">
                <span>LIVE PREVIEW</span>
                <strong>갤럭시에서 이렇게 보여요</strong>
                <p>후보의 ‘폰에서 보기’를 눌러 바꿔보세요.</p>
              </div>
              <GalaxyPreview candidate={previewCandidate} />
            </aside>
          </div>
        </section>
      </main>

      <div className="selection-dock">
        <div className="selection-dock-inner">
          <div className="selection-count">
            <span>MY PICKS</span>
            <strong>{selectedIds.size}<em>/{pollConfig.maxSelections}</em></strong>
          </div>
          <div className="selected-thumbnails" aria-label="현재 선택한 이모티콘">
            {selectedCandidates.length > 0 ? selectedCandidates.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                onClick={() => openCandidatePreview(candidate.id)}
                aria-label={`${candidate.name} 미리보기`}
              >
                <img src={candidate.image} alt="" loading="lazy" decoding="async" />
                <span>#{candidate.code}</span>
              </button>
            )) : <span className="empty-picks">아직 선택한 후보가 없어요</span>}
          </div>
          <button type="button" className="mobile-preview-trigger" onClick={() => setPreviewOpen(true)} disabled={!previewCandidate}>
            <Eye size={19} strokeWidth={2.8} />
            미리보기
          </button>
          <button type="button" className="review-trigger" onClick={openReview}>
            투표 검토
            <ArrowRight size={19} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className={`toast ${notice ? 'is-visible' : ''}`} role="status" aria-live="polite">
        {notice}
      </div>

      <PreviewDialog
        open={previewOpen}
        candidate={previewCandidate}
        selected={Boolean(previewCandidate && selectedIds.has(previewCandidate.id))}
        atLimit={atLimit}
        onToggle={() => previewCandidate && toggleCandidate(previewCandidate.id)}
        onClose={() => setPreviewOpen(false)}
      />

      <ReviewDialog
        open={reviewOpen}
        nickname={nickname}
        selectedCandidates={selectedCandidates}
        feedback={feedback}
        feedbackMaxLength={pollConfig.feedbackMaxLength}
        submitting={submitting}
        submitError={submitError}
        onFeedbackChange={setFeedback}
        onRemove={toggleCandidate}
        onSubmit={handleSubmit}
        onClose={() => !submitting && setReviewOpen(false)}
      />
    </div>
  )
}

type SuccessScreenProps = {
  nickname: string
  selectedCandidates: typeof candidates
  demo: boolean
  onRestart: () => void
}

function SuccessScreen({ nickname, selectedCandidates, demo, onRestart }: SuccessScreenProps) {
  return (
    <main className="success-page">
      <div className="success-burst burst-one" aria-hidden="true">★</div>
      <div className="success-burst burst-two" aria-hidden="true">WOW</div>
      <div className="success-card">
        <div className="success-check"><Check size={40} strokeWidth={4} /></div>
        <span className="eyebrow">VOTE COMPLETE</span>
        <h1>{nickname}님,<br /><span>선택 완료!</span></h1>
        <p>{selectedCandidates.length}개의 곰곰이에게 소중한 한 표가 전달됐어요.</p>
        <div className="success-picks">
          {selectedCandidates.map((candidate) => (
            <div key={candidate.id}>
              <img src={candidate.image} alt={candidate.description} loading="lazy" decoding="async" />
              <span>#{candidate.code}</span>
            </div>
          ))}
        </div>
        {demo && <div className="demo-result">현재 데모 모드라 이 브라우저에만 저장됐어요.</div>}
        <button type="button" onClick={onRestart}>새 투표 작성하기</button>
      </div>
    </main>
  )
}

export default App
