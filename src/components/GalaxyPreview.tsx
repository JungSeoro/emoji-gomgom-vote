import {
  ArrowLeft,
  BatteryMedium,
  Image as ImageIcon,
  MoreVertical,
  Phone,
  Plus,
  Send,
  Signal,
  Smile,
  Video,
  Wifi,
} from 'lucide-react'
import type { Candidate } from '../candidates'

type GalaxyPreviewProps = {
  candidate: Candidate | null
  compact?: boolean
}

export function GalaxyPreview({ candidate, compact = false }: GalaxyPreviewProps) {
  return (
    <div
      className={`galaxy-preview ${compact ? 'is-compact' : ''}`}
      role="img"
      aria-label={candidate ? `${candidate.name}을 사용한 갤럭시 메시지 화면 예시` : '갤럭시 메시지 화면 예시'}
    >
      <div className="galaxy-device" aria-hidden="true">
        <div className="galaxy-screen">
          <div className="camera-hole" aria-hidden="true" />
          <div className="status-bar" aria-hidden="true">
            <span>12:24</span>
            <span className="status-icons">
              <Signal size={13} strokeWidth={2.8} />
              <Wifi size={14} strokeWidth={2.8} />
              <BatteryMedium size={17} strokeWidth={2.8} />
            </span>
          </div>

          <div className="message-header">
            <ArrowLeft size={22} strokeWidth={2.7} aria-hidden="true" />
            <div className="contact-avatar" aria-hidden="true">곰</div>
            <div className="contact-copy">
              <strong>곰곰 크루</strong>
              <span>메시지 화면 예시</span>
            </div>
            <Phone size={19} strokeWidth={2.4} aria-hidden="true" />
            <Video size={20} strokeWidth={2.4} aria-hidden="true" />
            <MoreVertical size={20} strokeWidth={2.4} aria-hidden="true" />
          </div>

          <div className="message-thread">
            <div className="date-chip">오늘</div>
            <div className="incoming-row">
              <div className="mini-avatar" aria-hidden="true">곰</div>
              <div>
                <span className="sender-name">곰곰 크루</span>
                <div className="incoming-bubble">새 이모티콘 후보 봤어?</div>
              </div>
            </div>
            <div className="outgoing-row">
              <span className="message-time">오후 12:23</span>
              <div className="outgoing-bubble">지금 보고 있어!</div>
            </div>
            <div className="incoming-row second-message">
              <div className="mini-avatar ghost-avatar" aria-hidden="true" />
              <div className="incoming-bubble">메신저에서는 이렇게 보여요 👀</div>
            </div>
            <div className="emoji-message-row">
              <span className="message-time">오후 12:24</span>
              <div className="emoji-message">
                {candidate ? (
                  <img src={candidate.image} alt={`${candidate.name} 메신저 사용 예시`} decoding="async" />
                ) : (
                  <div className="empty-emoji">
                    <Smile size={34} strokeWidth={2.6} />
                    <span>후보를 미리보기 해주세요</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="message-composer" aria-hidden="true">
            <Plus size={21} strokeWidth={2.5} />
            <div className="composer-input">
              <span>메시지 입력</span>
              <Smile size={19} strokeWidth={2.3} />
              <ImageIcon size={19} strokeWidth={2.3} />
            </div>
            <div className="send-button">
              <Send size={17} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>
      <div className="preview-caption">
        <span className="live-dot" />
        GALAXY PREVIEW
        {candidate && <strong>#{candidate.code}</strong>}
      </div>
    </div>
  )
}
