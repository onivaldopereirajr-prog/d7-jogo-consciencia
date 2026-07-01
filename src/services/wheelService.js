import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'
import { todayKey, unique } from '../utils/gameState.js'

export const WHEEL_EVENTS_KEY = 'd7_wheel_events_by_user'
export const WELCOME_SPIN_KEY = 'd7_welcome_spin_granted'
export const WHEEL_COST_D7T = 3
export const WHEEL_DAILY_LIMIT = 3

const rewards = [
  { type: 'xp', label: '+10 XP', apply: (state) => ({ ...state, xp: state.xp + 10 }) },
  { type: 'sparks', label: '+1 centelha', apply: (state) => ({ ...state, sparks: state.sparks + 1 }) },
  { type: 'cosmetic_card', label: 'Carta cosmética: Portal Sereno', apply: (state) => ({ ...state, codex: [{ id: `wheel-card-${Date.now()}`, title: 'Carta cosmética: Portal Sereno', text: 'Recompensa simbólica da Roda Maiindy.', date: new Date().toLocaleDateString('pt-BR') }, ...state.codex] }) },
  { type: 'temporary_title', label: 'Título simbólico: Guardião do Foco', apply: (state) => ({ ...state, profile: { ...state.profile, title: 'Guardião do Foco' } }) },
  { type: 'theme', label: 'Tema visual simbólico: Aurora Interna', apply: (state) => ({ ...state, lastUnlocks: unique(['Tema simbólico: Aurora Interna', ...(state.lastUnlocks ?? [])]).slice(0, 5) }) },
  { type: 'mission', label: 'Missão especial: respire por 1 minuto', apply: (state) => ({ ...state, codex: [{ id: `wheel-mission-${Date.now()}`, title: 'Missão especial', text: 'Respire por 1 minuto antes da próxima prática.', date: new Date().toLocaleDateString('pt-BR') }, ...state.codex] }) },
  { type: 'library_tip', label: 'Dica da Biblioteca', apply: (state) => ({ ...state, lastUnlocks: unique(['Dica: revise o próximo card da Biblioteca', ...(state.lastUnlocks ?? [])]).slice(0, 5) }) },
  { type: 'study_bonus', label: '+5 XP de estudo', apply: (state) => ({ ...state, xp: state.xp + 5 }) },
  { type: 'oracle_phrase', label: 'Frase simbólica: avance com leveza', apply: (state) => ({ ...state, codex: [{ id: `wheel-oracle-${Date.now()}`, title: 'Frase-oráculo simbólica', text: 'Avance com leveza: presença primeiro, resultado depois.', date: new Date().toLocaleDateString('pt-BR') }, ...state.codex] }) },
  { type: 'micro_mission', label: 'Missão curta: organizar um espaço', apply: (state) => ({ ...state, lastUnlocks: unique(['Missão curta: organize um espaço pequeno', ...(state.lastUnlocks ?? [])]).slice(0, 5) }) },
  { type: 'visual_seal', label: 'Selo cosmético: Presença Clara', apply: (state) => ({ ...state, codex: [{ id: `wheel-seal-${Date.now()}`, title: 'Selo cosmético: Presença Clara', text: 'Selo visual simbólico sem valor financeiro.', date: new Date().toLocaleDateString('pt-BR') }, ...state.codex] }) },
]

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function getWheelEventsByUser() {
  const data = safeGetStorage(WHEEL_EVENTS_KEY, {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export function getWheelEvents(userId) {
  const events = getWheelEventsByUser()[userId]
  return Array.isArray(events) ? events : []
}

export function getTodayWheelCount(userId) {
  const today = todayKey()
  return getWheelEvents(userId).filter((event) => event.createdAt?.slice(0, 10) === today).length
}

export function getWelcomeSpinGranted() {
  const data = safeGetStorage(WELCOME_SPIN_KEY, {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export function hasWelcomeSpinAvailable(userId) {
  if (!userId) return false
  return !getWelcomeSpinGranted()[userId]
}

function markWelcomeSpinGranted(userId, eventId) {
  const data = getWelcomeSpinGranted()
  safeSetStorage(WELCOME_SPIN_KEY, {
    ...data,
    [userId]: { grantedAt: new Date().toISOString(), eventId },
  })
}

export function getWheelAvailability(state, userId) {
  const balance = Math.max(0, state?.tokenBalance ?? 0)
  const todayCount = getTodayWheelCount(userId)
  const welcomeAvailable = hasWelcomeSpinAvailable(userId)
  const missingD7T = Math.max(0, WHEEL_COST_D7T - balance)

  if (!welcomeAvailable && balance < WHEEL_COST_D7T) {
    return {
      canSpin: false,
      reason: 'insufficient_balance',
      message: `Você precisa de ${WHEEL_COST_D7T} D7T para girar. Saldo atual: ${balance} D7T. Faltam ${missingD7T} D7T.`,
      balance,
      missingD7T,
      todayCount,
      welcomeAvailable,
    }
  }

  if (todayCount >= WHEEL_DAILY_LIMIT) {
    return {
      canSpin: false,
      reason: 'daily_limit',
      message: `Você já usou os ${WHEEL_DAILY_LIMIT} giros de hoje. Volte amanhã para girar novamente.`,
      balance,
      missingD7T,
      todayCount,
      welcomeAvailable,
    }
  }

  return {
    canSpin: true,
    reason: welcomeAvailable ? 'welcome_spin' : 'ready',
    message: welcomeAvailable ? 'Você possui 1 giro de boas-vindas para conhecer a Roda Maiindy.' : 'Você pode girar a Roda Maiindy.',
    balance,
    missingD7T,
    todayCount,
    welcomeAvailable,
  }
}

export function spinD7Wheel(state, userId, options = {}) {
  if (!userId) return { ok: false, message: 'Usuário local ausente.', state }
  const availability = getWheelAvailability(state, userId)
  if (!availability.canSpin) return { ok: false, message: availability.message, state }

  const useWelcomeSpin = Boolean(options.useWelcomeSpin && availability.welcomeAvailable)
  const costD7T = useWelcomeSpin ? 0 : WHEEL_COST_D7T
  if (!useWelcomeSpin && (state.tokenBalance ?? 0) < WHEEL_COST_D7T) return { ok: false, message: availability.message, state }

  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const reward = rewards[Math.floor(Math.random() * rewards.length)]
  const charged = { ...state, tokenBalance: Math.max(0, (state.tokenBalance ?? 0) - costD7T) }
  const rewarded = reward.apply(charged)
  const event = {
    id: makeId('wheel'),
    userId,
    costD7T,
    rewardType: reward.type,
    rewardLabel: reward.label,
    createdAt: new Date().toISOString(),
    seed,
    claimed: true,
    welcomeSpin: useWelcomeSpin,
  }
  const all = getWheelEventsByUser()
  const userEvents = Array.isArray(all[userId]) ? all[userId] : []
  safeSetStorage(WHEEL_EVENTS_KEY, { ...all, [userId]: [event, ...userEvents].slice(0, 80) })
  if (useWelcomeSpin) markWelcomeSpinGranted(userId, event.id)
  return {
    ok: true,
    event,
    message: `${useWelcomeSpin ? 'Giro de boas-vindas' : 'Roda Maiindy'}: ${reward.label}`,
    state: {
      ...rewarded,
      lastUnlocks: unique([reward.label, ...(rewarded.lastUnlocks ?? [])]).slice(0, 5),
    },
  }
}
