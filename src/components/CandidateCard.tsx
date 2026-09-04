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
      <div className="candidate-content">
        <span className="candidate-code">NO.{candidate.code}</span>
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
          <small>{selected ? '투표 목록에 담겼어요.' : atLimit ? '선택 한도 도달' : '미리보기 후 선택해 주세요.'}</small>
        </span>
      </div>
      <div className="candidate-actions">
        <button type="button" className="preview-button" onClick={onPreview}>
          <Eye size={17} strokeWidth={2.8} aria-hidden="true" />
          폰에서 보기
        </button>
        <button
          type="button"
          className={`vote-button ${selected ? 'is-selected' : ''}`}
          aria-pressed={selected}
          aria-label={`${candidate.name} ${selected ? '투표 취소' : atLimit ? '선택 한도 도달' : '투표하기'}`}
          onClick={onToggle}
          disabled={atLimit && !selected}
        >
          {selected && <Check size={17} strokeWidth={3} aria-hidden="true" />}
          {selected ? '선택 취소' : atLimit ? '선택 한도' : '투표하기'}
        </button>
      </div>
    </article>
  )
}
