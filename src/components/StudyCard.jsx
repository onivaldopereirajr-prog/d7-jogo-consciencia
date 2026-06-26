function rewardLabel(reward) {
  if (!reward) return null
  const parts = []
  if (reward.xp) parts.push(`+${reward.xp} XP`)
  if (reward.sparks) parts.push(`+${reward.sparks} Centelhas`)
  if (reward.d7t) parts.push(`+${reward.d7t} D7T`)
  if (reward.rankingPoints) parts.push(`+${reward.rankingPoints} ranking`)
  return parts.join(' · ')
}

export default function StudyCard({
  title,
  subtitle,
  summary,
  badge,
  symbol,
  status = 'available',
  meta,
  reward,
  challenge,
  note,
  actionLabel,
  onAction,
  disabled = false,
  footer,
  children,
}) {
  return (
    <article className={`study-card ${status}`}>
      <div className="study-card__head">
        <div>
          {badge && <span className="study-card__badge">{badge}</span>}
          <h4>{title}</h4>
          {subtitle && <p className="study-card__subtitle">{subtitle}</p>}
        </div>
        {symbol && <div className="study-card__symbol" aria-hidden="true">{symbol}</div>}
      </div>
      {meta && <small className="study-card__meta">{meta}</small>}
      <p className="study-card__summary">{summary}</p>
      {challenge && <p className="study-card__challenge"><strong>Desafio:</strong> {challenge}</p>}
      {reward && <p className="study-card__reward">{rewardLabel(reward)}</p>}
      {note && <small className="study-card__note">{note}</small>}
      {children}
      <div className="study-card__footer">
        {footer}
        {onAction && (
          <button type="button" className="mini-action" onClick={onAction} disabled={disabled}>
            {actionLabel ?? 'Estudar agora'}
          </button>
        )}
      </div>
    </article>
  )
}
