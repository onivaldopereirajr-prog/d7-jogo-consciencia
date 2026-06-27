import { useState } from 'react'
import { getWheelAvailability, getWheelEvents, WHEEL_COST_D7T, WHEEL_DAILY_LIMIT } from '../services/wheelService.js'

const segments = ['+10 XP', '+1 centelha', 'Carta', 'Título', 'Tema', 'Missão', 'Biblioteca', 'Selo']

function spinButtonLabel({ availability, isSpinning }) {
  if (isSpinning) return 'Girando...'
  if (availability.reason === 'insufficient_balance') return 'D7T insuficiente'
  if (availability.reason === 'daily_limit') return 'Limite diário atingido'
  return 'Girar Roda D7'
}

export default function D7Wheel({ state, userId, result, t = (path) => path, onSpin, onNavigate }) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [localMessage, setLocalMessage] = useState(null)
  const availability = getWheelAvailability(state, userId)
  const history = getWheelEvents(userId).slice(0, 8)
  const disabled = !availability.canSpin || isSpinning

  function requestSpin() {
    if (isSpinning) return
    if (!availability.canSpin) {
      setLocalMessage({ type: 'error', text: availability.message })
      return
    }
    setLocalMessage(null)
    setIsSpinning(true)
    window.setTimeout(() => {
      onSpin?.({ useWelcomeSpin: availability.welcomeAvailable })
      setIsSpinning(false)
    }, 950)
  }

  return (
    <section className="wheel-shell content-section" aria-labelledby="wheel-title">
      <div className="professional-notice">
        <span className="overline">Gamificação simbólica</span>
        <h2 id="wheel-title">{t('wheel.title')}</h2>
        <p>{t('wheel.disclaimer')}</p>
      </div>
      <div className="wheel-layout">
        <button
          type="button"
          className={`wheel-visual ${availability.canSpin ? 'can-spin' : 'is-blocked'} ${isSpinning ? 'is-spinning' : ''}`}
          aria-label={availability.canSpin ? 'Girar Roda D7 de recompensas simbólicas' : availability.message}
          aria-disabled={!availability.canSpin}
          onClick={requestSpin}
        >
          {segments.map((segment, index) => <span key={segment} style={{ '--i': index }}>{segment}</span>)}
          <strong>D7</strong>
        </button>
        <div className="wheel-panel">
          <div className="admin-metrics-grid compact">
            <article><span>Saldo</span><strong>{availability.balance} D7T</strong></article>
            <article><span>Custo</span><strong>{availability.welcomeAvailable ? '0 D7T hoje' : `${WHEEL_COST_D7T} D7T`}</strong></article>
            <article><span>Limite diário</span><strong>{availability.todayCount}/{WHEEL_DAILY_LIMIT}</strong></article>
          </div>
          {availability.welcomeAvailable && availability.todayCount < WHEEL_DAILY_LIMIT && (
            <div className="auth-message success" role="status">Você possui 1 giro de boas-vindas para conhecer a Roda D7.</div>
          )}
          {!availability.canSpin && <p className="token-disclaimer wheel-block-message">{availability.message}</p>}
          <button type="button" className="primary-action" disabled={disabled} onClick={requestSpin} aria-label={spinButtonLabel({ availability, isSpinning })}>{spinButtonLabel({ availability, isSpinning })}</button>
          {localMessage && <div className={`auth-message ${localMessage.type}`} role="status">{localMessage.text}</div>}
          {result && <div className={`auth-message ${result.ok ? 'success' : 'error'}`} role="status">{result.message}</div>}
          <p className="token-disclaimer">A Roda D7 distribui recompensas educativas e cosméticas. Não há aposta, prêmio financeiro ou conversão externa.</p>
        </div>
      </div>

      <section className="wheel-earn-panel" aria-labelledby="wheel-earn-title">
        <div>
          <span className="overline">Economia simbólica</span>
          <h3 id="wheel-earn-title">Como ganhar D7T</h3>
          <p>D7T é conquistado por presença e estudo dentro do jogo. Não pode ser comprado, vendido, sacado ou transferido.</p>
        </div>
        <ul>
          <li>Concluir práticas válidas.</li>
          <li>Abrir selos.</li>
          <li>Estudar cards da Biblioteca.</li>
          <li>Completar desafios.</li>
          <li>Atingir marcos 21/108.</li>
          <li>Participar da jornada diariamente.</li>
        </ul>
        <div className="wheel-earn-actions">
          <button type="button" className="ghost-action" onClick={() => onNavigate?.('pratica')}>Ir para Prática</button>
          <button type="button" className="ghost-action" onClick={() => onNavigate?.('biblioteca')}>Abrir Biblioteca</button>
          <button type="button" className="ghost-action" onClick={() => onNavigate?.('codice')}>Abrir Selos</button>
        </div>
      </section>

      <section className="wheel-history" aria-labelledby="wheel-history-title">
        <h3 id="wheel-history-title">Últimos giros</h3>
        {history.length === 0 && <p>Nenhum giro registrado neste navegador.</p>}
        {history.map((event) => (
          <article key={event.id}>
            <strong>{event.rewardLabel}</strong>
            <span>{event.costD7T > 0 ? `-${event.costD7T} D7T` : 'Giro gratuito'}</span>
            <small>{event.welcomeSpin ? 'Boas-vindas · ' : ''}{new Date(event.createdAt).toLocaleString('pt-BR')}</small>
          </article>
        ))}
      </section>
    </section>
  )
}
