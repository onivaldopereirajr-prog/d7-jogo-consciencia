function formatRelative(value) {
  if (!value) return 'sem registro'
  const diff = Math.max(0, Date.now() - new Date(value).getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min atrás`
  return `${Math.floor(min / 60)} h atrás`
}

function statusLabel(status) {
  return { online: 'online local', away: 'ausente', offline: 'offline local' }[status] ?? 'offline local'
}

export default function AdminPresencePanel({ presence }) {
  return (
    <section className="control-panel" aria-labelledby="presence-title">
      <div className="control-panel-head">
        <div>
          <span className="overline">Presença local</span>
          <h3 id="presence-title">Presença agora</h3>
        </div>
      </div>
      <p className="control-note">Esta visão mostra presença local deste navegador. Usuários reais em outros dispositivos exigirão backend com presença em tempo real.</p>
      <div className="presence-grid">
        {presence.map((item) => (
          <article key={item.userId} className={`presence-card ${item.status}`}>
            <span className="d7-avatar sm" style={{ '--avatar-color': item.avatarColor ?? '#20d3ee' }} aria-hidden="true"><strong>{item.avatarGlyph ?? 'D7'}</strong></span>
            <div>
              <strong>{item.nickname}</strong>
              <small>{statusLabel(item.status)} · {item.currentView}</small>
              <small>Último visto: {formatRelative(item.lastSeenAt)} · Sessão: {Math.round((item.estimatedSessionSeconds ?? 0) / 60)} min</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
