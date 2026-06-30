import { useEffect, useMemo, useState } from 'react'
import D7DurationSelector from './D7DurationSelector.jsx'
import D7MantraPlayer from './D7MantraPlayer.jsx'
import D7PulseTimer from './D7PulseTimer.jsx'

const FLOW_STEPS = ['day-panel', 'breath', 'silence', 'word', 'card', 'level-up']
const BREATH_PHASES = [
  { id: 'inhale', label: 'Inspirar', detail: 'Receba o chamado.' },
  { id: 'hold', label: 'Reter', detail: 'Permaneça no centro.' },
  { id: 'exhale', label: 'Expirar', detail: 'Solte o excesso.' },
]
const BREATH_SECONDS = 4
const BREATH_CYCLES = 3

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0')
  const seconds = String(safe % 60).padStart(2, '0')
  return minutes + ':' + seconds
}

function stepIndex(step) {
  return Math.max(0, FLOW_STEPS.indexOf(step))
}

function PracticeSteps({ current }) {
  return (
    <ol className="playable-steps" aria-label="Fluxo da prática D7">
      {FLOW_STEPS.map((step, index) => (
        <li key={step} className={index <= stepIndex(current) ? 'active' : ''}>
          <span>{index + 1}</span>
        </li>
      ))}
    </ol>
  )
}

function BreathStage({ onDone }) {
  const [tick, setTick] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const totalTicks = BREATH_CYCLES * BREATH_PHASES.length * BREATH_SECONDS
  const safeTick = Math.min(tick, totalTicks - 0.001)
  const phaseIndex = Math.floor(safeTick / BREATH_SECONDS) % BREATH_PHASES.length
  const cycle = Math.min(BREATH_CYCLES, Math.floor(safeTick / (BREATH_PHASES.length * BREATH_SECONDS)) + 1)
  const phase = BREATH_PHASES[phaseIndex]
  const phaseRemaining = Math.max(1, Math.ceil(BREATH_SECONDS - (safeTick % BREATH_SECONDS)))
  const phaseElapsed = safeTick % BREATH_SECONDS
  const phaseProgress = phaseElapsed / BREATH_SECONDS
  const dotPoints = [
    { x: 50, y: 9 },
    { x: 90, y: 86 },
    { x: 10, y: 86 },
  ]
  const dotStart = dotPoints[phaseIndex]
  const dotEnd = dotPoints[(phaseIndex + 1) % dotPoints.length]
  const dotX = dotStart.x + ((dotEnd.x - dotStart.x) * phaseProgress)
  const dotY = dotStart.y + ((dotEnd.y - dotStart.y) * phaseProgress)

  useEffect(() => {
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      setTick(Math.min(totalTicks, (Date.now() - startedAt) / 1000))
    }, 250)
    return () => window.clearInterval(interval)
  }, [totalTicks])

  useEffect(() => {
    if (tick < totalTicks || isFinished) return
    setIsFinished(true)
    onDone?.()
  }, [isFinished, onDone, tick, totalTicks])

  function handleSkip() {
    if (isFinished) return
    setIsFinished(true)
    onDone?.()
  }

  return (
    <section key="breath" className={'breath-stage playable-stage playable-stage--breath phase-' + phase.id} aria-labelledby="breath-stage-title">
      <div
        className={'breath-triangle phase-' + phase.id}
        aria-hidden="true"
        style={{
          '--breath-dot-x': `${dotX}`,
          '--breath-dot-y': `${dotY}`,
          '--breath-dot-scale': phase.id === 'hold' ? 1.18 : 1,
        }}
      >
        <svg className="breath-triangle-visual" viewBox="0 0 100 100" focusable="false" aria-hidden="true">
          <polygon className="breath-triangle-fill" points="50 6 94 88 6 88" />
          <polygon className="breath-triangle-core" points="50 29 72 76 28 76" />
          <polyline className="breath-triangle-line" points="50 6 94 88 6 88 50 6" />
          <circle className="breath-triangle-dot" cx={dotX} cy={dotY} r="4.2" />
        </svg>
      </div>
      <div className="breath-copy" aria-live="polite">
        <span className="overline">Respiração triangular</span>
        <h3 id="breath-stage-title">{phase.label}</h3>
        <p>{phase.detail}</p>
        <small>Ciclo {cycle}/{BREATH_CYCLES} · {phaseRemaining}s</small>
      </div>
      <button type="button" className="ghost-action" onClick={handleSkip}>Pular respiração</button>
    </section>
  )
}

function resolveCard(summary, recommendedLibraryCard, fallbackCard) {
  if (summary?.revealedCard) return summary.revealedCard
  if (recommendedLibraryCard) return {
    title: recommendedLibraryCard.title,
    track: recommendedLibraryCard.track ?? recommendedLibraryCard.tradition ?? 'Biblioteca D7',
    kind: recommendedLibraryCard.kind ?? 'Estudo',
    symbol: recommendedLibraryCard.symbol ?? '✦',
    text: recommendedLibraryCard.summary ?? recommendedLibraryCard.explanation ?? 'Uma carta se aproxima para o próximo estudo.',
    reflection: recommendedLibraryCard.studyNote ?? recommendedLibraryCard.gameRelation ?? 'Observe o símbolo antes da próxima ação.',
  }
  if (fallbackCard) return {
    title: fallbackCard.transliteration,
    track: fallbackCard.track,
    kind: fallbackCard.kind,
    symbol: fallbackCard.symbol,
    text: fallbackCard.meaning + '. ' + fallbackCard.explanation,
    reflection: fallbackCard.gameUse ?? 'Um símbolo respondeu ao seu retorno.',
  }
  return { title: 'D7', track: 'Jornada', kind: 'Carta', symbol: 'D7', text: 'A presença registrada abre a próxima passagem.', reflection: 'Retornar também é avançar.' }
}

export default function D7PlayablePractice({
  journeyCode,
  nextJourneyCode,
  stage,
  phrase,
  state,
  practiceCelebration,
  practiceDurationMinutes,
  practiceDurationInput,
  practiceDurationError,
  practicePreview,
  practiceTotalSeconds,
  remaining,
  timerStatus,
  timerProgress,
  mantraAudioRef,
  t,
  recommendedLibraryCard,
  fallbackCard,
  currentLevel,
  onDurationChange,
  onCustomDurationChange,
  onStartPractice,
  onPausePractice,
  onCancelPractice,
  onResetPractice,
  onCompletePractice,
  onRecordWord,
  onNavigate,
}) {
  const [step, setStep] = useState('day-panel')
  const [word, setWord] = useState('')
  const [wordAttempted, setWordAttempted] = useState(false)
  const [summary, setSummary] = useState(null)
  const isPracticeDone = Boolean(state.daily?.practice)
  const card = useMemo(() => resolveCard(summary, recommendedLibraryCard, fallbackCard), [fallbackCard, recommendedLibraryCard, summary])

  useEffect(() => {
    if (timerStatus === 'running' && step !== 'silence') setStep('silence')
  }, [step, timerStatus])

  function handleSilenceComplete() {
    const result = onCompletePractice?.()
    if (!result) return
    setSummary(result)
    setStep('word')
  }

  function handleRecordWord(event) {
    event.preventDefault()
    const cleanWord = word.trim()
    if (!cleanWord) {
      setWordAttempted(true)
      return
    }
    setWordAttempted(false)
    onRecordWord?.(cleanWord)
    setWord('')
    setStep('card')
  }

  return (
    <section className="playable-practice" aria-label="Prática jogável D7">
      <div className={'playable-shell playable-shell--' + step}>
        <header className="playable-header">
          <div>
            <span className="overline">Prática guiada</span>
            <h2>{journeyCode} · {stage.name}</h2>
          </div>
          <PracticeSteps current={step} />
        </header>

        {step === 'day-panel' && (
          <section key="day-panel" className="day-panel-stage playable-stage" aria-labelledby="day-panel-title">
            <div className="day-code-orb" aria-hidden="true"><span>{journeyCode}</span></div>
            <div className="day-panel-copy">
              <span className="overline">Painel do Dia</span>
              <h3 id="day-panel-title">{stage.name}</h3>
              <p className="day-panel-lead">Antes de agir, alinhe o sopro.</p>
              <p>{phrase}</p>
              <small className="day-panel-mantra">O jogo começa quando você para de fugir.</small>
              <div className="day-mission-grid">
                <article><span>Missão</span><strong>{isPracticeDone ? 'Prática livre disponível' : 'Concluir a prática do dia'}</strong></article>
                <article><span>Tempo recomendado</span><strong>{stage.minutes} min</strong></article>
                <article><span>Tempo escolhido</span><strong>{practiceDurationMinutes} min</strong></article>
                <article><span>Recompensa</span><strong>+{practicePreview.xp} XP</strong></article>
              </div>
              <div className={['practice-banner', isPracticeDone ? 'complete' : 'idle', practiceCelebration ? 'practice-celebration' : ''].filter(Boolean).join(' ')} role="status">
                <strong>{isPracticeDone ? 'Prática de hoje concluída' : 'Jornada pronta'}</strong>
                <span>{isPracticeDone ? 'O chamado de hoje já foi respondido. Você pode revisitar o silêncio, mas o ciclo já avançou.' : stage.intent}</span>
              </div>
              <div className="playable-actions">
                <button type="button" className="primary-action" onClick={() => setStep('breath')}>Iniciar Respiração</button>
                <button type="button" className="ghost-action" onClick={() => setStep('silence')}>Ir direto ao silêncio</button>
              </div>
            </div>
          </section>
        )}

        {step === 'breath' && <BreathStage onDone={() => setStep('silence')} />}

        {step === 'silence' && (
          <section key="silence" className="silence-stage playable-stage" aria-labelledby="silence-stage-title">
            <div className="practice-config-panel">
              <D7DurationSelector
                value={practiceDurationMinutes}
                onChange={onDurationChange}
                customValue={practiceDurationInput}
                onCustomChange={onCustomDurationChange}
                error={practiceDurationError}
                disabled={timerStatus === 'running' || timerStatus === 'complete'}
              />
              <D7MantraPlayer
                ref={mantraAudioRef}
                t={t}
                selectedDurationMinutes={practiceDurationMinutes}
                isPracticeRunning={timerStatus === 'running'}
                isPracticePaused={timerStatus === 'paused'}
                isPracticeCompleted={timerStatus === 'complete'}
              />
            </div>
            <div className={['playable-silence-frame', timerStatus === 'running' ? 'is-running' : '', timerStatus === 'complete' ? 'is-complete' : ''].filter(Boolean).join(' ')}>
              <span className="playable-silence-orbit" aria-hidden="true" />
              <span className="playable-silence-particles" aria-hidden="true" />
              <D7PulseTimer
                label="Silêncio D7"
                subtitle="Timer de presença"
                hint={timerStatus === 'running' ? 'Presença ativa' : timerStatus === 'paused' ? 'Prática pausada. Retome para seguir.' : isPracticeDone ? 'O chamado de hoje já foi respondido. Você pode revisitar o silêncio, mas o ciclo já avançou.' : 'Quando o timer terminar, a palavra final será aberta.'}
                totalSeconds={practiceTotalSeconds}
                remainingSeconds={remaining}
                isRunning={timerStatus === 'running'}
                isCompleted={timerStatus === 'complete'}
                isFailed={false}
                isChallengePending={false}
                mode="practice"
                progressPercent={timerStatus === 'running' ? timerProgress : timerStatus === 'complete' ? 100 : 0}
                currentCount={state.presenceCounter108 ?? 0}
                countTarget={108}
                onStart={onStartPractice}
                onPause={timerStatus === 'running' ? onPausePractice : null}
                onCancel={timerStatus === 'running' || timerStatus === 'paused' ? onCancelPractice : null}
                onReset={timerStatus === 'idle' ? onResetPractice : null}
                onComplete={timerStatus === 'complete' ? handleSilenceComplete : null}
                completeDisabled={timerStatus !== 'complete'}
                startLabel={timerStatus === 'paused' ? 'Retomar silêncio' : isPracticeDone ? 'Iniciar prática livre' : 'Iniciar silêncio'}
                pauseLabel="Pausar"
                cancelLabel="Cancelar prática"
                resetLabel="Reiniciar seleção"
                completeLabel="Abrir palavra final"
                statusText={timerStatus === 'running' ? 'Silêncio ativo' : timerStatus === 'paused' ? 'Silêncio pausado' : timerStatus === 'complete' ? 'Silêncio concluído' : 'aguardando entrada'}
                ariaLabel={'Tempo restante ' + formatTime(remaining)}
              />
            </div>
          </section>
        )}

        {step === 'word' && (
          <section key="word" className="word-stage playable-stage" aria-labelledby="word-stage-title">
            <div className="word-orb" aria-hidden="true">?</div>
            <form className="playable-word-form" onSubmit={handleRecordWord}>
              <span className="overline">Palavra final</span>
              <h3 id="word-stage-title">Qual palavra ficou?</h3>
              <input
                className={word.trim() ? 'has-value' : ''}
                value={word}
                onChange={(event) => { setWord(event.target.value); if (event.target.value.trim()) setWordAttempted(false) }}
                placeholder="ex: foco, luz, paz"
                aria-invalid={wordAttempted && !word.trim()}
                aria-describedby={wordAttempted && !word.trim() ? 'practice-word-alert' : undefined}
                autoFocus
              />
              {wordAttempted && !word.trim() && <small id="practice-word-alert" className="playable-word-alert" role="alert">Digite uma palavra para selar a prática.</small>}
              <button type="submit" className="primary-action">Registrar Palavra</button>
            </form>
          </section>
        )}

        {step === 'card' && (
          <section key="card" className="card-stage playable-stage" aria-labelledby="card-stage-title">
            <article className="revealed-card">
              <span className="overline">Carta revelada</span>
              <p className="revealed-card__intro">Um símbolo respondeu ao seu retorno.</p>
              <div className="revealed-card__glyph" aria-hidden="true">{card.symbol}</div>
              <h3 id="card-stage-title">{card.title}</h3>
              <small>{card.kind} · {card.track}</small>
              <p>{card.text}</p>
              <small className="revealed-card__reflection">{card.reflection ?? 'Observe o símbolo antes da próxima ação.'}</small>
              <button type="button" className="primary-action" onClick={() => setStep('level-up')}>Continuar</button>
            </article>
          </section>
        )}

        {step === 'level-up' && (
          <section key="level-up" className="level-stage playable-stage" aria-labelledby="level-stage-title">
            <div className="level-ring" aria-hidden="true"><span>Nv. {currentLevel}</span></div>
            <div className="level-copy">
              <span className="overline">Avanço de nível</span>
              <h3 id="level-stage-title">Ciclo registrado</h3>
              <div className="level-grid">
                <article><span>Código concluído</span><strong>{summary?.completedCode ?? journeyCode}</strong></article>
                <article><span>Próximo código</span><strong>{summary?.nextCode ?? nextJourneyCode}</strong></article>
                <article><span>XP</span><strong>{state.xp}</strong><small>{summary ? '+' + summary.xpGained : 'total'}</small></article>
                <article><span>Centelhas</span><strong>{state.sparks}</strong><small>{summary ? '+' + summary.sparksGained : 'total'}</small></article>
                <article><span>Streak</span><strong>{state.progress?.streak ?? 0}</strong><small>dias</small></article>
              </div>
              {state.lastUnlocks?.length > 0 && <div className="unlock-feed" aria-live="polite">{state.lastUnlocks.map((item) => <span key={item}>{item}</span>)}</div>}
              <div className="playable-actions">
                <button type="button" className="primary-action" onClick={() => onNavigate?.('jornada')}>Ir para Jornada</button>
                <button type="button" className="ghost-action" onClick={() => onNavigate?.('home')}>Voltar à Home</button>
                <button type="button" className="ghost-action" onClick={() => { setSummary(null); setStep('day-panel') }}>Praticar novamente sem duplicar ciclo</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  )
}
