import { useEffect, useRef, useState } from 'react'
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
import { deleteUser, getCurrentUser, getPublicUsers, loginUser, logout, registerUser, resetLocalPassword } from './services/localAuth.js'
import { copyLocalReport, downloadLocalReport } from './services/localReports.js'
import { sealDefinitions } from './data/seals.js'
import { cancelSealAttempt, completeSealChallenge, getRankingScore, getRequiredGateScore, getSealAttempt, getSealGateScore, getSealStatus, requirementText, startSealAttempt, syncSealAttempt, markSealAbsence } from './services/sealEngine.js'
import { getAllLocalSummaries, getUserState, localRanking, migrateLegacyProgressIfSafe, resetUserProgress, saveUserProgress } from './services/localProgress.js'
import D7SymbolicMap from './components/D7SymbolicMap.jsx'
import D7PulseTimer from './components/D7PulseTimer.jsx'
import D7DurationSelector from './components/D7DurationSelector.jsx'
import InitiationLibrary from './components/InitiationLibrary.jsx'
import LanguageToggle from './components/LanguageToggle.jsx'
import D7Footer from './components/D7Footer.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import D7Room from './components/D7Room.jsx'
import D7Wheel from './components/D7Wheel.jsx'
import UserAvatar from './components/UserAvatar.jsx'
import D7RadioPlayer from './components/D7RadioPlayer.jsx'
import D7MantraPlayer from './components/D7MantraPlayer.jsx'
import D7CinematicEntrance from './components/D7CinematicEntrance.jsx'
import { getLibraryStudyStats, getRecommendedLibraryCard } from './services/libraryEngine.js'
import { saveSymbolicMap, tokenTotalsByOrigin } from './services/d7MapStorage.js'
import { translate } from './i18n/translations.js'
import { getStoredLanguage, saveLanguage } from './services/languageService.js'
import { recordLocalEvent, summarizeLocalEvents } from './services/analyticsLocal.js'
import { createSecurityAlert, trackAdminEvent } from './services/adminAnalyticsService.js'
import { markPresenceInactive, updatePresence } from './services/presenceService.js'
import { getWheelEvents, spinD7Wheel } from './services/wheelService.js'
import { avatarSymbols, avatarThemes } from './data/avatarSymbols.js'
import { applyAvatarChoice, getUserAvatarProfile } from './services/avatarService.js'
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

const appNavItems = [...navItems, { id: 'biblioteca', label: 'Biblioteca', icon: '✦' }, { id: 'sala', label: 'Sala D7', icon: '◌' }, { id: 'roda', label: 'Roda D7', icon: '◍' }, { id: 'acompanhamento', label: 'Acompanhamento', icon: '▣' }, { id: 'admin', label: 'Painel Admin', icon: '▤' }]
const D7_ENTRANCE_SEEN_KEY = 'd7_entrance_seen'

function shouldShowInitialEntrance(initialUser) {
  if (initialUser) return false
  try {
    return window.localStorage.getItem(D7_ENTRANCE_SEEN_KEY) !== 'true'
  } catch {
    return true
  }
}

function markEntranceSeen() {
  try {
    window.localStorage.setItem(D7_ENTRANCE_SEEN_KEY, 'true')
  } catch {
    // LocalStorage can be unavailable in restricted browser modes.
  }
}

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

function normalizePracticeMinutes(value) {
  const number = Math.floor(Number(value) || 0)
  if (!Number.isFinite(number) || number <= 0) return 7
  return Math.min(108, Math.max(1, number))
}

function practiceRewardPreview(minutes, hasPrimaryReward) {
  const safeMinutes = normalizePracticeMinutes(minutes)
  const xp = 50 + Math.floor(safeMinutes * 2)
  const sparks = 3 + Math.floor(safeMinutes / 7)
  const d7t = safeMinutes >= 21 ? 3 : 1
  if (!hasPrimaryReward) {
    return { xp: 0, sparks: 0, d7t: 0, text: 'Prática livre: registra presença e histórico sem recompensa principal.' }
  }
  return {
    xp,
    sparks,
    d7t,
    text: safeMinutes >= 108 ? 'Prática longa com marcos simbólicos potenciais.' : safeMinutes >= 21 ? 'Portal 21 pode se abrir com presença acumulada.' : 'Prática principal do dia.',
  }
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

function SealRoom({ state, activeSealId, challengeValue, sealMessage, tick, onSelectSeal, onStartSeal, onCancelSeal, onChallengeChange, onCompleteChallenge, onCopyPhrase }) {
  const gateScore = getSealGateScore(state)
  const activeSeal = sealDefinitions.find((seal) => seal.id === activeSealId) ?? sealDefinitions[0]
  const activeAttempt = getSealAttempt(state, activeSeal.id)
  const remaining = activeAttempt?.status === 'running' ? Math.max(0, Math.ceil((new Date(activeAttempt.expectedEndAt).getTime() - tick) / 1000)) : 0
  const activeStatus = getSealStatus(state, activeSeal)
  const sealProgress = activeSeal.durationSeconds ? Math.round(((activeSeal.durationSeconds - remaining) / activeSeal.durationSeconds) * 100) : 0
  const isSealRunning = activeAttempt?.status === 'running'
  const isSealCompleted = activeStatus === 'unlocked'
  const isSealFailed = activeStatus === 'failed'
  const isChallengePending = activeAttempt?.status === 'challenge_pending'

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
          {activeSeal.challengeType === 'confirm_phrase' && (
            <div className="seal-phrase-card">
              <strong>Frase esperada</strong>
              <p>{activeSeal.requiredPhrase}</p>
              <small>O ponto final não é obrigatório. Espaços extras e maiúsculas/minúsculas serão normalizados.</small>
              <button type="button" className="mini-action" onClick={() => onCopyPhrase(activeSeal.requiredPhrase)}>Copiar frase</button>
            </div>
          )}
          <p className="seal-requirement">Pontuação de presença: {gateScore} / {getRequiredGateScore(activeSeal.order)}</p>
          {sealMessage && <div className={`auth-message ${sealMessage.type}`} role="status">{sealMessage.text}</div>}
        </div>
        <D7PulseTimer
          label="Timer Ritual D7"
          subtitle={activeSeal.name}
          hint={activeStatus === 'available' ? 'Respire e permaneça' : activeStatus === 'failed' ? 'Presença interrompida' : activeStatus === 'cooldown' ? 'Aguarde a integração' : activeSeal.challengePrompt}
          totalSeconds={activeSeal.durationSeconds}
          remainingSeconds={isSealRunning ? remaining : isSealCompleted || isChallengePending ? 0 : activeSeal.durationSeconds}
          isRunning={isSealRunning}
          isCompleted={isSealCompleted}
          isFailed={isSealFailed}
          isChallengePending={isChallengePending}
          mode="seal"
          progressPercent={isSealRunning || isChallengePending || isSealCompleted ? (isChallengePending || isSealCompleted ? 100 : sealProgress) : 0}
          currentCount={state.presenceCounter108 ?? 0}
          countTarget={108}
          onStart={['available', 'failed'].includes(activeStatus) ? () => onStartSeal(activeSeal.id) : null}
          onCancel={isSealRunning ? () => onCancelSeal(activeSeal.id) : null}
          onReset={null}
          onComplete={isChallengePending ? () => onCompleteChallenge(activeSeal.id) : null}
          completeDisabled={!isChallengePending}
          startLabel="Iniciar selo"
          cancelLabel="Cancelar tentativa"
          resetLabel="Reiniciar"
          completeLabel="Concluir desafio"
          statusText={isSealRunning ? 'O selo exige presença ativa. Volte para concluir com integridade.' : isChallengePending ? 'Timer concluído. Complete o desafio para abrir o selo.' : isSealCompleted ? 'Selo desbloqueado.' : sealStatusLabel(activeStatus)}
          ariaLabel={`Timer ritual do selo ${activeSeal.name}`}
        >
          {isChallengePending && (
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
                <>
                  <textarea id="seal-challenge" value={challengeValue} onChange={(event) => onChallengeChange(event.target.value)} rows="4" placeholder={activeSeal.challengePrompt} />
                  <small className="seal-helper">Digite a frase do desafio para concluir o selo. A pontuação final é opcional.</small>
                </>
              )}
              <button type="button" className="complete-action" onClick={() => onCompleteChallenge(activeSeal.id)}>Concluir desafio</button>
            </div>
          )}
        </D7PulseTimer>
      </article>
    </section>
  )
}

function AuthScreen({ mode, message, t, language, onLanguageChange, onModeChange, onLogin, onRegister, onResetPassword, onDeleteAccount }) {
  const [loginData, setLoginData] = useState({ login: '', password: '' })
  const [registerData, setRegisterData] = useState({ name: '', login: '', password: '', confirmPassword: '' })
  const [recoveryData, setRecoveryData] = useState({ userId: '', password: '', confirmPassword: '', deleteConfirm: '' })
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'
  const localUsers = getPublicUsers()
  const effectiveRecoveryUserId = localUsers.some((user) => user.id === recoveryData.userId) ? recoveryData.userId : (localUsers[0]?.id ?? '')
  const selectedRecoveryUser = localUsers.find((user) => user.id === effectiveRecoveryUserId) ?? null

  function updateLogin(field, value) {
    setLoginData((current) => ({ ...current, [field]: value }))
  }

  function updateRegister(field, value) {
    setRegisterData((current) => ({ ...current, [field]: value }))
  }

  function updateRecovery(field, value) {
    setRecoveryData((current) => ({ ...current, [field]: value }))
  }

  async function handleRecoverySubmit(event) {
    event.preventDefault()
    const result = await onResetPassword({
      userId: effectiveRecoveryUserId,
      password: recoveryData.password,
      confirmPassword: recoveryData.confirmPassword,
    })
    if (!result?.ok) return
    setRecoveryData({ userId: recoveryData.userId, password: '', confirmPassword: '', deleteConfirm: '' })
    onModeChange('login')
  }

  async function handleDeleteAccount() {
    if (recoveryData.deleteConfirm !== 'APAGAR') return
    const result = await onDeleteAccount(effectiveRecoveryUserId)
    if (!result?.ok) return
    setRecoveryData({ userId: '', password: '', confirmPassword: '', deleteConfirm: '' })
    onModeChange('login')
  }

  return (
    <main className="auth-shell">
      <div className="auth-language-row"><LanguageToggle language={language} onChange={onLanguageChange} /></div>
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
              <span className="overline">{t('auth.access')}</span>
              <h1 id="auth-title">{t('auth.title')}</h1>
            </div>
          </div>
          <p className="auth-lead">{t('auth.lead')}</p>
          <p className="auth-sublead">{t('auth.sublead')}</p>
          <p className="auth-warning">{t('auth.warning')}</p>
          {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}

          {!isRegister && !isForgot ? (
            <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onLogin(loginData) }}>
              <label htmlFor="login-id">{t('auth.loginLabel')}</label>
              <input id="login-id" value={loginData.login} onChange={(event) => updateLogin('login', event.target.value)} autoComplete="username" />
              <label htmlFor="login-password">{t('auth.passwordLabel')}</label>
              <input id="login-password" type="password" value={loginData.password} onChange={(event) => updateLogin('password', event.target.value)} autoComplete="current-password" />
              <button type="submit" className="primary-action">{t('auth.enter')}</button>
              <button type="button" className="ghost-action" onClick={() => onModeChange('register')}>{t('auth.createAccount')}</button>
              <button type="button" className="ghost-action" onClick={() => onModeChange('forgot')}>{t('auth.forgotPassword')}</button>
            </form>
          ) : isRegister ? (
            <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onRegister(registerData) }}>
              <label htmlFor="register-name">{t('auth.nameLabel')}</label>
              <input id="register-name" value={registerData.name} onChange={(event) => updateRegister('name', event.target.value)} autoComplete="name" />
              <label htmlFor="register-login">{t('auth.loginLabel')}</label>
              <input id="register-login" value={registerData.login} onChange={(event) => updateRegister('login', event.target.value)} autoComplete="username" />
              <label htmlFor="register-password">{t('auth.passwordLabel')}</label>
              <input id="register-password" type="password" value={registerData.password} onChange={(event) => updateRegister('password', event.target.value)} autoComplete="new-password" />
              <label htmlFor="register-confirm">{t('auth.confirmPassword')}</label>
              <input id="register-confirm" type="password" value={registerData.confirmPassword} onChange={(event) => updateRegister('confirmPassword', event.target.value)} autoComplete="new-password" />
              <button type="submit" className="primary-action">{t('auth.create')}</button>
              <button type="button" className="ghost-action" onClick={() => onModeChange('login')}>{t('auth.backLogin')}</button>
            </form>
          ) : (
            <div className="auth-recovery">
              <div className="auth-recovery-head">
                <div>
                  <span className="overline">{t('auth.recovery')}</span>
                  <h3>{t('auth.recoveryTitle')}</h3>
                  <p>Esta recuperação funciona apenas neste navegador. O D7 atual usa login local MVP. Para login real em vários dispositivos será necessário backend futuro.</p>
                </div>
                <button type="button" className="ghost-action" onClick={() => onModeChange('register')}>{t('auth.createAccount')}</button>
              </div>

              <div className="auth-warning">{localUsers.length > 0 ? 'Selecione um usuário local para redefinir a senha. O progresso permanece intacto porque o `userId` não muda.' : 'Nenhum usuário local encontrado neste navegador. Crie uma nova conta local.'}</div>

              {localUsers.length > 0 && (
                <>
                  <div className="recovery-user-list" role="list" aria-label="Usuários locais cadastrados">
                    {localUsers.map((user) => {
                      const active = user.id === effectiveRecoveryUserId
                      return (
                        <button
                          key={user.id}
                          type="button"
                          className={active ? 'recovery-user-card active' : 'recovery-user-card'}
                          onClick={() => updateRecovery('userId', user.id)}
                        >
                          <strong>{user.name}</strong>
                          <span>{user.login}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="recovery-selected">
                    <span>Usuário selecionado</span>
                    <strong>{selectedRecoveryUser?.name ?? 'Selecione um usuário'}</strong>
                    <small>{selectedRecoveryUser?.login ?? 'Nome de acesso local'}</small>
                  </div>

                  <form className="auth-form" onSubmit={handleRecoverySubmit}>
                    <label htmlFor="recovery-password">{t('auth.newPassword')}</label>
                    <input id="recovery-password" type="password" value={recoveryData.password} onChange={(event) => updateRecovery('password', event.target.value)} autoComplete="new-password" />
                    <label htmlFor="recovery-confirm">Confirmar nova senha</label>
                    <input id="recovery-confirm" type="password" value={recoveryData.confirmPassword} onChange={(event) => updateRecovery('confirmPassword', event.target.value)} autoComplete="new-password" />
                    <button type="submit" className="primary-action" disabled={!effectiveRecoveryUserId}>{t('auth.resetPassword')}</button>
                    <button type="button" className="ghost-action" onClick={() => onModeChange('login')}>{t('auth.backLogin')}</button>
                  </form>

                  <div className="recovery-delete">
                    <label htmlFor="delete-confirm">Apagar conta local</label>
                    <input id="delete-confirm" value={recoveryData.deleteConfirm} onChange={(event) => updateRecovery('deleteConfirm', event.target.value.toUpperCase())} placeholder="Digite APAGAR para confirmar" />
                    <button type="button" className="danger-action" onClick={handleDeleteAccount} disabled={recoveryData.deleteConfirm !== 'APAGAR' || !effectiveRecoveryUserId}>Apagar conta local</button>
                    <small>Isso remove apenas a conta local deste navegador. O progresso não é apagado por padrão.</small>
                  </div>
                </>
              )}

              {localUsers.length === 0 && (
                <div className="recovery-empty">
                  <p>Nenhum usuário local encontrado neste navegador.</p>
                  <button type="button" className="primary-action" onClick={() => onModeChange('register')}>Criar uma nova conta local</button>
                  <button type="button" className="ghost-action" onClick={() => onModeChange('login')}>{t('auth.backLogin')}</button>
                </div>
              )}
            </div>
          )}
        </section>
      </section>
      <D7RadioPlayer t={t} />
      <D7Footer copy={t('footer.copy')} tagline={t('footer.tagline')} />
    </main>
  )
}

function UserProfileBar({ user, progress, t, language, onLanguageChange, onLogout }) {
  return (
    <div className="user-profile-bar" aria-label="Sessão local atual">
      <UserAvatar user={user} progress={progress} showMeta />
      <div className="user-profile-actions">
        <LanguageToggle language={language} onChange={onLanguageChange} />
        <button type="button" className="ghost-action" onClick={onLogout}>{t('common.logout')}</button>
      </div>
    </div>
  )
}

function LocalProgressPanel({ currentUserId, message, onCopyReport, onDownloadReport }) {
  const summaries = getAllLocalSummaries()
  const currentSummary = summaries.find((summary) => summary.user.id === currentUserId) ?? summaries[0] ?? null
  const wheelEvents = getWheelEvents(currentUserId).slice(0, 5)
  return (
    <section className="content-section local-panel">
      <SectionTitle eyebrow="Acompanhamento Local" title="Relatório visual D7">Este painel mostra apenas contas e progresso salvos neste navegador/dispositivo. Não é banco de dados remoto.</SectionTitle>
      {currentSummary && (
        <div className="report-summary-grid">
          <article><span>Jogador</span><UserAvatar user={currentSummary.user} progress={{ profile: { name: currentSummary.user.name, avatarSymbol: currentSummary.avatarSymbol, avatarColor: currentSummary.avatarColor, avatarTitle: currentSummary.avatarTitle }, xp: currentSummary.xp }} showMeta /></article>
          <article><span>Prática</span><strong>{currentSummary.completedPractices} sessões</strong><small>{currentSummary.ritualMinutesTotal ?? 0} minutos rituais</small></article>
          <article><span>Biblioteca</span><strong>{currentSummary.libraryCardsStudied} cards</strong><small>{currentSummary.libraryTitle}</small></article>
          <article><span>Selos</span><strong>{currentSummary.unlockedSeals.length}</strong><small>{currentSummary.completedChallenges.length} desafios</small></article>
          <article><span>D7T</span><strong>{currentSummary.tokenBalance}</strong><small>token simbólico interno</small></article>
          <article><span>Roda/Sala/Eventos</span><strong>{currentSummary.score} score</strong><small>relatório local exportável</small></article>
        </div>
      )}
      <div className="report-actions">
        <button type="button" className="primary-action" onClick={onCopyReport}>Copiar relatório</button>
        <button type="button" className="ghost-action" onClick={onDownloadReport}>Exportar JSON</button>
      </div>
      <section className="wheel-report-panel" aria-labelledby="wheel-report-title">
        <h3 id="wheel-report-title">Últimos giros da Roda D7</h3>
        {wheelEvents.length === 0 && <p>Nenhum giro registrado para este usuário local.</p>}
        {wheelEvents.map((event) => (
          <article key={event.id}>
            <strong>{event.rewardLabel}</strong>
            <span>{event.costD7T > 0 ? `${event.costD7T} D7T gastos` : 'Giro gratuito'}</span>
            <small>{event.welcomeSpin ? 'Boas-vindas · ' : ''}{new Date(event.createdAt).toLocaleString('pt-BR')}</small>
          </article>
        ))}
      </section>
      {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}
      <div className="local-user-grid">
        {summaries.map((summary) => (
          <article key={summary.user.id} className={summary.user.id === currentUserId ? 'local-user-card current-local-user' : 'local-user-card'}>
            <div className="local-user-head">
              <UserAvatar user={summary.user} progress={{ profile: { name: summary.user.name, avatarSymbol: summary.avatarSymbol, avatarColor: summary.avatarColor, avatarTitle: summary.avatarTitle }, xp: summary.xp }} showMeta />
              <strong>{summary.currentStage}</strong>
            </div>
            <div className="local-metrics">
              <span>{summary.xp} XP</span>
              <span>{summary.sparks} Centelhas</span>
              <span>{summary.streak} dias</span>
              <span>{summary.completedPractices} práticas</span>
              <span>{summary.ritualMinutesTotal ?? 0} min rituais</span>
              <span>{summary.unlockedSeals.length} selos</span>
              <span>{summary.tokenBalance} D7T</span>
              <span>{summary.score} score</span>
              <span>{summary.symbolicMapsCount ?? 0} mapas</span>
              <span>{summary.presenceCounter108 ?? 0}/108</span>
              <span>{summary.libraryCardsStudied ?? 0} cards</span>
            </div>
            <p>Última prática: {summary.lastPracticeDate ?? 'sem registro'} · Duração: {summary.lastPracticeDurationMinutes ?? '—'} min · Último selo: {summary.lastSealId ?? 'pendente'} · Último mapa: {summary.lastMapArchetype ?? 'pendente'} · Biblioteca: {summary.libraryCardsStudied ?? 0}/{summary.libraryCardsUnlocked ?? 0} · Título: {summary.libraryTitle ?? 'Iniciado do Silêncio'}</p>
            <small>Cartas: {summary.cards.length} · Desafios: {summary.completedChallenges.length} · Marcos: {summary.ritualMilestonesUnlocked?.length ? summary.ritualMilestonesUnlocked.join(' · ') : 'nenhum'} · Presença: {summary.gateScore} · Tempo em selos: {Math.floor(summary.totalSealFocusSeconds / 60)} min · Timers: {summary.totalTimersCompleted ?? 0} · Avisos: {summary.integrityWarnings}</small>
          </article>
        ))}
        {summaries.length === 0 && <p className="empty-state">Nenhum usuário local cadastrado neste navegador.</p>}
      </div>
    </section>
  )
}

function App() {
  const initialUser = getCurrentUser()
  const initialState = initialUser ? getUserState(initialUser) : ensureToday(getUserState(null))
  const initialPracticeMinutes = normalizePracticeMinutes(initialState.lastPracticeDurationMinutes ?? 7)
  const [currentUser, setCurrentUser] = useState(() => initialUser)
  const [showEntrance, setShowEntrance] = useState(() => shouldShowInitialEntrance(initialUser))
  const [language, setLanguage] = useState(() => getStoredLanguage())
  const [wheelResult, setWheelResult] = useState(null)
  const [adminRefresh, setAdminRefresh] = useState(0)
  const [authMode, setAuthMode] = useState('login')
  const [authMessage, setAuthMessage] = useState(null)
  const [panelMessage, setPanelMessage] = useState(null)
  const [activeView, setActiveView] = useState('home')
  const [state, setState] = useState(() => initialState)
  const [practiceDurationMinutes, setPracticeDurationMinutes] = useState(() => initialPracticeMinutes)
  const [practiceDurationInput, setPracticeDurationInput] = useState(() => String(initialPracticeMinutes))
  const [practiceDurationError, setPracticeDurationError] = useState('')
  const [timer, setTimer] = useState(() => ({
    journeyCode: getJourneyCode(initialState.progress),
    startedAt: null,
    expectedEndAt: null,
    remaining: initialPracticeMinutes * 60,
    status: 'idle',
  }))
  const [word, setWord] = useState('')
  const [activeSealId, setActiveSealId] = useState(sealDefinitions[0].id)
  const [challengeValue, setChallengeValue] = useState('')
  const [sealMessage, setSealMessage] = useState(null)
  const [tick, setTick] = useState(() => Date.now())
  const practiceTimerIntervalRef = useRef(null)
  const mantraAudioRef = useRef(null)
  const mantraCompletionFadeRef = useRef(false)
  const presenceStateRef = useRef(state)
  const presenceViewRef = useRef(activeView)

  const stage = getStage(state.progress)
  const journeyCode = getJourneyCode(state.progress)
  const practiceTotalSeconds = practiceDurationMinutes * 60
  const timerSynced = timer.journeyCode === journeyCode
  const timerStatus = timerSynced ? timer.status : 'idle'
  const remaining = timerStatus === 'running' ? Math.min(timer.remaining, practiceTotalSeconds) : timerStatus === 'complete' ? 0 : practiceTotalSeconds
  const timerProgress = practiceTotalSeconds ? Math.round(((practiceTotalSeconds - remaining) / practiceTotalSeconds) * 100) : 0
  const hebrewUnlocked = state.unlockedCards.filter((id) => cardById(id)?.track === 'hebraica').length
  const sanskritUnlocked = state.unlockedCards.filter((id) => cardById(id)?.track === 'sânscrita').length
  const currentScore = getRankingScore(state)
  const libraryStats = getLibraryStudyStats(state)
  const recommendedLibraryCard = getRecommendedLibraryCard(state)
  const phrase = dayPhrases[(state.progress.day - 1) % dayPhrases.length]
  const rank = localRanking(currentUser?.id)
  const practiceHasPrimaryReward = !state.daily.practice
  const practicePreview = practiceRewardPreview(practiceDurationMinutes, practiceHasPrimaryReward)
  const t = (path) => translate(language, path)
  const localSummaries = getAllLocalSummaries()
  const analyticsSummary = summarizeLocalEvents(localSummaries)


  useEffect(() => {
    if (currentUser) saveUserProgress(currentUser.id, state)
  }, [currentUser, state])
  useEffect(() => {
    presenceStateRef.current = state
    presenceViewRef.current = activeView
  }, [activeView, state])

  useEffect(() => {
    if (!currentUser) return undefined
    const heartbeat = (eventType = 'heartbeat') => updatePresence(currentUser, presenceStateRef.current, presenceViewRef.current, eventType)
    heartbeat('session_started')
    const interval = setInterval(() => {
      heartbeat('heartbeat')
      trackAdminEvent(currentUser, 'session_heartbeat', { view: presenceViewRef.current }, presenceViewRef.current)
    }, 30000)
    const handleFocus = () => heartbeat('focus')
    const handleBlur = () => markPresenceInactive(currentUser.id)
    const handleVisibility = () => {
      if (document.hidden) markPresenceInactive(currentUser.id)
      else heartbeat('visibility')
    }
    const handleUnload = () => markPresenceInactive(currentUser.id)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('beforeunload', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [currentUser])


  useEffect(() => {
    if (practiceTimerIntervalRef.current) {
      clearInterval(practiceTimerIntervalRef.current)
      practiceTimerIntervalRef.current = null
    }
    if (timerStatus !== 'running' || !timer.expectedEndAt) return undefined

    const syncTimer = () => {
      setTimer((current) => {
        if (current.journeyCode !== journeyCode || current.status !== 'running' || !current.expectedEndAt) return current
        const remainingSeconds = Math.max(0, Math.ceil((new Date(current.expectedEndAt).getTime() - Date.now()) / 1000))
        if (remainingSeconds <= 0) {
          return {
            ...current,
            remaining: 0,
            status: 'complete',
            completedAt: new Date().toISOString(),
          }
        }
        if (remainingSeconds === current.remaining) return current
        return { ...current, remaining: remainingSeconds }
      })
    }

    syncTimer()
    practiceTimerIntervalRef.current = setInterval(syncTimer, 1000)
    return () => {
      if (practiceTimerIntervalRef.current) {
        clearInterval(practiceTimerIntervalRef.current)
        practiceTimerIntervalRef.current = null
      }
    }
  }, [journeyCode, timer.expectedEndAt, timerStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now())
      setState((current) => syncSealAttempt(current, activeSealId))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSealId])

  useEffect(() => {
    if (timerStatus !== 'complete' || mantraCompletionFadeRef.current) return
    mantraCompletionFadeRef.current = true
    mantraAudioRef.current?.fadeOutAndStop()
  }, [timerStatus])

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
    const loadedPracticeMinutes = normalizePracticeMinutes(loaded.lastPracticeDurationMinutes ?? initialPracticeMinutes)
    setCurrentUser(user)
    setState(loaded)
    setPracticeDurationMinutes(loadedPracticeMinutes)
    setPracticeDurationInput(String(loadedPracticeMinutes))
    setPracticeDurationError('')
    setTimer({ journeyCode: getJourneyCode(loaded.progress), startedAt: null, expectedEndAt: null, remaining: loadedPracticeMinutes * 60, status: 'idle' })
    setActiveView('home')
    recordLocalEvent(user.id, 'login', { migrated: migration.migrated })
    updatePresence(user, loaded, 'home', 'session_started')
    trackAdminEvent(user, 'user_login', { migrated: migration.migrated }, 'home')
    trackAdminEvent(user, 'session_started', {}, 'home')
    setAuthMessage({ type: 'success', text: migration.migrated ? `${successMessage} Progresso anônimo antigo migrado com segurança.` : successMessage })
  }

  async function handleLogin(credentials) {
    const result = await loginUser(credentials)
    if (!result.ok) {
      createSecurityAlert({ severity: 'warning', message: 'Tentativa de login local falhou.', metadata: { login: credentials.login } })
      trackAdminEvent('anonymous', 'login_failed', { login: credentials.login })
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

  async function handleResetPassword(data) {
    const result = await resetLocalPassword(data)
    trackAdminEvent(data.userId || 'anonymous', 'password_reset_local', { ok: result.ok })
    if (result.ok) createSecurityAlert({ severity: 'info', message: 'Senha local redefinida neste navegador.', userId: data.userId })
    setAuthMessage({ type: result.ok ? 'success' : 'error', text: result.message })
    return result
  }

  async function handleDeleteAccount(userId) {
    if (!userId) return { ok: false, message: 'Selecione um usuário local.' }
    deleteUser(userId)
    const sessionUser = currentUser?.id === userId ? 'A sessão local foi encerrada.' : ''
    setAuthMessage({ type: 'success', text: `Conta local apagada. ${sessionUser} O progresso não foi apagado por padrão.`.trim() })
    return { ok: true, message: 'Conta local apagada.' }
  }

  function handleLogout() {
    if (currentUser?.id) {
      recordLocalEvent(currentUser.id, 'logout')
      trackAdminEvent(currentUser, 'user_logout', { view: activeView }, activeView)
      markPresenceInactive(currentUser.id)
    }
    logout()
    setCurrentUser(null)
    setAuthMode('login')
    setAuthMessage({ type: 'success', text: 'Sessão local encerrada. O progresso não foi apagado.' })
  }

  async function handleCopyReport() {
    const result = await copyLocalReport()
    setPanelMessage({ type: result.ok ? 'success' : 'error', text: result.message })
  }

  async function handleCopySealPhrase(phrase) {
    try {
      await navigator.clipboard.writeText(phrase)
      setSealMessage({ type: 'success', text: 'Frase copiada para a área de transferência.' })
    } catch {
      setSealMessage({ type: 'error', text: 'Não foi possível copiar a frase agora.' })
    }
  }

  function handleDownloadReport() {
    const result = downloadLocalReport()
    setPanelMessage({ type: result.ok ? 'success' : 'error', text: result.message })
  }

  function syncPracticeTimer(minutes = practiceDurationMinutes) {
    const normalizedMinutes = normalizePracticeMinutes(minutes)
    const remainingSeconds = normalizedMinutes * 60
    setTimer((current) => ({
      ...current,
      journeyCode,
      remaining: remainingSeconds,
      status: 'idle',
      startedAt: null,
      expectedEndAt: null,
    }))
    return normalizedMinutes
  }

  function handlePracticeDurationChange(minutes) {
    const normalizedMinutes = normalizePracticeMinutes(minutes)
    setPracticeDurationMinutes(normalizedMinutes)
    setPracticeDurationInput(String(normalizedMinutes))
    setPracticeDurationError('')
    if (timerStatus !== 'running' && timerStatus !== 'complete') {
      syncPracticeTimer(normalizedMinutes)
    }
  }

  function handlePracticeCustomInput(value) {
    const raw = String(value)
    setPracticeDurationInput(raw)
    if (!raw.trim()) {
      setPracticeDurationError('')
      return
    }
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 108) {
      setPracticeDurationError('Escolha um número inteiro entre 1 e 108 minutos.')
      return
    }
    handlePracticeDurationChange(parsed)
  }

  function handleStartPractice() {
    if (currentUser?.id) {
      recordLocalEvent(currentUser.id, 'practice_started', { minutes: practiceDurationMinutes, resumed: timerStatus === 'paused' })
      trackAdminEvent(currentUser, 'practice_started', { minutes: practiceDurationMinutes, resumed: timerStatus === 'paused' }, activeView)
      updatePresence(currentUser, state, activeView, 'practice_started')
    }
    const normalizedMinutes = normalizePracticeMinutes(practiceDurationMinutes)
    const total = timerStatus === 'paused' ? Math.max(1, timer.remaining) : normalizedMinutes * 60
    const startedAt = Date.now()
    mantraCompletionFadeRef.current = false
    setPracticeDurationError('')
    mantraAudioRef.current?.start()
    setTimer({
      journeyCode,
      startedAt,
      expectedEndAt: startedAt + total * 1000,
      remaining: total,
      status: 'running',
    })
  }

  function handlePausePractice() {
    mantraAudioRef.current?.pause()
    setTimer((current) => ({ ...current, status: 'paused', expectedEndAt: null }))
  }

  function handleCancelPractice() {
    mantraAudioRef.current?.stop({ reset: true })
    mantraCompletionFadeRef.current = false
    setTimer((current) => ({
      ...current,
      journeyCode,
      remaining: practiceDurationMinutes * 60,
      status: 'idle',
      startedAt: null,
      expectedEndAt: null,
    }))
  }

  function handleResetPractice() {
    mantraAudioRef.current?.stop({ reset: true })
    mantraCompletionFadeRef.current = false
    setPracticeDurationError('')
    syncPracticeTimer(practiceDurationMinutes)
  }

  function handleSelectSeal(sealId) {
    setActiveSealId(sealId)
    setChallengeValue('')
    setSealMessage(null)
    setState((current) => syncSealAttempt(current, sealId))
  }

  function handleStartSeal(sealId) {
    if (currentUser?.id) { recordLocalEvent(currentUser.id, 'seal_started', { sealId }); trackAdminEvent(currentUser, 'seal_started', { sealId }, activeView) }
    setState((current) => startSealAttempt(current, sealId))
    setChallengeValue('')
    setSealMessage({ type: 'success', text: 'Selo iniciado. Mantenha presença ativa até o fim do timer.' })
  }

  function handleCancelSeal(sealId) {
    setState((current) => cancelSealAttempt(current, sealId))
    setSealMessage({ type: 'success', text: 'Tentativa cancelada sem recompensa.' })
  }

  async function handleCompleteSeal(sealId) {
    if (currentUser?.id) { recordLocalEvent(currentUser.id, 'seal_completed', { sealId }); trackAdminEvent(currentUser, 'seal_completed', { sealId }, activeView) }
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
    trackAdminEvent(currentUser, 'symbolic_map_created', { archetype: mapResult?.archetype }, activeView)
    setState(saved.progress)
    return saved
  }

  function navigate(view) {
    setActiveView(view)
    if (currentUser?.id) {
      recordLocalEvent(currentUser.id, `view_${view}`)
      trackAdminEvent(currentUser, `view_${view}`, { view }, view)
      updatePresence(currentUser, state, view, 'view_change')
    }
    setState((current) => recordVisit(current, view))
  }

  function finishPractice() {
    if (timerStatus !== 'complete') return
    mantraAudioRef.current?.fadeOutAndStop()
    const rewardMode = state.daily.practice ? 'free' : 'primary'
    if (currentUser?.id) {
      recordLocalEvent(currentUser.id, 'practice_completed', { minutes: practiceDurationMinutes, rewardMode })
      trackAdminEvent(currentUser, 'practice_completed', { minutes: practiceDurationMinutes, rewardMode }, activeView)
      trackAdminEvent(currentUser, 'd7t_earned', { amount: practicePreview.d7t }, activeView)
    }
    setState((current) => recordVisit(completePractice(current, { durationMinutes: practiceDurationMinutes, rewardMode }), 'jornada'))
    setTimer({ journeyCode, startedAt: null, expectedEndAt: null, remaining: practiceDurationMinutes * 60, status: 'idle' })
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
    const freshPracticeMinutes = normalizePracticeMinutes(fresh.lastPracticeDurationMinutes ?? practiceDurationMinutes)
    setState(fresh)
    setPracticeDurationMinutes(freshPracticeMinutes)
    setPracticeDurationInput(String(freshPracticeMinutes))
    setPracticeDurationError('')
    setActiveView('home')
    setTimer({ journeyCode: getJourneyCode(fresh.progress), startedAt: null, expectedEndAt: null, remaining: freshPracticeMinutes * 60, status: 'idle' })
  }

  function study(cardId) {
    if (currentUser?.id) { recordLocalEvent(currentUser.id, 'study_card_completed', { cardId }); trackAdminEvent(currentUser, 'study_card_completed', { cardId }, activeView) }
    setState((current) => studyCard(current, cardId))
  }

  function handleLanguageChange(nextLanguage) {
    const saved = saveLanguage(nextLanguage)
    setLanguage(saved)
    if (currentUser?.id) { recordLocalEvent(currentUser.id, 'language_changed', { language: saved }); trackAdminEvent(currentUser, 'language_changed', { language: saved }, activeView) }
  }

  function handleWheelSpin(options = {}) {
    const result = spinD7Wheel(state, currentUser.id, options)
    setWheelResult({ ok: result.ok, message: result.message })
    if (!result.ok) return
    setState(result.state)
    const metadata = { rewardType: result.event.rewardType, rewardLabel: result.event.rewardLabel, costD7T: result.event.costD7T, welcomeSpin: result.event.welcomeSpin }
    recordLocalEvent(currentUser.id, 'wheel_spin', metadata)
    trackAdminEvent(currentUser, 'wheel_spin', metadata, activeView)
    if (result.event.costD7T > 0) trackAdminEvent(currentUser, 'd7t_spent', { amount: result.event.costD7T, costD7T: result.event.costD7T, rewardLabel: result.event.rewardLabel }, activeView)
  }

  function handleAvatarChoice(symbolId, themeId = state.profile?.avatarTheme ?? 'aurora') {
    const next = applyAvatarChoice(state, symbolId, themeId)
    setState(next)
    recordLocalEvent(currentUser.id, 'avatar_changed', { symbolId, themeId })
  }

  function completeEntrance() {
    markEntranceSeen()
    setShowEntrance(false)
  }

  if (showEntrance) {
    return <D7CinematicEntrance onComplete={completeEntrance} onSkip={completeEntrance} />
  }

  if (!currentUser) {
    return <AuthScreen mode={authMode} message={authMessage} t={t} language={language} onLanguageChange={handleLanguageChange} onModeChange={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} onResetPassword={handleResetPassword} onDeleteAccount={handleDeleteAccount} />
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
              {t(`nav.${item.id}`)}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <UserProfileBar user={currentUser} progress={state} t={t} language={language} onLanguageChange={handleLanguageChange} onLogout={handleLogout} />

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
              <span className="overline">{t('home.eyebrow')}</span>
              <h2>{t('home.title')}</h2>
              <p>{t('home.body')}</p>
              <div className="hero-actions">
                <button type="button" className="primary-action" onClick={() => navigate('pratica')}>{t('home.practice')}</button>
                <button type="button" className="ghost-action" onClick={() => navigate('biblioteca')}>{t('home.library')}</button>
                <button type="button" className="ghost-action" onClick={() => navigate('sala')}>Sala D7</button>
                <button type="button" className="ghost-action" onClick={() => setShowEntrance(true)}>Ver entrada</button>
              </div>
              <div className="home-next-action">
                <UserAvatar user={currentUser} progress={state} showMeta />
                <div><span className="overline">Próxima ação</span><strong>{state.daily.practice ? 'Estudar Biblioteca ou entrar na Sala D7' : `Prática ritual de ${practiceDurationMinutes} min`}</strong><p>{recommendedLibraryCard ? `Estudo recomendado: ${recommendedLibraryCard.title}` : 'Acompanhe seu ciclo e mantenha presença.'}</p></div>
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
              <div className={`practice-banner ${state.daily.practice ? 'complete' : 'idle'}`} role="status">
                <strong>{state.daily.practice ? 'Prática de hoje concluída' : 'Escolha um tempo ritual'}</strong>
                <span>{state.daily.practice ? 'Você pode repetir em modo livre sem recompensa principal.' : 'Selecione uma duração antes de iniciar.'}</span>
              </div>
              <D7DurationSelector
                value={practiceDurationMinutes}
                onChange={handlePracticeDurationChange}
                customValue={practiceDurationInput}
                onCustomChange={handlePracticeCustomInput}
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
              <D7PulseTimer
                label="Timer Ritual D7"
                subtitle="Prática de presença"
                hint={timerStatus === 'running' ? 'Presença ativa' : timerStatus === 'paused' ? 'Prática pausada. Reinicie para seguir.' : state.daily.practice ? 'Prática livre disponível. Escolha outro tempo para continuar.' : 'Permaneça. O código desperta no silêncio.'}
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
                onStart={handleStartPractice}
                onPause={timerStatus === 'running' ? handlePausePractice : null}
                onCancel={timerStatus === 'running' || timerStatus === 'paused' ? handleCancelPractice : null}
                onReset={timerStatus === 'idle' ? handleResetPractice : null}
                onComplete={timerStatus === 'complete' ? finishPractice : null}
                completeDisabled={timerStatus !== 'complete'}
                startLabel={timerStatus === 'paused' ? 'Retomar prática' : state.daily.practice ? 'Iniciar prática livre' : 'Iniciar prática'}
                pauseLabel="Pausar"
                cancelLabel="Cancelar prática"
                resetLabel="Reiniciar seleção"
                completeLabel={state.daily.practice ? 'Registrar prática livre' : 'Concluir prática'}
                statusText={timerStatus === 'running' ? 'Presença ativa' : timerStatus === 'paused' ? 'Prática pausada' : timerStatus === 'complete' ? 'Prática concluída' : state.daily.practice ? 'Prática de hoje concluída. A próxima será livre.' : 'aguardando entrada'}
                ariaLabel={`Tempo restante ${formatTime(remaining)}`}
              />
              {state.lastUnlocks.length > 0 && <div className="unlock-feed" aria-live="polite">{state.lastUnlocks.map((item) => <span key={item}>{item}</span>)}</div>}
            </div>
            <aside className="ritual-panel">
              <h3>Meta ritual</h3>
              <p>{stage.intent}</p>
              <div className="reward-preview">
                <span>Recompensa prevista</span>
                <strong>+{practicePreview.xp} XP</strong>
                <strong>+{practicePreview.sparks} Centelhas</strong>
                <strong>+{practicePreview.d7t} D7T</strong>
                <small>{practicePreview.text}</small>
                <small>Portal 21/108: {state.ritualMinutesTotal ?? 0}/108 min · Marcos: {state.ritualMilestonesUnlocked?.length ? state.ritualMilestonesUnlocked.join(' · ') : 'nenhum'}</small>
              </div>
              <div className="library-tip">
                <span className="overline">Biblioteca sugerida</span>
                <strong>{recommendedLibraryCard ? recommendedLibraryCard.title : 'Nenhum card novo no momento'}</strong>
                <p>{recommendedLibraryCard ? recommendedLibraryCard.summary : 'O próximo estudo recomendado já foi concluído.'}</p>
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
            <nav className="codex-quick-nav" aria-label="Navegação interna do Códice">
              <a href="#codex-overview">Visão geral</a>
              <a href="#codex-map">Mapa Simbólico</a>
              <a href="#codex-seals">Selos</a>
              <a href="#codex-cards">Letras e Sons</a>
              <button type="button" onClick={() => navigate('biblioteca')}>Biblioteca relacionada</button>
            </nav>
            <div id="codex-overview" className="library-callout">
              <div>
                <span className="overline">Biblioteca Iniciática D7</span>
                <p>Resumos, missões e títulos desbloqueáveis para estudar símbolos com ritmo e progressão.</p>
              </div>
              <button type="button" className="ghost-action" onClick={() => navigate('biblioteca')}>Abrir Biblioteca</button>
            </div>
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
            <div id="codex-map"><D7SymbolicMap progress={state} onSaveMap={handleSaveSymbolicMap} /></div>
            <div id="codex-seals"><SealRoom state={state} activeSealId={activeSealId} challengeValue={challengeValue} sealMessage={sealMessage} tick={tick} onSelectSeal={handleSelectSeal} onStartSeal={handleStartSeal} onCancelSeal={handleCancelSeal} onChallengeChange={setChallengeValue} onCompleteChallenge={handleCompleteSeal} onCopyPhrase={handleCopySealPhrase} /></div>
            <div id="codex-cards" className="codex-layout">
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

        {activeView === 'biblioteca' && (
          <InitiationLibrary progress={state} onStudyCard={study} onNavigate={navigate} />
        )}

        {activeView === 'sala' && (
          <D7Room user={currentUser} progress={state} t={t} onEvent={(eventType, metadata = {}) => { recordLocalEvent(currentUser.id, eventType, metadata); trackAdminEvent(currentUser, eventType, metadata, 'sala'); updatePresence(currentUser, state, 'sala', eventType) }} />
        )}

        {activeView === 'roda' && (
          <D7Wheel state={state} userId={currentUser.id} result={wheelResult} t={t} onSpin={handleWheelSpin} onNavigate={navigate} />
        )}

        {activeView === 'admin' && (
          <AdminPanel summaries={localSummaries} analytics={analyticsSummary} t={t} onRefresh={() => setAdminRefresh((value) => value + 1)} onAdminOpened={() => recordLocalEvent(currentUser.id, 'admin_opened', { refresh: adminRefresh })} />
        )}

        {activeView === 'ranking' && (
          <section className="content-section">
            <SectionTitle eyebrow="Ranking local" title="Ordem de presença">Score = XP + sequência + cartas + portais + códigos + D7T + minutos rituais + marcos 21/108.</SectionTitle>
            <img className="ranking-seal-art" src={visualAssets.ranking} alt="Selo visual do ranking D7" />
            <div className="ranking-list">
              {rank.map((player, index) => (
                <article key={player.name} className={player.current ? 'rank-row current-player' : 'rank-row'}>
                  <strong>#{index + 1}</strong>
                  <div className="rank-player"><span className="d7-avatar sm" style={{ '--avatar-color': player.avatarColor ?? '#20d3ee' }} aria-hidden="true"><strong>{player.avatarSymbol ? getUserAvatarProfile({ name: player.name }, { profile: { avatarSymbol: player.avatarSymbol } }).glyph : 'D7'}</strong></span><div><span>{player.name}</span><small>{player.avatarTitle ?? player.title}</small></div></div>
                  <p>{player.score} score</p>
                  <small>{player.stage ?? 'A1'} · {player.xp} XP · {player.sparks ?? 0} centelhas · {player.cards} cartas · {player.seals ?? player.portals} selos · {player.tokens ?? 0} D7T · {player.ritualMinutesTotal ?? 0} min · Biblioteca {player.libraryCardsStudied ?? 0} · {player.libraryTitle ?? 'Iniciado do Silêncio'} · {Array.isArray(player.ritualMilestonesUnlocked) && player.ritualMilestonesUnlocked.length ? player.ritualMilestonesUnlocked.join(' / ') : '21/108 pendente'}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'perfil' && (
          <section className="profile-grid">
            <div className="profile-card profile-identity-card">
              <UserAvatar user={currentUser} progress={state} size="lg" showMeta />
              <div className="profile-seals" aria-hidden="true">
                <img src={visualAssets.sealD7} alt="" />
                <img src={visualAssets.cycle} alt="" />
              </div>
              <span className="overline">Identidade D7</span>
              <h2>{getUserAvatarProfile(currentUser, state).title}</h2>
              <p>Sua identidade simbólica dentro da jornada.</p>
              <div className="profile-level">Nível {playerLevel(state.xp)} · {currentScore} score</div>
              <div className="avatar-choice-grid" aria-label="Escolher avatar simbólico">
                {avatarSymbols.map((symbol) => (
                  <button key={symbol.id} type="button" className={state.profile?.avatarSymbol === symbol.id ? 'avatar-choice active' : 'avatar-choice'} onClick={() => handleAvatarChoice(symbol.id)} aria-pressed={state.profile?.avatarSymbol === symbol.id}>
                    <span>{symbol.glyph}</span><strong>{symbol.label}</strong><small>{symbol.meaning}</small>
                  </button>
                ))}
              </div>
              <label className="avatar-theme-picker" htmlFor="avatar-theme">Aura simbólica
                <select id="avatar-theme" value={state.profile?.avatarTheme ?? 'aurora'} onChange={(event) => handleAvatarChoice(state.profile?.avatarSymbol ?? 'd7', event.target.value)}>
                  {avatarThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
                </select>
              </label>
              <button type="button" className="ghost-action" onClick={resetMvp}>Resetar meu progresso</button>
            </div>
            <div className="inventory-card">
              <SectionTitle eyebrow="Perfil do jogador" title="Progressão e Selos" />
              <div className="profile-stats">
                <StatCard label="Ciclo" value={journeyCode} detail={stage.name} />
                <StatCard label="Sequência" value={state.progress.streak} detail="dias ativos" />
                <StatCard label="Cartas" value={state.unlockedCards.length} detail={`${codexCards.length} totais`} />
                <StatCard label="Missões" value={state.completedMissions.length} detail="ativas concluídas" />
                <StatCard label="Biblioteca" value={`${libraryStats.studiedCardsCount}/${libraryStats.unlockedStudyCount}`} detail={libraryStats.title} />
                <StatCard label="Portais" value={state.openedPortals.length} detail="4 possíveis" />
                <StatCard label="Códigos" value={state.unlockedCodes.length} detail="8 possíveis" />
                <StatCard label="Minutos rituais" value={state.ritualMinutesTotal ?? 0} detail="21/108 simbólico" />
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
                <p>Portal 21/108 <strong>{state.ritualMinutesTotal ?? 0}</strong></p><ProgressLine value={Math.min(108, state.ritualMinutesTotal ?? 0)} max={108} label="Progresso ritual 21/108" />
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

        <D7Footer copy={t('footer.copy')} tagline={t('footer.tagline')} />
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
