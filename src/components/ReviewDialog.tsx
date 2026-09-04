import { useEffect, useRef } from 'react'
import { Check, Send, X } from 'lucide-react'
import type { Candidate } from '../candidates'

type ReviewDialogProps = {
  open: boolean
  nickname: string
  selectedCandidates: Candidate[]
  feedback: string
  feedbackMaxLength: number
  requiredSelections: number
  submitting: boolean
  submitError: string
  onFeedbackChange: (value: string) => void
  onRemove: (id: string) => void
  onSubmit: () => void
  onClose: () => void
}

export function ReviewDialog({
  open,
  nickname,
  selectedCandidates,
  feedback,
  feedbackMaxLength,
  requiredSelections,
  submitting,
  submitError,
  onFeedbackChange,
  onRemove,
  onSubmit,
  onClose,
}: ReviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const hasRequiredSelections = selectedCandidates.length === requiredSelections

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="review-dialog"
      aria-labelledby="review-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!submitting) onClose()
      }}
      onClose={onClose}
    >
      <div className="review-header">
        <span className="review-kicker">FINAL CHECK!</span>
        <h2 id="review-dialog-title">{nickname}님의 선택</h2>
        <p>마지막으로 한 번만 확인해 주세요.</p>
        <button type="button" className="icon-button" onClick={onClose} aria-label="검토 화면 닫기" disabled={submitting}>
          <X size={23} strokeWidth={3} />
        </button>
      </div>

      <div className="review-body">
        <div className="review-selection-title">
          <strong>선택한 이모티콘 · 정확히 {requiredSelections}개 필수</strong>
          <span>{selectedCandidates.length}/{requiredSelections}개</span>
        </div>
        <div className="review-grid">
          {selectedCandidates.map((candidate) => (
            <div className="review-item" key={candidate.id}>
              <span>#{candidate.code}</span>
              <img src={candidate.image} alt="" loading="lazy" decoding="async" />
              <strong>{candidate.name}</strong>
              <button type="button" onClick={() => onRemove(candidate.id)} disabled={submitting}>
                선택 취소
              </button>
            </div>
          ))}
        </div>

        <div className="feedback-field">
          <label htmlFor="feedback">선택은 했지만 수정되면 좋을 점이 있나요?</label>
          <p>수정이 필요한 이모티콘 번호와 의견을 자유롭게 적어주세요.</p>
          <textarea
            id="feedback"
            value={feedback}
            maxLength={feedbackMaxLength}
            placeholder="예: 02번은 표정을 조금 더 크게 해주세요."
            onChange={(event) => onFeedbackChange(event.target.value)}
            disabled={submitting}
          />
          <span>{feedback.length}/{feedbackMaxLength}</span>
        </div>

        {submitError && <div className="submit-error" role="alert">{submitError}</div>}

        <div className="review-actions">
          <button type="button" className="back-button" onClick={onClose} disabled={submitting}>
            다시 고르기
          </button>
          <button type="button" className="submit-button" onClick={onSubmit} disabled={submitting || !hasRequiredSelections}>
            {submitting ? (
              <span className="loading-dots">제출 중<span>•••</span></span>
            ) : (
              <>
                <Check size={19} strokeWidth={3.2} aria-hidden="true" />
                이대로 투표하기
                <Send size={17} strokeWidth={2.8} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
    </dialog>
  )
}
