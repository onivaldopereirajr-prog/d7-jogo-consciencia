import { getTodayWheelCount, getWheelEvents, WHEEL_COST_D7T, WHEEL_DAILY_LIMIT } from '../services/wheelService.js'

export default function D7Wheel({ state, userId, result, t = (path) => path, onSpin }) {
  const todayCount = getTodayWheelCount(userId)
  const history = getWheelEvents(userId).slice(0, 8)
  const disabled = (state.tokenBalance ?? 0) < WHEEL_COST_D7T || todayCount >= WHEEL_DAILY_LIMIT
  const segments = ['+10 XP', '+1 centelha', 'Carta', 'Título', 'Tema', 'Missão', 'Biblioteca', 'Selo']

  return (
    <section className="wheel-shell content-section" aria-labelledby="wheel-title">
      <div className="professional-notice">
        <span className="overline">Gamificação simbólica</span>
        <h2 id="wheel-title">{t('wheel.title')}</h2>
        <p>{t('wheel.disclaimer')}</p>
      </div>
      <div className="wheel-layout">
        <div className="wheel-visual" aria-label="Roda D7 de recompensas simbólicas">
          {segments.map((segment, index) => <span key={segment} style={{ '--i': index }}>{segment}</span>)}
          <strong>D7</strong>
        </div>
        <div className="wheel-panel">
          <div className="admin-metrics-grid compact">
            <article><span>Saldo</span><strong>{state.tokenBalance ?? 0} D7T</strong></article>
            <article><span>Custo</span><strong>{WHEEL_COST_D7T} D7T</strong></article>
            <article><span>Limite diário</span><strong>{todayCount}/{WHEEL_DAILY_LIMIT}</strong></article>
          </div>
          <button type="button" className="primary-action" disabled={disabled} onClick={onSpin}>{t('wheel.spin')}</button>
          {disabled && <p className="token-disclaimer">Giro bloqueado por saldo insuficiente ou limite diário atingido.</p>}
          {result && <div className={`auth-message ${result.ok ? 'success' : 'error'}`} role="status">{result.message}</div>}
          <p className="token-disclaimer">A Roda D7 distribui recompensas educativas e cosméticas. Não há aposta, prêmio financeiro ou conversão externa.</p>
        </div>
      </div>
      <section className="wheel-history" aria-labelledby="wheel-history-title">
        <h3 id="wheel-history-title">Últimos giros</h3>
        {history.length === 0 && <p>Nenhum giro registrado neste navegador.</p>}
        {history.map((event) => <article key={event.id}><strong>{event.rewardLabel}</strong><span>-{event.costD7T} D7T</span><small>{new Date(event.createdAt).toLocaleString('pt-BR')}</small></article>)}
      </section>
    </section>
  )
}
