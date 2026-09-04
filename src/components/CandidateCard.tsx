import { Check, Eye } from 'lucide-react'
import type { Candidate } from '../candidates'

type CandidateCardProps = {
  candidate: Candidate
  selected: boolean
  atLimit: boolean
  onToggle: () => void
  onPreview: () => void
}

export function CandidateCard({
  candidate,
  selected,
  atLimit,
  onToggle,
  onPreview,
}: CandidateCardProps) {
  return (
    <article className={`candidate-card ${selected ? 'is-selected' : ''}`}>
      <button
        type="button"
        className="candidate-select"
        aria-pressed={selected}
        aria-label={`${candidate.name} ${selected ? '선택 해제' : '선택'}`}
        onClick={onToggle}
      >
        <span className="candidate-code">NO.{candidate.code}</span>
        <span className="candidate-check" aria-hidden="true">
          {selected ? <Check size={20} strokeWidth={3.5} /> : <span />}
        </span>
        <span className="candidate-image-wrap">
          <img
            src={candidate.image}
            alt={candidate.description}
            loading="lazy"
            decoding="async"
          />
        </span>
        <span className="candidate-copy">
          <strong>{candidate.name}</strong>
          <small>{selected ? '선택했어요!' : atLimit ? '선택 한도 도달' : '눌러서 투표하기'}</small>
        </span>
      </button>
      <button type="button" className="preview-button" onClick={onPreview}>
        <Eye size={17} strokeWidth={2.8} aria-hidden="true" />
        폰에서 보기
      </button>
    </article>
  )
}
