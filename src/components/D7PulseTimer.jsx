function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0')
  const seconds = String(safe % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function ActionButton({ className, label, onClick, disabled }) {
  if (!onClick) return null
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

export default function D7PulseTimer({
  totalSeconds,
  remainingSeconds,
  isRunning = false,
  isCompleted = false,
  isFailed = false,
  isChallengePending = false,
  label = 'Contador D7',
  subtitle = 'Respire e permaneça',
  hint = 'Presença ativa',
  mode = 'practice',
  progressPercent = 0,
  currentCount,
  countTarget = 108,
  onStart,
  onPause,
  onCancel,
  onReset,
  onComplete,
  completeDisabled = false,
  startLabel = 'Iniciar',
  pauseLabel = 'Pausar',
  cancelLabel = 'Cancelar',
  resetLabel = 'Reiniciar',
  completeLabel = 'Concluir',
  statusText,
  ariaLabel,
  children,
}) {
  const percent = Math.min(100, Math.max(0, Number(progressPercent) || 0))
  const displaySeconds = Math.max(0, Math.floor(Number(remainingSeconds) || 0))
  const stateClass = isFailed ? 'is-failed' : isCompleted ? 'is-completed' : isChallengePending ? 'is-challenge-pending' : isRunning ? 'is-running' : 'is-idle'
  const stateLabel = isFailed ? 'Presença interrompida' : isCompleted ? 'Concluído' : isChallengePending ? 'Desafio pendente' : isRunning ? 'Em contagem' : 'Aguardando início'
  const totalLabel = Number.isFinite(Number(totalSeconds)) && Number(totalSeconds) > 0 ? ` / ${formatClock(totalSeconds)}` : ''

  return (
    <section className={`d7-pulse-timer ${stateClass}`} aria-label={ariaLabel || `${label} ${subtitle}`.trim()}>
      <div className="d7-pulse-timer__content">
        <div className="d7-pulse-timer__meta">
          <span className="overline">{label}</span>
          <h3>{subtitle}</h3>
          {hint && <p>{hint}</p>}
        </div>

        <div className="d7-timer-stage">
          <div className="d7-timer-ring" style={{ '--progress': `${percent}%` }} aria-hidden="true">
            <div className="d7-pulse-core">
              <span className="d7-heartbeat-orb" aria-hidden="true" />
              <div className="d7-timer-number" role="timer" aria-live="polite">
                {formatClock(displaySeconds)}
              </div>
              <small>{stateLabel}</small>
            </div>
          </div>
          <div className="d7-timer-copy">
            <strong>{statusText || stateLabel}</strong>
            <span>{mode === 'seal' ? 'O selo exige foco.' : 'Permaneça. O código desperta no silêncio.'}</span>
            <span>{currentCount != null ? `Contador D7: ${currentCount}${countTarget ? ` / ${countTarget}` : ''}` : `Tempo alvo${totalLabel}`}</span>
          </div>
        </div>

        <div className="d7-timer-actions">
          <ActionButton className="primary-action" label={startLabel} onClick={onStart} disabled={isRunning || isCompleted || isChallengePending} />
          <ActionButton className="ghost-action" label={pauseLabel} onClick={onPause} disabled={!isRunning} />
          <ActionButton className="ghost-action" label={cancelLabel} onClick={onCancel} disabled={!isRunning && !isChallengePending} />
          <ActionButton className="ghost-action" label={resetLabel} onClick={onReset} disabled={isRunning} />
          <ActionButton className="complete-action" label={completeLabel} onClick={onComplete} disabled={completeDisabled} />
        </div>
      </div>

      {children}
    </section>
  )
}
