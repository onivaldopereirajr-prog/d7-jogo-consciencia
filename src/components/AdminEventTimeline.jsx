import { getAvatarSymbol } from '../services/avatarService.js'

function formatTime(value) {
  if (!value) return '--:--'
  try { return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '--:--' }
}

const filters = ['todos', 'acesso', 'prática', 'estudo', 'social', 'segurança', 'token', 'admin']

export default function AdminEventTimeline({ events, filter, onFilterChange, summaries }) {
  const visible = events.filter((event) => filter === 'todos' || event.category === filter)
  function avatarFor(userId) {
    const summary = summaries.find((item) => item.user.id === userId)
    return { glyph: getAvatarSymbol(summary?.avatarSymbol).glyph, color: summary?.avatarColor ?? '#20d3ee' }
  }
  return (
    <section className="control-panel" aria-labelledby="events-title">
      <div className="control-panel-head">
        <div><span className="overline">Auditoria local</span><h3 id="events-title">Eventos recentes</h3></div>
      </div>
      <div className="event-filter-row" role="tablist" aria-label="Filtrar eventos administrativos">
        {filters.map((item) => <button key={item} type="button" className={filter === item ? 'filter-chip active' : 'filter-chip'} onClick={() => onFilterChange(item)} aria-pressed={filter === item}>{item}</button>)}
      </div>
      <div className="event-timeline">
        {visible.slice(0, 40).map((event) => {
          const avatar = avatarFor(event.userId)
          return (
            <article key={event.id} className="event-row">
              <span className="d7-avatar sm" style={{ '--avatar-color': avatar.color }} aria-hidden="true"><strong>{avatar.glyph}</strong></span>
              <div>
                <header><strong>{formatTime(event.createdAt)} — {event.nickname}</strong><span>{event.category}</span></header>
                <p>{event.description}</p>
                <small>{event.view ? `Tela: ${event.view}` : 'Evento local'} · {event.eventType}</small>
              </div>
            </article>
          )
        })}
        {visible.length === 0 && <p className="d7-empty-state">Nenhum evento nesta filtragem.</p>}
      </div>
    </section>
  )
}
