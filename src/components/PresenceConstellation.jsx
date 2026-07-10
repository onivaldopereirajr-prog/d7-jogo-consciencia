import { getContemplativeStats } from '../services/contemplativeSessions.js'

function starFromSession(session, index) {
  let hash = 2166136261
  for (const char of session.sessionId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  const size = 3 + (index % 3)
  return { ...session, style: { left: `${8 + (Math.abs(hash) % 84)}%`, top: `${10 + ((hash >>> 8) % 76)}%`, width: `${size}px`, height: `${size}px` } }
}

export default function PresenceConstellation({ state, t, compact = false }) {
  const stats = getContemplativeStats(state)
  const visible = stats.sessions.slice(0, 36).map(starFromSession)
  const description = t('contemplative.constellation.description').replace('{total}', stats.total).replace('{breathing}', stats.breathing).replace('{meditation}', stats.meditation).replace('{minutes}', stats.minutes)
  return (
    <section className={`presence-constellation${compact ? ' presence-constellation--compact' : ''}`} aria-label={description}>
      <div className="presence-constellation__head"><div><span className="overline">{t('contemplative.constellation.eyebrow')}</span><h3>{t('contemplative.constellation.title')}</h3></div><strong>{stats.total}</strong></div>
      <div className="presence-sky" aria-hidden="true">
        {visible.map((session) => <i key={session.sessionId} className={`presence-star presence-star--${session.practiceType}`} style={session.style} />)}
      </div>
      <div className="presence-stats"><span>{stats.breathing} {t('contemplative.constellation.breathing')}</span><span>{stats.meditation} {t('contemplative.constellation.meditation')}</span><span>{stats.minutes} {t('contemplative.constellation.minutes')}</span><span>{state.sparks} {t('topbar.sparks')}</span></div>
      <small>{stats.total ? description : t('contemplative.constellation.empty')}</small>
    </section>
  )
}
