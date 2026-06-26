import { useEffect, useState } from 'react'
import { codexCards, dualBridges, hebrewLetters, hebrewWords, sanskritItems } from './data/codex.js'
import { dayPhrases, missions, navItems, portals, weeks } from './data/game.js'
import {
  cardById,
  completePractice,
  ensureToday,
  getJourneyCode,
  getStage,
  missionStatus,
  openPortal,
  playerLevel,
  recordVisit,
  recordWord,
  studyCard,
} from './utils/gameState.js'
import { getCurrentUser, loginUser, logout, registerUser } from './services/localAuth.js'
import { copyLocalReport, downloadLocalReport } from './services/localReports.js'
import { sealDefinitions } from './data/seals.js'
import { cancelSealAttempt, completeSealChallenge, getRankingScore, getRequiredGateScore, getSealAttempt, getSealGateScore, getSealStatus, requirementText, startSealAttempt, syncSealAttempt, markSealAbsence } from './services/sealEngine.js'
import { getAllLocalSummaries, getUserState, localRanking, migrateLegacyProgressIfSafe, resetUserProgress, saveUserProgress } from './services/localProgress.js'
import D7SymbolicMap from './components/D7SymbolicMap.jsx'
import { saveSymbolicMap, tokenTotalsByOrigin } from './services/d7MapStorage.js'
import './App.css'

const visualAssets = {
  hero: '/images/d7/heroes/hero-codice-dual.svg',
  practice: '/images/d7/fundos/fundo-pratica-nada.svg',
  codex: '/images/d7/codice/codice-dual-d7.svg',
  sealD7: '/images/d7/simbolos/selo-d7.svg',
  ranking: '/images/d7/simbolos/selo-ranking.svg',
  cycle: '/images/d7/simbolos/selo-ciclo-completo.svg',
}

const portalArtById = {
  'portal-a': '/images/d7/portais/portal-a-chamado.svg',
  'portal-b': '/images/d7/portais/portal-b-permanencia.svg',
  'portal-c': '/images/d7/portais/portal-c-observacao.svg',
  'portal-d': '/images/d7/portais/portal-d-ciclo-completo.svg',
}

const codexFeaturedCards = [
  { id: 'card-alef', title: 'Alef', image: '/images/d7/cartas/carta-alef.svg' },
  { id: 'card-om', title: 'Om', image: '/images/d7/cartas/carta-om.svg' },
  { id: 'card-ruach-prana', title: 'Ruach Prana', image: '/images/d7/cartas/carta-ruach-prana.svg' },
  { id: 'card-emet-dhyana', title: 'Emet Dhyana', image: '/images/d7/cartas/carta-emet-dhyana.svg' },
]

const appNavItems = [...navItems, { id: 'acompanhamento', label: 'Acompanhamento', icon: '▣' }]

function Sigil({ label = 'D7', tone = 'cyan' }) {
  return (
    <div className={`sigil-mark ${tone}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" role="presentation">
        <circle cx="50" cy="50" r="42" />
        <path d="M50 8 L82 50 L50 92 L18 50 Z" />
        <path d="M22 50 H78 M50 22 V78" />
      </svg>
      <span>{label}</span>
    </div>
  )
}

function SectionTitle({ eyebrow, title, children }) {
  return (
    <div className="section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  )
}

function StatCard({ label, value, detail }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function ProgressLine({ value, max, label = 'Progresso' }) {
  const width = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <span className="progress-line" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax={max} aria-valuenow={value}>
      <i style={{ width: `${width}%` }} aria-hidden="true" />
    </span>
  )
}

function SymbolCard({ card, unlocked, studied, onStudy, hint }) {
  return (
    <article className={`symbol-card ${unlocked ? 'unlocked' : 'locked'}`}>
      <div className="symbol-top">
        <span>{card.kind}</span>
        <strong>{card.value ? card.value : card.track}</strong>
      </div>
      <div className="glyph">{unlocked ? card.symbol : '✧'}</div>
      <h3>{unlocked ? card.transliteration : 'Carta selada'}</h3>
      <p>{unlocked ? `${card.meaning}. ${card.explanation}` : hint}</p>
      {unlocked && <small>Uso no jogo: {card.gameUse}</small>}
      {unlocked && <button type="button" className="mini-action" onClick={() => onStudy(card.id)}>{studied ? 'Revisar carta' : 'Estudar carta'}</button>}
    </article>
  )
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}



function cardUnlockHint(card) {
  const hints = {
    'he-alef': 'Requer: Código Alef-Om.',
    'sa-om': 'Requer: Código Alef-Om ou primeira prática.',
    'hw-or': 'Requer: Código Or-Śānti.',
    'sa-shanti': 'Requer: Código Or-Śānti.',
    'hw-ruach': 'Requer: Código Ruach-Prāṇa + 2 práticas.',
    'sa-prana': 'Requer: Código Ruach-Prāṇa + 2 práticas.',
    'hw-emet': 'Requer: Código Emet-Dhyāna.',
    'sa-dhyana': 'Requer: Código Emet-Dhyāna.',
    'he-zayin': 'Requer: Selo D7.',
    'he-mem': 'Requer: Selo do Retorno.',
    'he-shin': 'Requer: Selo da Permanência.',
    'he-tav': 'Requer: Selo do Ciclo Completo.',
  }
  return hints[card.id] ?? 'Desbloqueie concluindo práticas, selos e desafios do Códice.'
}

function sealStatusLabel(status) {
  return {
    locked: 'Bloqueado',
    cooldown: 'Em cooldown',
    available: 'Disponível',
    running: 'Em andamento',
    challenge_pending: 'Desafio pendente',
    unlocked: 'Desbloqueado',
    failed: 'Falhou por ausência',
  }[status] ?? 'Bloqueado'
}

function SealRoom({ state, activeSealId, challengeValue, sealMessage, tick, onSelectSeal, onStartSeal, onCancelSeal, onChallengeChange, onCompleteChallenge }) {
  const gateScore = getSealGateScore(state)
  const activeSeal = sealDefinitions.find((seal) => seal.id === activeSealId) ?? sealDefinitions[0]
  const activeAttempt = getSealAttempt(state, activeSeal.id)
  const remaining = activeAttempt?.status === 'running' ? Math.max(0, Math.ceil((new Date(activeAttempt.expectedEndAt).getTime() - tick) / 1000)) : 0
  const activeStatus = getSealStatus(state, activeSeal)

  return (
    <section className="seal-room" aria-labelledby="seal-room-title">
      <div className="seal-room-head">
        <div>
          <span className="overline">Sala dos Selos</span>
          <h3 id="seal-room-title">Chaves, desafios e D7 Tokens</h3>
          <p>D7T é token simbólico interno do MVP. Não possui valor financeiro, saque, venda ou transferência.</p>
        </div>
        <div className="token-pill"><strong>{state.tokenBalance ?? 0}</strong><span>D7T</span></div>
      </div>
      <div className="seal-grid">
        {sealDefinitions.map((seal) => {
          const status = getSealStatus(state, seal)
          return (
            <button key={seal.id} type="button" className={activeSeal.id === seal.id ? 'seal-card active' : `seal-card ${status}`} onClick={() => onSelectSeal(seal.id)}>
              <span>{sealStatusLabel(status)}</span>
              <strong>{seal.name}</strong>
              <small>{seal.durationSeconds / 60} min · +{seal.rewardTokens} D7T</small>
              <em>Presença {gateScore}/{getRequiredGateScore(seal.order)}</em>
            </button>
          )
        })}
      </div>
      <article className="seal-detail-panel">
        <div className="seal-detail-main">
          <span className={`seal-state ${activeStatus}`}>{sealStatusLabel(activeStatus)}</span>
          <h3>{activeSeal.name}</h3>
          <p>{activeSeal.description}</p>
          <div className="seal-rewards">
            <span>{activeSeal.durationSeconds / 60} min</span>
            <span>+{activeSeal.rewardXp} XP</span>
            <span>+{activeSeal.rewardSparks} Centelhas</span>
            <span>+{activeSeal.rewardRankingPoints} ranking</span>
            <span>+{activeSeal.rewardTokens} D7T</span>
          </div>
          <p className="seal-requirement">Requisito: {requirementText(state, activeSeal)}</p>
          <p className="seal-requirement">Pontuação de presença: {gateScore} / {getRequiredGateScore(activeSeal.order)}</p>
          {sealMessage && <div className={`auth-message ${sealMessage.type}`} role="status">{sealMessage.text}</div>}
        </div>
        <div className="seal-challenge-panel">
          <div className="seal-timer" role="timer" aria-live="polite">{formatTime(remaining || activeSeal.durationSeconds)}</div>
          {activeAttempt?.status === 'running' && <p>O selo exige presença ativa. Volte para concluir com integridade.</p>}
          {activeStatus === 'available' || activeStatus === 'failed' ? <button type="button" className="primary-action" onClick={() => onStartSeal(activeSeal.id)}>Iniciar selo</button> : null}
          {activeAttempt?.status === 'running' && <button type="button" className="ghost-action" onClick={() => onCancelSeal(activeSeal.id)}>Cancelar tentativa</button>}
          {activeAttempt?.status === 'challenge_pending' && (
            <div className="seal-challenge-form">
              <label htmlFor="seal-challenge">{activeSeal.challengePrompt}</label>
              {activeSeal.challengeType === 'choice' ? (
                <select id="seal-challenge" value={challengeValue} onChange={(event) => onChallengeChange(event.target.value)}>
                  <option value="">Selecione</option>
                  {activeSeal.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : activeSeal.challengeType === 'practice_done' || activeSeal.challengeType === 'active_tab' ? (
                <p className="seal-requirement">{activeSeal.challengePrompt}</p>
              ) : (
                <textarea id="seal-challenge" value={challengeValue} onChange={(event) => onChallengeChange(event.target.value)} rows="4" />
              )}
              <button type="button" className="complete-action" onClick={() => onCompleteChallenge(activeSeal.id)}>Concluir desafio</button>
            </div>
          )}
          {activeStatus === 'unlocked' && <button type="button" className="mini-action" disabled>Selo desbloqueado</button>}
          {['locked', 'cooldown'].includes(activeStatus) && <button type="button" className="mini-action" disabled>{activeStatus === 'cooldown' ? 'Aguardando integração' : 'Ver requisito'}</button>}
        </div>
      </article>
    </section>
  )
}

function AuthScreen({ mode, message, onModeChange, onLogin, onRegister }) {
  const [loginData, setLoginData] = useState({ login: '', password: '' })
  const [registerData, setRegisterData] = useState({ name: '', login: '', password: '', confirmPassword: '' })
  const isRegister = mode === 'register'

  function updateLogin(field, value) {
    setLoginData((current) => ({ ...current, [field]: value }))
  }

  function updateRegister(field, value) {
    setRegisterData((current) => ({ ...current, [field]: value }))
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout" aria-label="Acesso local do D7">
        <figure className="auth-visual">
          <img
            src="/images/d7/login/login-hexagrama-d7.png"
            alt="D7: Jornada gamer de foco, presença e símbolos vivos"
          />
          <figcaption>
            <span className="overline">Portal visual do D7</span>
            <h2>Uma jornada gamer de foco, presença e símbolos vivos.</h2>
            <p>Desperte o código interior. Atravesse portais, conquiste presença e transforme consciência em poder.</p>
          </figcaption>
        </figure>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-brand">
            <Sigil label="D7" />
            <div>
              <span className="overline">Acesso local MVP</span>
              <h1 id="auth-title">D7: O Jogo da Consciência</h1>
            </div>
          </div>
          <p className="auth-lead">Uma jornada gamer de foco, presença e símbolos vivos.</p>
          <p className="auth-sublead">Desperte o código interior. Atravesse portais, conquiste presença e transforme consciência em poder.</p>
          <p className="auth-warning">Login local apenas para demonstração neste navegador. Não use senhas pessoais reais; para vários dispositivos será necessário backend futuro.</p>
          {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}

          {!isRegister ? (
            <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onLogin(loginData) }}>
              <label htmlFor="login-id">Apelido ou e-mail local</label>
              <input id="login-id" value={loginData.login} onChange={(event) => updateLogin('login', event.target.value)} autoComplete="username" />
              <label htmlFor="login-password">Senha</label>
              <input id="login-password" type="password" value={loginData.password} onChange={(event) => updateLogin('password', event.target.value)} autoComplete="current-password" />
              <button type="submit" className="primary-action">Entrar</button>
              <button type="button" className="ghost-action" onClick={() => onModeChange('register')}>Criar nova conta local</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onRegister(registerData) }}>
              <label htmlFor="register-name">Nome do usuário</label>
              <input id="register-name" value={registerData.name} onChange={(event) => updateRegister('name', event.target.value)} autoComplete="name" />
              <label htmlFor="register-login">Apelido ou e-mail local</label>
              <input id="register-login" value={registerData.login} onChange={(event) => updateRegister('login', event.target.value)} autoComplete="username" />
              <label htmlFor="register-password">Senha</label>
              <input id="register-password" type="password" value={registerData.password} onChange={(event) => updateRegister('password', event.target.value)} autoComplete="new-password" />
              <label htmlFor="register-confirm">Confirmar senha</label>
              <input id="register-confirm" type="password" value={registerData.confirmPassword} onChange={(event) => updateRegister('confirmPassword', event.target.value)} autoComplete="new-password" />
              <button type="submit" className="primary-action">Criar conta</button>
              <button type="button" className="ghost-action" onClick={() => onModeChange('login')}>Voltar ao login</button>
            </form>
          )}
        </section>
      </section>
      <ClosingMantra />
    </main>
  )
}

function UserProfileBar({ user, onLogout }) {
  return (
    <div className="user-profile-bar" aria-label="Sessão local atual">
      <div>
        <span className="overline">Usuário local</span>
        <strong>{user.name}</strong>
        <small>{user.login}</small>
      </div>
      <button type="button" className="ghost-action" onClick={onLogout}>Sair</button>
    </div>
  )
}

function LocalProgressPanel({ currentUserId, message, onCopyReport, onDownloadReport }) {
  const summaries = getAllLocalSummaries()
  return (
    <section className="content-section local-panel">
      <SectionTitle eyebrow="Acompanhamento Local" title="Relatório Local D7">Este painel mostra apenas contas e progresso salvos neste navegador/dispositivo. Não é banco de dados remoto.</SectionTitle>
      <div className="report-actions">
        <button type="button" className="primary-action" onClick={onCopyReport}>Copiar relatório</button>
        <button type="button" className="ghost-action" onClick={onDownloadReport}>Exportar JSON</button>
      </div>
      {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}
      <div className="local-user-grid">
        {summaries.map((summary) => (
          <article key={summary.user.id} className={summary.user.id === currentUserId ? 'local-user-card current-local-user' : 'local-user-card'}>
            <div className="local-user-head">
              <div>
                <span>{summary.user.id === currentUserId ? 'Sessão atual' : 'Usuário local'}</span>
                <h3>{summary.user.name}</h3>
                <p>{summary.user.login}</p>
              </div>
              <strong>{summary.currentStage}</strong>
            </div>
            <div className="local-metrics">
              <span>{summary.xp} XP</span>
              <span>{summary.sparks} Centelhas</span>
              <span>{summary.streak} dias</span>
              <span>{summary.completedPractices} práticas</span>
              <span>{summary.unlockedSeals.length} selos</span>
              <span>{summary.tokenBalance} D7T</span>
              <span>{summary.score} score</span>
              <span>{summary.symbolicMapsCount ?? 0} mapas</span>
            </div>
            <p>Última prática: {summary.lastPracticeDate ?? 'sem registro'} · Último selo: {summary.lastSealId ?? 'pendente'} · Último mapa: {summary.lastMapArchetype ?? 'pendente'}</p>
            <small>Cartas: {summary.cards.length} · Desafios: {summary.completedChallenges.length} · Presença: {summary.gateScore} · Tempo em selos: {Math.floor(summary.totalSealFocusSeconds / 60)} min · Avisos: {summary.integrityWarnings}</small>
          </article>
        ))}
        {summaries.length === 0 && <p className="empty-state">Nenhum usuário local cadastrado neste navegador.</p>}
      </div>
    </section>
  )
}

function ClosingMantra() {
  return (
    <footer className="closing-mantra" aria-label="Epígrafe final do D7">
      <p>Indu declara a Kyara</p>
      <p>Além do Véu da Madrugada</p>
      <p>A Luz permanece acesa.</p>
      <p>Além do nome e da distância.</p>
      <p>As almas recordam a sua origem.</p>
    </footer>
  )
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const [authMode, setAuthMode] = useState('login')
  const [authMessage, setAuthMessage] = useState(null)
  const [panelMessage, setPanelMessage] = useState(null)
  const [activeView, setActiveView] = useState('home')
  const [state, setState] = useState(() => {
    const user = getCurrentUser()
    return user ? getUserState(user) : ensureToday(getUserState(null))
  })
  const [timer, setTimer] = useState(() => {
    const user = getCurrentUser()
    const loaded = user ? getUserState(user) : ensureToday(getUserState(null))
    const loadedStage = getStage(loaded.progress)
    return { journeyCode: getJourneyCode(loaded.progress), remaining: loadedStage.minutes * 60, status: 'idle' }
  })
  const [word, setWord] = useState('')
  const [activeSealId, setActiveSealId] = useState(sealDefinitions[0].id)
  const [challengeValue, setChallengeValue] = useState('')
  const [sealMessage, setSealMessage] = useState(null)
  const [tick, setTick] = useState(() => Date.now())

  const stage = getStage(state.progress)
  const journeyCode = getJourneyCode(state.progress)
  const totalSeconds = stage.minutes * 60
  const timerSynced = timer.journeyCode === journeyCode
  const remaining = timerSynced ? Math.min(timer.remaining, totalSeconds) : totalSeconds
  const timerStatus = timerSynced ? timer.status : 'idle'
  const timerProgress = Math.round(((totalSeconds - remaining) / totalSeconds) * 100)
  const hebrewUnlocked = state.unlockedCards.filter((id) => cardById(id)?.track === 'hebraica').length
  const sanskritUnlocked = state.unlockedCards.filter((id) => cardById(id)?.track === 'sânscrita').length
  const currentScore = getRankingScore(state)
  const phrase = dayPhrases[(state.progress.day - 1) % dayPhrases.length]
  const rank = localRanking(currentUser?.id)

  useEffect(() => {
    if (currentUser) saveUserProgress(currentUser.id, state)
  }, [currentUser, state])

  useEffect(() => {
    if (timerStatus !== 'running') return undefined
    const interval = setInterval(() => {
      setTimer((current) => {
        const activeTimer = current.journeyCode === journeyCode ? current : { journeyCode, remaining: totalSeconds, status: 'running' }
        if (activeTimer.remaining <= 1) return { ...activeTimer, remaining: 0, status: 'complete' }
        return { ...activeTimer, remaining: activeTimer.remaining - 1 }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [journeyCode, timerStatus, totalSeconds])

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now())
      setState((current) => syncSealAttempt(current, activeSealId))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSealId])

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        setState((current) => {
          const attempt = getSealAttempt(current, activeSealId)
          if (!attempt || attempt.status !== 'running') return current
          return {
            ...current,
            sealProgress: {
              ...current.sealProgress,
              attempts: {
                ...current.sealProgress.attempts,
                [activeSealId]: { ...attempt, visibilityLostAt: new Date().toISOString() },
              },
            },
          }
        })
        return
      }
      setState((current) => {
        const attempt = getSealAttempt(current, activeSealId)
        if (!attempt?.visibilityLostAt) return current
        const seconds = Math.round((Date.now() - new Date(attempt.visibilityLostAt).getTime()) / 1000)
        return markSealAbsence(current, activeSealId, seconds)
      })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [activeSealId])

  function enterUser(user, successMessage) {
    const migration = migrateLegacyProgressIfSafe(user)
    const loaded = getUserState(user)
    setCurrentUser(user)
    setState(loaded)
    setTimer({ journeyCode: getJourneyCode(loaded.progress), remaining: getStage(loaded.progress).minutes * 60, status: 'idle' })
    setActiveView('home')
    setAuthMessage({ type: 'success', text: migration.migrated ? `${successMessage} Progresso anônimo antigo migrado com segurança.` : successMessage })
  }

  async function handleLogin(credentials) {
    const result = await loginUser(credentials)
    if (!result.ok) {
      setAuthMessage({ type: 'error', text: result.message })
      return
    }
    enterUser(result.user, result.message)
  }

  async function handleRegister(data) {
    const result = await registerUser(data)
    if (!result.ok) {
      setAuthMessage({ type: 'error', text: result.message })
      return
    }
    enterUser(result.user, result.message)
  }

  function handleLogout() {
    logout()
    setCurrentUser(null)
    setAuthMode('login')
    setAuthMessage({ type: 'success', text: 'Sessão local encerrada. O progresso não foi apagado.' })
  }

  async function handleCopyReport() {
    const result = await copyLocalReport()
    setPanelMessage({ type: result.ok ? 'success' : 'error', text: result.message })
  }

  function handleDownloadReport() {
    const result = downloadLocalReport()
    setPanelMessage({ type: result.ok ? 'success' : 'error', text: result.message })
  }

  function handleSelectSeal(sealId) {
    setActiveSealId(sealId)
    setChallengeValue('')
    setSealMessage(null)
    setState((current) => syncSealAttempt(current, sealId))
  }

  function handleStartSeal(sealId) {
    setState((current) => startSealAttempt(current, sealId))
    setChallengeValue('')
    setSealMessage({ type: 'success', text: 'Selo iniciado. Mantenha presença ativa até o fim do timer.' })
  }

  function handleCancelSeal(sealId) {
    setState((current) => cancelSealAttempt(current, sealId))
    setSealMessage({ type: 'success', text: 'Tentativa cancelada sem recompensa.' })
  }

  async function handleCompleteSeal(sealId) {
    const result = await completeSealChallenge(state, currentUser.id, sealId, challengeValue)
    if (!result.ok) {
      setSealMessage({ type: 'error', text: result.message })
      return
    }
    setState(result.progress)
    setChallengeValue('')
    setSealMessage({ type: 'success', text: result.message })
  }

  function handleSaveSymbolicMap(mapResult) {
    const saved = saveSymbolicMap(state, mapResult)
    setState(saved.progress)
    return saved
  }

  function navigate(view) {
    setActiveView(view)
    setState((current) => recordVisit(current, view))
  }

  function finishPractice() {
    if (remaining > 0 || state.daily.practice) return
    setState((current) => recordVisit(completePractice(current), 'jornada'))
    setTimer({ journeyCode, remaining: totalSeconds, status: 'idle' })
    setActiveView('jornada')
  }

  function submitWord(event) {
    event.preventDefault()
    setState((current) => recordWord(current, word))
    setWord('')
  }

  function resetMvp() {
    if (!currentUser) return
    const confirmed = window.confirm('Resetar apenas o progresso deste usuário local? A conta e outros usuários não serão apagados.')
    if (!confirmed) return
    const fresh = ensureToday(resetUserProgress(currentUser))
    setState(fresh)
    setActiveView('home')
    setTimer({ journeyCode: getJourneyCode(fresh.progress), remaining: getStage(fresh.progress).minutes * 60, status: 'idle' })
  }

  function study(cardId) {
    setState((current) => studyCard(current, cardId))
  }

  if (!currentUser) {
    return <AuthScreen mode={authMode} message={authMessage} onModeChange={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-mark">
          <Sigil label="D7" />
          <div>
            <strong>Jogo da Consciência</strong>
            <small>Códice Dual V2</small>
          </div>
        </div>
        <nav className="nav-list">
          {appNavItems.map((item) => (
            <button key={item.id} className={activeView === item.id ? 'active' : ''} type="button" aria-current={activeView === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <UserProfileBar user={currentUser} onLogout={handleLogout} />

        <header className="topbar">
          <div>
            <span className="overline">Ciclo atual</span>
            <h1>{journeyCode} · {stage.name}</h1>
          </div>
          <div className="resource-strip" aria-label="Recursos do jogador">
            <span>Nv. {playerLevel(state.xp)}</span>
            <span>{state.xp} XP</span>
            <span>{state.sparks} Centelhas</span>
            <span>{currentScore} Score</span>
          </div>
        </header>

        {activeView === 'home' && (
          <section className="home-layout">
            <div className="hero-panel">
              <img className="hero-art" src={visualAssets.hero} alt="Portal visual do Códice Dual D7" />
              <div className="hero-sigils">
                <Sigil label="א" tone="gold" />
                <Sigil label="ॐ" tone="violet" />
              </div>
              <span className="overline">Códice Dual D7</span>
              <h2>Uma jornada gamer de foco, presença e símbolos vivos.</h2>
              <p>O Códice Dual é uma criação simbólica do jogo: hebraico funciona como trilha de letras, números e códigos; sânscrito funciona como trilha de sons, mantras e estados. Não é uma afirmação histórica, é uma arquitetura lúdica de contemplação.</p>
              <div className="hero-actions">
                <button type="button" className="primary-action" onClick={() => navigate('pratica')}>Entrar no Nada</button>
                <button type="button" className="ghost-action" onClick={() => navigate('codice')}>Abrir Códice</button>
              </div>
            </div>
            <div className="dashboard-stack">
              <StatCard label="Meta atual" value={`${stage.minutes} min`} detail={`${journeyCode} · ${phrase}`} />
              <StatCard label="Trilha Hebraica" value={`${hebrewUnlocked}/${hebrewLetters.length + hebrewWords.length}`} detail="letras e palavras" />
              <StatCard label="Trilha Sânscrita" value={`${sanskritUnlocked}/${sanskritItems.length}`} detail="sons, mantras e estados" />
              <div className="mission-panel compact-panel home-seal-panel">
                <div className="seal-pair" aria-hidden="true">
                  <img src={visualAssets.sealD7} alt="" />
                  <img src={visualAssets.cycle} alt="" />
                </div>
                <h3>Missões diárias</h3>
                {missions.daily.map((mission) => <MissionRow key={mission.id} mission={mission} done={missionStatus(state, mission)} />)}
              </div>
            </div>
          </section>
        )}

        {activeView === 'jornada' && (
          <section className="content-section">
            <SectionTitle eyebrow="Mapa A1-D7" title="Jornada transcendental">A duração sobe por semana. Se um dia for esquecido, a jornada retorna para A1 e registra o Selo do Retorno.</SectionTitle>
            <div className="journey-board">
              {weeks.map((week, weekIndex) => {
                const portal = portals.find((item) => item.week === week.id)
                const complete = state.progress.completedDays.includes(`${week.id}7`)
                return (
                  <article key={week.id} className="week-card" style={{ '--week': week.color }}>
                    <div className="week-head"><span>Semana {week.id}</span><strong>{week.minutes} min</strong></div>
                    <div className="portal-seal">{portal.seal}</div>
                    <img className="week-portal-art" src={portalArtById[portal.id]} alt="" />
                    <h3>{week.name}</h3>
                    <p>{week.intent}</p>
                    <div className="day-grid">
                      {Array.from({ length: 7 }, (_, index) => {
                        const day = index + 1
                        const code = `${week.id}${day}`
                        const current = weekIndex === state.progress.weekIndex && day === state.progress.day
                        const done = state.progress.completedDays.includes(code)
                        return <span key={code} className={`${current ? 'current' : ''} ${done ? 'done' : ''}`}>{code}</span>
                      })}
                    </div>
                    <ProgressLine value={Array.from({ length: 7 }, (_, index) => `${week.id}${index + 1}`).filter((day) => state.progress.completedDays.includes(day)).length} max={7} label={`Progresso da semana ${week.id}`} />
                    <button type="button" className="mini-action" disabled={!complete || state.openedPortals.includes(portal.id)} onClick={() => setState((current) => openPortal(current, portal.id))}>
                      {state.openedPortals.includes(portal.id) ? 'Portal aberto' : complete ? 'Abrir portal' : 'Portal selado'}
                    </button>
                  </article>
                )
              })}
            </div>
            <div className="portal-grid">
              {portals.map((portal) => (
                <article key={portal.id} className={`portal-card ${state.openedPortals.includes(portal.id) ? 'open' : ''}`}>
                  <div className="portal-icon">{portal.seal}</div>
                  <img className="portal-card-art" src={portalArtById[portal.id]} alt="" />
                  <h3>{portal.name}</h3>
                  <p>{portal.phrase}</p>
                  <small>{portal.reward}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'pratica' && (
          <section className="practice-layout">
            <div className="timer-panel">
              <img className="practice-bg-art" src={visualAssets.practice} alt="" />
              <SectionTitle eyebrow={`${journeyCode} · modo Nada`} title="Fechar os olhos. Permanecer. Concluir.">{phrase}</SectionTitle>
              <div className="timer-orb" style={{ '--progress': `${timerProgress}%`, '--stage': stage.color }} role="timer" aria-live="polite" aria-label={`Tempo restante ${formatTime(remaining)}`}>
                <span>{formatTime(remaining)}</span>
                <small>{state.daily.practice ? 'prática de hoje concluída' : timerStatus === 'running' ? 'em prática' : timerStatus === 'complete' ? 'portal interno aberto' : 'aguardando entrada'}</small>
              </div>
              <div className="timer-controls">
                <button type="button" className="primary-action" onClick={() => setTimer({ journeyCode, remaining, status: 'running' })} disabled={state.daily.practice || timerStatus === 'running' || remaining === 0}>Iniciar</button>
                <button type="button" className="ghost-action" onClick={() => setTimer({ journeyCode, remaining, status: 'paused' })} disabled={timerStatus !== 'running'}>Pausar</button>
                <button type="button" className="ghost-action" onClick={() => setTimer({ journeyCode, remaining: totalSeconds, status: 'idle' })} disabled={state.daily.practice}>Reiniciar</button>
                <button type="button" className="complete-action" onClick={finishPractice} disabled={remaining > 0 || state.daily.practice}>{state.daily.practice ? 'Prática registrada' : 'Concluir prática'}</button>
              </div>
              {state.lastUnlocks.length > 0 && <div className="unlock-feed" aria-live="polite">{state.lastUnlocks.map((item) => <span key={item}>{item}</span>)}</div>}
            </div>
            <aside className="ritual-panel">
              <h3>Meta ritual</h3>
              <p>{stage.intent}</p>
              <div className="reward-preview">
                <span>Recompensa prevista</span>
                <strong>+{45 + stage.minutes * 20} XP</strong>
                <strong>+{4 + stage.minutes} Centelhas</strong>
              </div>
              <form className="word-form" onSubmit={submitWord}>
                <label htmlFor="word">Registrar palavra</label>
                <div>
                  <input id="word" value={word} onChange={(event) => setWord(event.target.value)} placeholder="ex: foco, luz, paz" />
                  <button type="submit" className="mini-action">Gravar</button>
                </div>
              </form>
            </aside>
          </section>
        )}

        {activeView === 'codice' && (
          <section className="content-section">
            <SectionTitle eyebrow="Biblioteca simbólica" title="Códice Dual D7">Hebraico e sânscrito aparecem como trilhas simbólicas distintas dentro do jogo, unidas por pontes lúdicas de presença.</SectionTitle>
            <div className="codex-visual-band">
              <img src={visualAssets.codex} alt="Símbolo central do Códice Dual D7" />
              <div className="featured-card-grid">
                {codexFeaturedCards.map((card) => (
                  <article key={card.id} className="featured-card-art">
                    <img src={card.image} alt={`Carta simbólica ${card.title}`} />
                    <span>{card.title}</span>
                  </article>
                ))}
              </div>
            </div>
            <div className="bridge-grid">
              {dualBridges.map((bridge) => <article key={bridge.id} className="bridge-card"><strong>{bridge.formula}</strong><h3>{bridge.title}</h3><p>{bridge.meaning}. {bridge.explanation}</p></article>)}
            </div>
            <D7SymbolicMap progress={state} onSaveMap={handleSaveSymbolicMap} />
            <SealRoom state={state} activeSealId={activeSealId} challengeValue={challengeValue} sealMessage={sealMessage} tick={tick} onSelectSeal={handleSelectSeal} onStartSeal={handleStartSeal} onCancelSeal={handleCancelSeal} onChallengeChange={setChallengeValue} onCompleteChallenge={handleCompleteSeal} />
            <div className="codex-layout">
              <div>
                <h3 className="subhead">Trilha Hebraica</h3>
                <div className="symbol-grid">{[...hebrewLetters, ...hebrewWords].map((card) => <SymbolCard key={card.id} card={card} unlocked={state.unlockedCards.includes(card.id)} studied={state.studiedCards.includes(card.id)} onStudy={study} hint={cardUnlockHint(card)} />)}</div>
              </div>
              <div>
                <h3 className="subhead">Trilha Sânscrita</h3>
                <div className="symbol-grid">{sanskritItems.map((card) => <SymbolCard key={card.id} card={card} unlocked={state.unlockedCards.includes(card.id)} studied={state.studiedCards.includes(card.id)} onStudy={study} hint={cardUnlockHint(card)} />)}</div>
              </div>
            </div>
          </section>
        )}

        {activeView === 'ranking' && (
          <section className="content-section">
            <SectionTitle eyebrow="Ranking local" title="Ordem de presença">Score = XP + sequência * 50 + cartas * 25 + portais * 200 + códigos * 150.</SectionTitle>
            <img className="ranking-seal-art" src={visualAssets.ranking} alt="Selo visual do ranking D7" />
            <div className="ranking-list">
              {rank.map((player, index) => (
                <article key={player.name} className={player.current ? 'rank-row current-player' : 'rank-row'}>
                  <strong>#{index + 1}</strong>
                  <div><span>{player.name}</span><small>{player.title}</small></div>
                  <p>{player.score} score</p>
                  <small>{player.stage ?? 'A1'} · {player.xp} XP · {player.sparks ?? 0} centelhas · {player.cards} cartas · {player.seals ?? player.portals} selos · {player.tokens ?? 0} D7T</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'perfil' && (
          <section className="profile-grid">
            <div className="profile-card">
              <Sigil label={state.profile.avatar} tone="gold" />
              <div className="profile-seals" aria-hidden="true">
                <img src={visualAssets.sealD7} alt="" />
                <img src={visualAssets.cycle} alt="" />
              </div>
              <h2>{state.profile.name}</h2>
              <p>{state.profile.title}</p>
              <div className="profile-level">Nível {playerLevel(state.xp)}</div>
              <button type="button" className="ghost-action" onClick={resetMvp}>Resetar meu progresso</button>
            </div>
            <div className="inventory-card">
              <SectionTitle eyebrow="Perfil do jogador" title="Progressão e Selos" />
              <div className="profile-stats">
                <StatCard label="Ciclo" value={journeyCode} detail={stage.name} />
                <StatCard label="Sequência" value={state.progress.streak} detail="dias ativos" />
                <StatCard label="Cartas" value={state.unlockedCards.length} detail={`${codexCards.length} totais`} />
                <StatCard label="Missões" value={state.completedMissions.length} detail="ativas concluídas" />
                <StatCard label="Portais" value={state.openedPortals.length} detail="4 possíveis" />
                <StatCard label="Códigos" value={state.unlockedCodes.length} detail="8 possíveis" />
                <StatCard label="D7 Tokens" value={state.tokenBalance ?? 0} detail="simbólicos MVP" />
                <StatCard label="Selos" value={state.sealProgress.unlockedSeals.length} detail="8 possíveis" />
                <StatCard label="Ranking" value={currentScore} detail="score local" />
              </div>
              <p className="token-disclaimer">D7T é um token simbólico interno desta versão MVP. Não possui valor financeiro.</p>
              <div className="token-origin-grid">
                {Object.entries(tokenTotalsByOrigin(state)).map(([origin, amount]) => <span key={origin}>{origin}: {amount} D7T</span>)}
              </div>
              <div className="track-progress">
                <p>Hebraico <strong>{hebrewUnlocked}</strong></p><ProgressLine value={hebrewUnlocked} max={hebrewLetters.length + hebrewWords.length} label="Progresso da trilha hebraica" />
                <p>Sânscrito <strong>{sanskritUnlocked}</strong></p><ProgressLine value={sanskritUnlocked} max={sanskritItems.length} label="Progresso da trilha sânscrita" />
              </div>
            </div>
          </section>
        )}

        {activeView === 'acompanhamento' && (
          <LocalProgressPanel currentUserId={currentUser.id} message={panelMessage} onCopyReport={handleCopyReport} onDownloadReport={handleDownloadReport} />
        )}

        {activeView === 'circulos' && (
          <section className="content-section">
            <SectionTitle eyebrow="Círculos" title="Salas rituais locais">Protótipo visual sem backend para grupos, biblioteca simbólica e preparação de portais sociais futuros.</SectionTitle>
            <div className="circle-grid">
              {state.circles.map((circle) => (
                <article key={circle.id} className="circle-card">
                  <div className="circle-seal">{circle.seal}</div>
                  <span>{circle.pulse}</span>
                  <h3>{circle.name}</h3>
                  <p>{circle.members} membros · foco em {circle.focus}</p>
                  <button type="button" className="ghost-action">Entrar na sala</button>
                </article>
              ))}
              <article className="circle-card invite-card">
                <div className="circle-seal">✺</div>
                <span>Em breve</span>
                <h3>Portal cooperativo</h3>
                <p>Espaço reservado para círculos reais quando houver backend.</p>
                <button type="button" className="ghost-action">Preparar convite</button>
              </article>
            </div>
          </section>
        )}

        <ClosingMantra />
      </main>
    </div>
  )
}

function MissionRow({ mission, done }) {
  return (
    <div className={`mission-row ${done ? 'done' : ''}`}>
      <span>{done ? '✓' : '○'}</span>
      <p>{mission.title}</p>
      <small>{mission.reward}</small>
    </div>
  )
}

export default App
