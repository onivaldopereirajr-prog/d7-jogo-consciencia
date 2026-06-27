import { getAvatarSymbol } from '../services/avatarService.js'
import { getStoredLanguage } from '../services/languageService.js'

function formatDate(value) {
  if (!value) return 'sem registro'
  try { return new Date(value).toLocaleString('pt-BR') } catch { return value }
}

function countEvents(events = [], type) {
  return events.filter((event) => event.eventType === type).length
}

function statusLabel(status) {
  return { online: 'online local', away: 'ausente', offline: 'offline local' }[status] ?? 'offline local'
}

export default function AdminUserActivityCard({ summary, presence, localEvents = [], wheelEvents = [] }) {
  const avatar = getAvatarSymbol(summary.avatarSymbol)
  return (
    <article className="admin-user-card control-user-card">
      <div className="admin-user-head">
        <span className="d7-avatar sm" style={{ '--avatar-color': summary.avatarColor ?? '#20d3ee' }} aria-hidden="true"><strong>{avatar.glyph}</strong></span>
        <div>
          <strong>{summary.user.name}</strong>
          <small>{summary.user.login} · {summary.avatarTitle}</small>
        </div>
      </div>
      <p>Criado: {formatDate(summary.user.createdAt)} · Último login: {formatDate(summary.user.lastLoginAt)}</p>
      <p>Última atividade: {formatDate(presence?.lastActivityAt ?? summary.updatedAt)} · Status: {statusLabel(presence?.status)} · Privacidade: perfil privado local por padrão.</p>
      <div className="admin-chip-grid">
        <span>{summary.currentStage}</span>
        <span>Nv. {summary.level}</span>
        <span>{summary.xp} XP</span>
        <span>{summary.sparks} centelhas</span>
        <span>{summary.tokenBalance} D7T</span>
        <span>{summary.score} score</span>
        <span>{summary.completedPractices} práticas</span>
        <span>{summary.ritualMinutesTotal} min</span>
        <span>{summary.libraryCardsStudied} cards</span>
        <span>{summary.unlockedSeals.length} selos</span>
        <span>posts {countEvents(localEvents, 'social_post_created')}</span>
        <span>comentários {countEvents(localEvents, 'social_comment_created')}</span>
        <span>reações {countEvents(localEvents, 'social_reaction_created')}</span>
        <span>giros {wheelEvents.length}</span>
        <span>idioma {getStoredLanguage()}</span>
      </div>
    </article>
  )
}
