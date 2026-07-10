import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_BREATHING_TECHNIQUE_ID, breathingTechniques, fallbackBreathingTechnique, getBreathingTechnique } from '../data/breathingTechniques.js'
import D7MantraPlayer from './D7MantraPlayer.jsx'
import D7PulseTimer from './D7PulseTimer.jsx'
import { pointOnBreathTriangle } from '../utils/breathTriangle.js'

const FLOW_STEPS = ['day-panel', 'breath', 'silence', 'word', 'card', 'level-up']
const BREATHING_STORAGE_KEY = 'maiindy_breathing_technique'
const BREATH_CYCLES = 3
const AUDIO_BLOCKED_MESSAGE = 'Toque em Reproduzir áudio para iniciar o mantra.'

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
    <ol className="playable-steps" aria-label="Fluxo da sessão oficial Maiindy">
      {FLOW_STEPS.map((step, index) => (
        <li key={step} className={index <= stepIndex(current) ? 'active' : ''}>
          <span>{index + 1}</span>
        </li>
      ))}
    </ol>
  )
}

function readStoredBreathingTechniqueId() {
  try {
    return window.localStorage.getItem(BREATHING_STORAGE_KEY) || DEFAULT_BREATHING_TECHNIQUE_ID
  } catch {
    return DEFAULT_BREATHING_TECHNIQUE_ID
  }
}

function saveStoredBreathingTechniqueId(id) {
  try {
    window.localStorage.setItem(BREATHING_STORAGE_KEY, id)
  } catch {
    // Optional UI preference only.
  }
}

function cycleDuration(steps) {
  return steps.reduce((sum, step) => sum + Number(step.seconds ?? 0), 0)
}

function phaseAtTick(steps, tick) {
  const total = cycleDuration(steps) || 1
  const inCycle = tick % total
  let cursor = 0
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    const seconds = Math.max(1, Number(step.seconds ?? 1))
    if (inCycle < cursor + seconds) return { phase: step, index, elapsed: inCycle - cursor, seconds }
    cursor += seconds
  }
  const fallback = steps[steps.length - 1] ?? fallbackBreathingTechnique.steps[0]
  return { phase: fallback, index: steps.length - 1, elapsed: 0, seconds: Math.max(1, Number(fallback.seconds ?? 1)) }
}

const BREATH_DOT_COLORS = [
  [153, 92, 255],
  [255, 226, 64],
  [103, 255, 62],
]

function breathDotColor(progress) {
  const normalized = ((progress % 1) + 1) % 1
  const scaled = normalized * BREATH_DOT_COLORS.length
  const index = Math.floor(scaled) % BREATH_DOT_COLORS.length
  const nextIndex = (index + 1) % BREATH_DOT_COLORS.length
  const amount = scaled - Math.floor(scaled)
  const color = BREATH_DOT_COLORS[index].map((channel, channelIndex) => (
    Math.round(channel + ((BREATH_DOT_COLORS[nextIndex][channelIndex] - channel) * amount))
  ))
  return `rgb(${color.join(' ')})`
}

function BreathStage({ technique = fallbackBreathingTechnique, onDone }) {
  const [tick, setTick] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const steps = technique.steps?.length ? technique.steps : fallbackBreathingTechnique.steps
  const cycleSeconds = cycleDuration(steps)
  const totalTicks = BREATH_CYCLES * cycleSeconds
  const safeTick = Math.min(tick, totalTicks - 0.001)
  const cycle = Math.min(BREATH_CYCLES, Math.floor(safeTick / cycleSeconds) + 1)
  const { phase, elapsed: phaseElapsed, seconds: phaseSeconds } = phaseAtTick(steps, safeTick)
  const phaseRemaining = Math.max(1, Math.ceil(phaseSeconds - phaseElapsed))
  const cycleProgress = (safeTick % cycleSeconds) / cycleSeconds
  const dotPosition = pointOnBreathTriangle(cycleProgress)
  const dotColor = breathDotColor(cycleProgress)

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
          '--breath-dot-color': dotColor,
        }}
      >
        <svg className="breath-triangle-visual" viewBox="0 0 100 100" focusable="false" aria-hidden="true">
          <polygon className="breath-triangle-fill" points="50 6 94 88 6 88" />
          <polygon className="breath-triangle-core" points="50 29 72 76 28 76" />
          <polyline className="breath-triangle-line" points="50 6 94 88 6 88 50 6" />
          <circle
            className="breath-triangle-dot"
            cx={dotPosition.x}
            cy={dotPosition.y}
            r={phase.id?.startsWith('hold') ? 3.2 : 2.8}
          />
        </svg>
      </div>
      <div className="breath-copy" aria-live="polite">
        <span className="overline">{technique.name}</span>
        <h3 id="breath-stage-title">{phase.label}</h3>
        <p>{phase.detail ?? technique.use}</p>
        <small>Ciclo {cycle}/{BREATH_CYCLES} · {phase.seconds}s · faltam {phaseRemaining}s</small>
      </div>
      <button type="button" className="ghost-action" onClick={handleSkip}>Pular respiração</button>
    </section>
  )
}

function SegmentMeter({ value = 0, max = 7, label = 'Progresso' }) {
  const safeMax = Math.max(1, Math.floor(Number(max) || 1))
  const safeValue = Math.max(0, Math.min(safeMax, Math.floor(Number(value) || 0)))
  return (
    <div className="retention-segments" role="img" aria-label={label}>
      {Array.from({ length: safeMax }, (_, index) => (
        <span key={index} className={index < safeValue ? 'active' : ''} />
      ))}
    </div>
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
  focusMode = false,
  focusVariant = 'full',
  initialStep = 'day-panel',
  journeyCode,
  nextJourneyCode,
  stage,
  phrase,
  state,
  officialJourney,
  onRestartOfficialJourney,
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
  nextUnlock,
  retentionPromise,
  presenceFlame,
  livingPortal,
  returnRitual,
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
  const [step, setStep] = useState(initialStep)
  const [word, setWord] = useState('')
  const [wordAttempted, setWordAttempted] = useState(false)
  const [summary, setSummary] = useState(null)
  const [audioPlayback, setAudioPlayback] = useState({ enabled: true, muted: false, isAudioPlaying: false })
  const [audioNotice, setAudioNotice] = useState('')
  const [selectedBreathingId, setSelectedBreathingId] = useState(readStoredBreathingTechniqueId)
  const [previewBreathingId, setPreviewBreathingId] = useState(() => selectedBreathingId === DEFAULT_BREATHING_TECHNIQUE_ID ? breathingTechniques[0]?.id ?? DEFAULT_BREATHING_TECHNIQUE_ID : selectedBreathingId)
  const completionSubmittedRef = useRef(false)
  const isPracticeDone = Boolean(state.daily?.practice)
  const selectedBreathingTechnique = useMemo(() => getBreathingTechnique(selectedBreathingId), [selectedBreathingId])
  const previewBreathingTechnique = useMemo(() => getBreathingTechnique(previewBreathingId), [previewBreathingId])
  const card = useMemo(() => resolveCard(summary, recommendedLibraryCard, fallbackCard), [fallbackCard, recommendedLibraryCard, summary])
  const completionUnlocks = useMemo(() => {
    const messages = Array.isArray(state.lastUnlocks) ? state.lastUnlocks : []
    if (!summary) return messages
    return messages.map((item) => (
      /^\+\d+\s+Centelhas$/.test(item) ? '+' + (summary.sparksGained ?? 0) + ' Centelhas' : item
    ))
  }, [state.lastUnlocks, summary])

  useEffect(() => {
    if (timerStatus === 'running' && step !== 'silence') setStep('silence')
  }, [step, timerStatus])

  useEffect(() => {
    if (timerStatus === 'running') completionSubmittedRef.current = false
  }, [timerStatus])

  useEffect(() => {
    if (timerStatus !== 'complete' || step !== 'silence') return
    setStep('word')
  }, [step, timerStatus])

  function updateAudioNotice(result) {
    if (!result) return
    if (result.ok) {
      setAudioNotice('')
      return
    }
    if (result.reason === 'blocked') setAudioNotice(AUDIO_BLOCKED_MESSAGE)
  }

  async function handleStartSilence() {
    const result = await onStartPractice?.()
    updateAudioNotice(result)
  }

  async function handleStartBreath() {
    const result = await mantraAudioRef.current?.start?.()
    updateAudioNotice(result)
    setStep('breath')
  }

  function handleBreathComplete() {
    if (focusMode && focusVariant === 'breath') {
      mantraAudioRef.current?.pause?.()
      setStep('breath-complete')
      return
    }
    setStep('silence')
  }

  async function handlePlayMantra() {
    const result = await mantraAudioRef.current?.start?.()
    updateAudioNotice(result)
  }

  function handlePauseMantra() {
    mantraAudioRef.current?.pause?.()
    setAudioNotice('')
  }

  function handleToggleSound() {
    mantraAudioRef.current?.toggleMute?.()
  }

  function handlePlaybackStateChange(nextState) {
    setAudioPlayback(nextState)
    if (nextState.isAudioPlaying) setAudioNotice('')
  }

  function handleUseBreathingTechnique() {
    setSelectedBreathingId(previewBreathingTechnique.id)
    saveStoredBreathingTechniqueId(previewBreathingTechnique.id)
  }

  function handleSilenceComplete() {
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
    if (completionSubmittedRef.current) return
    completionSubmittedRef.current = true
    const result = onCompletePractice?.({ finalWord: cleanWord })
    if (!result) {
      completionSubmittedRef.current = false
      onRecordWord?.(cleanWord)
      setSummary((current) => ({ ...(current ?? {}), finalWord: cleanWord }))
    } else {
      setSummary({ ...result, finalWord: cleanWord })
    }
    setWord('')
    setStep('card')
  }

  function handlePracticeAgain() {
    completionSubmittedRef.current = false
    setSummary(null)
    setWord('')
    setWordAttempted(false)
    setStep('day-panel')
  }

  return (
    <section className="playable-practice" aria-label="Sessão oficial Maiindy Game">
      <div className={'playable-shell playable-shell--' + step}>
        <header className="playable-header">
          <div>
            <span className="overline">{focusMode ? 'Maiindy Playtest' : 'Sessão oficial'}</span>
            <h2>{focusMode ? (focusVariant === 'breath' ? 'Respiração guiada' : 'Meditação guiada') : `${journeyCode} · ${stage.name}`}</h2>
          </div>
          <PracticeSteps current={step} />
        </header>

        {step === 'day-panel' && (
          <section key="day-panel" className="day-panel-stage playable-stage" aria-labelledby="day-panel-title">
            <div className="day-code-orb" aria-hidden="true"><span>{journeyCode}</span></div>
            <div className="day-panel-copy">
              <span className="overline">{focusMode ? 'Respiração' : 'Painel do Dia'}</span>
              <h3 id="day-panel-title">{focusMode ? 'Preparar respiração' : `Categoria ${officialJourney?.categoryId ?? stage.id}: ${stage.name}`}</h3>
              <p className="day-panel-lead">{focusMode ? 'Escolha a técnica e a atmosfera sonora antes de começar.' : 'O sucesso aqui não é medido por velocidade, mas por consistência.'}</p>
              <p>{focusMode ? 'A prática de respiração é uma preparação guiada para ritmo, atenção e presença.' : stage.intent}</p>
              <small className="day-panel-mantra">O verdadeiro desafio não é o ato em si, mas mantê-lo.</small>
              <div className="day-mission-grid">
                <article><span>Nível atual</span><strong>{journeyCode}</strong></article>
                <article><span>Semana</span><strong>{officialJourney?.weekNumber ?? stage.week}/5</strong></article>
                <article><span>Dia</span><strong>{officialJourney?.dayNumber ?? 1}/35</strong></article>
                <article><span>Tempo oficial de hoje</span><strong>{stage.minutes} min</strong></article>
              </div>
              <section className="breathing-library-card" aria-labelledby="breathing-library-title">
                <div className="breathing-library-head">
                  <div>
                    <span className="overline">Apoio educativo</span>
                    <h4 id="breathing-library-title">Técnicas de Respiração</h4>
                    <p>Escolha uma respiração de apoio antes de iniciar sua sessão oficial.</p>
                  </div>
                  <strong>{selectedBreathingTechnique.shortName}</strong>
                </div>
                <div className="breathing-technique-grid" role="list" aria-label="Técnicas de respiração disponíveis">
                  {breathingTechniques.map((technique) => (
                    <button
                      key={technique.id}
                      type="button"
                      className={technique.id === previewBreathingTechnique.id ? 'breathing-technique-card active' : 'breathing-technique-card'}
                      onClick={() => setPreviewBreathingId(technique.id)}
                      aria-pressed={technique.id === previewBreathingTechnique.id}
                    >
                      <strong>{technique.shortName}</strong>
                      <span>{technique.steps.map((item) => item.seconds).join('-')}s</span>
                    </button>
                  ))}
                </div>
                <article className="breathing-technique-detail">
                  <div>
                    <span className="overline">Técnica selecionada</span>
                    <h5>{previewBreathingTechnique.name}</h5>
                    <p>{previewBreathingTechnique.use}</p>
                  </div>
                  <ol>
                    {previewBreathingTechnique.steps.map((item, index) => (
                      <li key={item.id + '-' + index}><span>{item.label}</span><strong>{item.seconds}s</strong></li>
                    ))}
                  </ol>
                  <button type="button" className="mini-action" onClick={handleUseBreathingTechnique}>Usar como preparação</button>
                </article>
                <p className="breathing-library-note">As técnicas de respiração são apoio. A prática oficial continua sendo cumprir o tempo do nível atual com os olhos fechados.</p>
              </section>

              {focusMode && focusVariant === 'breath' && (
                <section className="practice-config-panel practice-config-panel--breath-audio" aria-label="Áudio da respiração">
                  <D7MantraPlayer
                    ref={mantraAudioRef}
                    t={t}
                    selectedDurationMinutes={practiceDurationMinutes}
                    isPracticeRunning={step === 'breath'}
                    isPracticePaused={false}
                    isPracticeCompleted={step === 'breath-complete'}
                    onPlaybackStateChange={handlePlaybackStateChange}
                    contextLabel="respiração"
                  />
                </section>
              )}

              <div className={['practice-banner', isPracticeDone ? 'complete' : 'idle', practiceCelebration ? 'practice-celebration' : ''].filter(Boolean).join(' ')} role="status">
                <strong>{state.progress?.restartRequired ? 'Reinício necessário' : isPracticeDone ? 'Sessão oficial de hoje concluída' : 'Sessão oficial pronta'}</strong>
                <span>{state.progress?.restartRequired ? 'Você perdeu um dia. O jogo recomeça em A1. Isso não é punição; é compromisso renovado.' : isPracticeDone ? 'O ciclo de hoje já avançou. Você pode praticar livremente sem duplicar progresso oficial.' : 'Feche os olhos. Permaneça até o timer terminar.'}</span>
              </div>
              <div className="playable-actions">
                {state.progress?.restartRequired ? (
                  <button type="button" className="primary-action" onClick={onRestartOfficialJourney}>Recomeçar em A1</button>
                ) : (
                  <button type="button" className="primary-action" onClick={focusMode && focusVariant === 'breath' ? handleStartBreath : () => setStep('breath')}>{focusMode && focusVariant === 'breath' ? 'Iniciar respiração' : 'Começar sessão oficial'}</button>
                )}
                {!state.progress?.restartRequired && !(focusMode && focusVariant === 'breath') && <button type="button" className="ghost-action" onClick={() => setStep('silence')}>Ir direto ao silêncio</button>}
              </div>
            </div>
          </section>
        )}

        {step === 'breath' && <BreathStage technique={selectedBreathingTechnique} onDone={handleBreathComplete} />}

        {step === 'silence' && (
          <section key="silence" className="silence-stage playable-stage" aria-labelledby="silence-stage-title">
            <div className="practice-config-panel">
              <section className="official-duration-card" aria-labelledby="official-duration-title">
                <span className="overline">Tempo oficial de hoje</span>
                <h3 id="official-duration-title">{stage.minutes} minuto{stage.minutes === 1 ? '' : 's'}</h3>
                <p>A regra oficial é fixa por categoria: A=1, B=2, C=3, D=4 e E=5 minutos. Prática livre pode existir, mas não avança o progresso oficial.</p>
                {practiceDurationError && <small role="status">{practiceDurationError}</small>}
              </section>
              <D7MantraPlayer
                ref={mantraAudioRef}
                t={t}
                selectedDurationMinutes={practiceDurationMinutes}
                isPracticeRunning={timerStatus === 'running'}
                isPracticePaused={timerStatus === 'paused'}
                isPracticeCompleted={timerStatus === 'complete'}
                onPlaybackStateChange={handlePlaybackStateChange}
                contextLabel={focusMode && focusVariant === 'meditation' ? 'meditação' : 'prática'}
              />
            </div>
            <div className={['playable-silence-frame', timerStatus === 'running' ? 'is-running' : '', timerStatus === 'complete' ? 'is-complete' : ''].filter(Boolean).join(' ')}>
              <span className="playable-silence-orbit" aria-hidden="true" />
              <span className="playable-silence-particles" aria-hidden="true" />
              <D7PulseTimer
                label="Silêncio D7"
                subtitle="Olhos fechados · postura sentada ou deitada"
                hint={timerStatus === 'running' ? 'Feche os olhos. Permaneça até o timer terminar.' : timerStatus === 'paused' ? 'Sessão pausada. Retome quando estiver pronto.' : isPracticeDone ? 'O timer mede uma prática livre. O mantra é opcional.' : 'Prepare-se. Sente-se ou deite-se. Feche os olhos quando iniciar o timer.'}
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
                onStart={handleStartSilence}
                onPause={timerStatus === 'running' ? onPausePractice : null}
                onCancel={timerStatus === 'running' || timerStatus === 'paused' ? onCancelPractice : null}
                onReset={timerStatus === 'idle' ? onResetPractice : null}
                onComplete={timerStatus === 'complete' ? handleSilenceComplete : null}
                completeDisabled={timerStatus !== 'complete'}
                startLabel={timerStatus === 'paused' ? 'Retomar silêncio' : isPracticeDone ? 'Iniciar prática livre' : 'Iniciar sessão oficial'}
                pauseLabel="Pausar"
                cancelLabel="Cancelar prática"
                resetLabel="Reiniciar seleção"
                completeLabel="Abrir palavra final"
                statusText={timerStatus === 'running' ? 'Silêncio ativo' : timerStatus === 'paused' ? 'Silêncio pausado' : timerStatus === 'complete' ? 'Silêncio concluído' : 'aguardando entrada'}
                ariaLabel={'Tempo restante ' + formatTime(remaining)}
              >
                <div className="silence-audio-panel" aria-live="polite">
                  <p>O mantra é opcional. A sessão oficial conta pelo tempo cumprido.</p>
                  <div className="silence-audio-actions">
                    <button type="button" className="mini-action" onClick={handlePlayMantra} disabled={!audioPlayback.enabled || audioPlayback.isAudioPlaying || timerStatus === 'complete'}>Tocar mantra</button>
                    <button type="button" className="mini-action" onClick={handlePauseMantra} disabled={!audioPlayback.isAudioPlaying}>Pausar áudio</button>
                    <button type="button" className={audioPlayback.muted ? 'mini-action active' : 'mini-action'} onClick={handleToggleSound} disabled={!audioPlayback.enabled} aria-pressed={!audioPlayback.muted}>Som</button>
                  </div>
                  {audioNotice && <small className="silence-audio-notice">{audioNotice}</small>}
                </div>
              </D7PulseTimer>
            </div>
          </section>
        )}

        {step === 'breath-complete' && (
          <section key="breath-complete" className="card-stage playable-stage" aria-labelledby="breath-complete-title">
            <article className="revealed-card">
              <span className="overline">Respiração concluída</span>
              <div className="revealed-card__glyph" aria-hidden="true">△</div>
              <h3 id="breath-complete-title">Ritmo registrado</h3>
              <p>A sessão de respiração terminou. Volte para escolher outra experiência ou siga para a meditação.</p>
              <div className="playable-actions">
                <button type="button" className="primary-action" onClick={() => onNavigate?.('meditacao')}>Seguir para meditação</button>
                <button type="button" className="ghost-action" onClick={() => onNavigate?.('home')}>Voltar à Home</button>
              </div>
            </article>
          </section>
        )}

        {step === 'word' && (
          <section key="word" className="word-stage playable-stage" aria-labelledby="word-stage-title">
            <div className="word-orb" aria-hidden="true">?</div>
            <form className="playable-word-form" onSubmit={handleRecordWord}>
              <span className="overline">Palavra final</span>
              <h3 id="word-stage-title">Qual palavra ficou depois do silêncio?</h3>
              <input
                className={word.trim() ? 'has-value' : ''}
                value={word}
                onChange={(event) => { setWord(event.target.value); if (event.target.value.trim()) setWordAttempted(false) }}
                placeholder="ex: foco, luz, paz"
                aria-invalid={wordAttempted && !word.trim()}
                aria-describedby={wordAttempted && !word.trim() ? 'practice-word-alert' : undefined}
                autoFocus
              />
              {wordAttempted && !word.trim() && <small id="practice-word-alert" className="playable-word-alert" role="alert">Digite uma palavra para registrar sua reflexão.</small>}
              <button type="submit" className="primary-action" disabled={completionSubmittedRef.current}>Registrar palavra</button>
            </form>
          </section>
        )}

        {step === 'card' && (
          <section key="card" className="card-stage playable-stage" aria-labelledby="card-stage-title">
            <article className="revealed-card">
              <span className="overline">Carta revelada</span>
              <p className="revealed-card__intro">Uma marca simbólica registrou sua constância.</p>
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
            <div className="level-ring" aria-hidden="true"><span>{t('practice.level')} {currentLevel}</span></div>
            <div className="level-copy">
              <span className="overline">{t('practice.completedEyebrow')}</span>
              <h3 id="level-stage-title">{summary?.firstPhaseCompleted ? t('practice.firstPhaseComplete') : t('practice.ritualComplete')}</h3>
              {summary?.firstPhaseCompleted && <p className="medal-copy">{t('practice.honorMedalCopy')}</p>}
              <div className="practice-completion-banner">
                <div>
                  <span>{t('practice.completedCode')}</span>
                  <strong>{summary?.completedCode ?? journeyCode}</strong>
                </div>
                <div>
                  <span>{t('practice.finalWord')}</span>
                  <strong>{summary?.finalWord ?? t('practice.wordSaved')}</strong>
                </div>
                <small>Sua palavra entrou no Diário de Palavras.</small>
                <p>{t('practice.successPhrase')}</p>
              </div>
              <div className="reward-highlight-grid" aria-label={t('practice.rewardsLabel')}>
                <article><span>{t('topbar.xp')}</span><strong>+{summary?.xpGained ?? 0}</strong></article>
                <article><span>{t('topbar.sparks')}</span><strong>+{summary?.sparksGained ?? 0}</strong></article>
                <article><span>D7T</span><strong>+{summary?.d7tGained ?? 0}</strong></article>
                <article><span>{t('practice.advance')}</span><strong>{summary?.nextCode ?? nextJourneyCode}</strong></article>
              </div>
              <div className="retention-grid retention-grid--final">
                {retentionPromise && (
                  <article className="retention-card retention-card--promise">
                    <div className="retention-card__head">
                      <span className="overline">{t('core.retention.promise.eyebrow')}</span>
                      <strong>{t('core.retention.promise.title')}</strong>
                    </div>
                    <p className="retention-card__lead">{retentionPromise.daysRemainingToPortal === 0 ? t('core.retention.promise.portalOpen') : retentionPromise.daysRemainingToPortal === 1 ? t('core.retention.promise.oneDay').replace('{portal}', retentionPromise.portalName) : t('core.retention.promise.daysLeft').replace('{days}', retentionPromise.daysRemainingToPortal).replace('{portal}', retentionPromise.portalName)}</p>
                    <div className="retention-code-row">
                      <div>
                        <span>{t('core.retention.promise.current')}</span>
                        <strong>{retentionPromise.currentCode} · {retentionPromise.currentStageName}</strong>
                      </div>
                      <div>
                        <span>{t('core.retention.promise.next')}</span>
                        <strong>{retentionPromise.nextCode} · {retentionPromise.nextStageName}</strong>
                      </div>
                    </div>
                    <SegmentMeter value={retentionPromise.portalProgress} max={retentionPromise.portalMax} label={t('core.retention.promise.progressLabel')} />
                    <div className="retention-meta">
                      <span>{t('core.retention.portal.states.' + retentionPromise.portalStateKey)}</span>
                      <span>{retentionPromise.portalProgress}/{retentionPromise.portalMax}</span>
                    </div>
                    <small>{t('core.retention.promise.prompt')}</small>
                  </article>
                )}
                {presenceFlame && (
                  <article className="retention-card retention-card--flame">
                    <div className="retention-card__icon" aria-hidden="true">{presenceFlame.symbol}</div>
                    <div className="retention-card__head">
                      <span className="overline">{t('core.retention.flame.eyebrow')}</span>
                      <strong>{t('core.retention.flame.title')}</strong>
                    </div>
                    <p className="retention-card__lead">{t(`core.retention.flame.states.${presenceFlame.id}`)}</p>
                    <div className="retention-code-row">
                      <div>
                        <span>{t('core.retention.flame.sequence')}</span>
                        <strong>{presenceFlame.streak} {t('practice.days')}</strong>
                      </div>
                      <div>
                        <span>{t('core.retention.flame.next')}</span>
                        <strong>{Math.max(0, presenceFlame.nextMilestone - presenceFlame.streak)} {t('practice.days')}</strong>
                      </div>
                    </div>
                    <div className="progress-line" aria-hidden="true"><i style={{ width: String(Math.min(100, Math.max(0, presenceFlame.progressPercent || 0))) + '%' }} /></div>
                    <small>{t('core.retention.flame.milestones.' + presenceFlame.nextMilestoneKey)}</small>
                  </article>
                )}
                {livingPortal && (
                  <article className="retention-card retention-card--portal">
                    <div className="retention-card__icon" aria-hidden="true">{livingPortal.portalSeal}</div>
                    <div className="retention-card__head">
                      <span className="overline">{t('core.retention.portal.eyebrow')}</span>
                      <strong>{t('core.retention.portal.title')}</strong>
                    </div>
                    <p className="retention-card__lead">{livingPortal.portalPhrase}</p>
                    <div className="retention-code-row">
                      <div>
                        <span>{t('core.retention.portal.current')}</span>
                        <strong>{livingPortal.currentCode}</strong>
                      </div>
                      <div>
                        <span>{t('core.retention.portal.next')}</span>
                        <strong>{livingPortal.nextCode}</strong>
                      </div>
                    </div>
                    <SegmentMeter value={livingPortal.completedInStage} max={livingPortal.totalSegments} label={t('core.retention.portal.progressLabel')} />
                    <div className="retention-meta">
                      <span>{t('core.retention.portal.states.' + livingPortal.id)}</span>
                      <span>{livingPortal.completedInStage}/{livingPortal.totalSegments}</span>
                    </div>
                    <small>{livingPortal.daysRemainingToPortal === 0 ? t('core.retention.portal.open') : t('core.retention.portal.filling').replace('{days}', livingPortal.daysRemainingToPortal)}</small>
                  </article>
                )}
                <article className="retention-card retention-card--continuity">
                  <div className="retention-card__head">
                    <span className="overline">{t('core.retention.continuity.eyebrow')}</span>
                    <strong>{t('core.retention.continuity.title')}</strong>
                  </div>
                  <p className="retention-card__lead">{t('core.retention.continuity.lead')}</p>
                  <div className="retention-code-row">
                    <div>
                      <span>{t('core.retention.continuity.streak')}</span>
                      <strong>{presenceFlame?.streak ?? 0} {t('practice.days')}</strong>
                    </div>
                    <div>
                      <span>{t('core.retention.continuity.nextMilestone')}</span>
                      <strong>{presenceFlame ? t('core.retention.flame.milestones.' + presenceFlame.nextMilestoneKey) : '-'}</strong>
                    </div>
                  </div>
                  <div className="retention-meta">
                    <span>{t('core.retention.continuity.portal').replace('{days}', livingPortal?.daysRemainingToPortal ?? 0)}</span>
                    <span>{t('core.retention.continuity.message')}</span>
                  </div>
                  <small>{t('core.retention.continuity.note')}</small>
                </article>
              </div>
              <div className="level-grid">
                <article><span>{t('practice.day')}</span><strong>{summary?.dayNumber ?? officialJourney?.dayNumber}/{summary?.totalDays ?? 35}</strong><small>{summary?.progressPercent ?? officialJourney?.progressPercent}%</small></article>
                <article><span>Streak</span><strong>{state.progress?.streak ?? 0}</strong><small>{t('practice.days')}</small></article>
                <article><span>{t('practice.resets')}</span><strong>{summary?.resets ?? state.progress?.resets ?? 0}</strong><small>{t('practice.historyPreserved')}</small></article>
                <article><span>{t('practice.medal')}</span><strong>{summary?.honorMedalUnlocked ? t('practice.honor') : t('practice.pending')}</strong><small>{t('practice.firstPhase')}</small></article>
              </div>
              <article className="practice-next-step">
                <span className="overline">{t('practice.nextStep')}</span>
                <strong>{summary?.nextCode && !summary?.firstPhaseCompleted ? 'Amanhã você continua em ' + summary.nextCode + '.' : summary?.nextUnlock?.title ?? nextUnlock?.title ?? t('practice.returnTomorrow')}</strong>
                <p>{summary?.nextUnlock?.text ?? nextUnlock?.text ?? t('practice.returnTomorrowText')}</p>
              </article>
              {completionUnlocks.length > 0 && <div className="unlock-feed" aria-live="polite">{completionUnlocks.map((item) => <span key={item}>{item}</span>)}</div>}
              <div className="playable-actions">
                <button type="button" className="primary-action" onClick={() => onNavigate?.('jornada')}>{t('practice.goJourney')}</button>
                <button type="button" className="ghost-action" onClick={() => onNavigate?.('home')}>{t('practice.backHome')}</button>
                <button type="button" className="ghost-action" onClick={handlePracticeAgain}>{t('practice.practiceAgain')}</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  )
}
