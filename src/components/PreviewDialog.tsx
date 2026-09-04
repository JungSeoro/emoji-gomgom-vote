import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Candidate } from '../candidates'
import { GalaxyPreview } from './GalaxyPreview'

type PreviewDialogProps = {
  open: boolean
  candidate: Candidate | null
  selected: boolean
  atLimit: boolean
  onToggle: () => void
  onClose: () => void
}

export function PreviewDialog({ open, candidate, selected, atLimit, onToggle, onClose }: PreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="preview-dialog"
      aria-labelledby="preview-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
    >
      <div className="dialog-topline">
        <div>
          <span>REAL SIZE CHECK</span>
          <strong id="preview-dialog-title">{candidate ? `#${candidate.code} ${candidate.name}` : '메시지 미리보기'}</strong>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="미리보기 닫기">
          <X size={22} strokeWidth={3} />
        </button>
      </div>
      {open && <GalaxyPreview candidate={candidate} compact />}
      {open && candidate && atLimit && !selected && (
        <p className="preview-limit-note">최대 선택 수에 도달했어요. 다른 후보를 하나 취소한 뒤 선택해 주세요.</p>
      )}
      {open && candidate && (
        <button
          type="button"
          className={`dialog-vote-button ${selected ? 'is-selected' : ''}`}
          onClick={onToggle}
          disabled={atLimit && !selected}
        >
          {selected ? '✓ 선택했어요 · 취소하기' : atLimit ? '최대 선택 수에 도달했어요' : '이 이모티콘에 투표하기'}
        </button>
      )}
    </dialog>
  )
}
