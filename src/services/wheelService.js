import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'
import { todayKey, unique } from '../utils/gameState.js'

export const WHEEL_EVENTS_KEY = 'd7_wheel_events_by_user'
export const WHEEL_COST_D7T = 3
export const WHEEL_DAILY_LIMIT = 3

const rewards = [
  { type: 'xp', label: '+10 XP', apply: (state) => ({ ...state, xp: state.xp + 10 }) },
  { type: 'sparks', label: '+1 centelha', apply: (state) => ({ ...state, sparks: state.sparks + 1 }) },
  { type: 'cosmetic_card', label: 'Carta cosmética: Portal Sereno', apply: (state) => ({ ...state, codex: [{ id: `wheel-card-${Date.now()}`, title: 'Carta cosmética: Portal Sereno', text: 'Recompensa simbólica da Roda D7.', date: new Date().toLocaleDateString('pt-BR') }, ...state.codex] }) },
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

export function spinD7Wheel(state, userId) {
  if (!userId) return { ok: false, message: 'Usuário local ausente.', state }
  if ((state.tokenBalance ?? 0) < WHEEL_COST_D7T) return { ok: false, message: 'D7T insuficiente para girar a Roda D7.', state }
  const todayCount = getTodayWheelCount(userId)
  if (todayCount >= WHEEL_DAILY_LIMIT) return { ok: false, message: 'Limite diário de 3 giros atingido.', state }
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const reward = rewards[Math.floor(Math.random() * rewards.length)]
  const charged = { ...state, tokenBalance: Math.max(0, (state.tokenBalance ?? 0) - WHEEL_COST_D7T) }
  const rewarded = reward.apply(charged)
  const event = {
    id: makeId('wheel'),
    userId,
    costD7T: WHEEL_COST_D7T,
    rewardType: reward.type,
    rewardLabel: reward.label,
    createdAt: new Date().toISOString(),
    seed,
    claimed: true,
  }
  const all = getWheelEventsByUser()
  const userEvents = Array.isArray(all[userId]) ? all[userId] : []
  safeSetStorage(WHEEL_EVENTS_KEY, { ...all, [userId]: [event, ...userEvents].slice(0, 80) })
  return {
    ok: true,
    event,
    message: `Roda D7: ${reward.label}`,
    state: {
      ...rewarded,
      lastUnlocks: unique([reward.label, ...(rewarded.lastUnlocks ?? [])]).slice(0, 5),
    },
  }
}
