import { getAvatarSymbol } from '../services/avatarService.js'

function formatDate(value) {
  if (!value) return 'sem registro'
  try { return new Date(value).toLocaleString('pt-BR') } catch { return value }
}

export default function AdminUserActivityCard({ summary, presence }) {
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
      <p>Última atividade: {formatDate(presence?.lastActivityAt)} · Privacidade: perfil privado local por padrão.</p>
      <div className="admin-chip-grid">
        <span>{summary.currentStage}</span><span>Nv. {summary.level}</span><span>{summary.xp} XP</span><span>{summary.sparks} centelhas</span><span>{summary.tokenBalance} D7T</span><span>{summary.score} score</span><span>{summary.completedPractices} práticas</span><span>{summary.ritualMinutesTotal} min</span><span>{summary.libraryCardsStudied} cards</span><span>{summary.unlockedSeals.length} selos</span><span>posts 0</span><span>comentários 0</span><span>reações 0</span><span>denúncias 0</span>
      </div>
    </article>
  )
}
