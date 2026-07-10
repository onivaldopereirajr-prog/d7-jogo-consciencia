import { completePractice, ensureToday, normalizeState } from '../utils/gameState.js'
import { getUserState, saveUserProgress } from './localProgress.js'
import { recordLocalEvent } from './analyticsLocal.js'

const SESSION_STATUSES = new Set(['created', 'active', 'paused', 'completed', 'cancelled'])
const PRACTICE_TYPES = new Set(['breathing', 'meditation'])
let fallbackIdCounter = 0

export function createContemplativeSessionId() {
  if (globalThis.crypto?.randomUUID) return `contemplative_${globalThis.crypto.randomUUID()}`
  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues?.(bytes)
  fallbackIdCounter += 1
  const entropy = bytes.some(Boolean) ? [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('') : `${Date.now()}_${globalThis.performance?.timeOrigin ?? 0}_${fallbackIdCounter}`
  return `contemplative_${entropy}`
}

export function normalizeContemplativeSession(raw = {}) {
  return {
    sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : '', userId: typeof raw.userId === 'string' ? raw.userId : '',
    practiceType: raw.practiceType === 'breathing' ? 'breathing' : 'meditation',
    status: SESSION_STATUSES.has(raw.status) ? raw.status : 'created',
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : null, completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
    techniqueId: typeof raw.techniqueId === 'string' ? raw.techniqueId : null, duration: Math.max(0, Number(raw.duration) || 0),
    cyclesCompleted: Math.max(0, Math.min(3, Number(raw.cyclesCompleted) || 0)), intention: typeof raw.intention === 'string' ? raw.intention : null,
    audioMode: raw.audioMode === 'mantra' ? 'mantra' : 'silence', mantraId: typeof raw.mantraId === 'string' ? raw.mantraId : null,
    postPracticeFeedback: typeof raw.postPracticeFeedback === 'string' ? raw.postPracticeFeedback : null,
    rewardAppliedAt: typeof raw.rewardAppliedAt === 'string' ? raw.rewardAppliedAt : null, analyticsRecordedAt: typeof raw.analyticsRecordedAt === 'string' ? raw.analyticsRecordedAt : null,
    completionSummary: raw.completionSummary && typeof raw.completionSummary === 'object' ? raw.completionSummary : null,
  }
}

export function getContemplativeStats(state) {
  const sessions = (state?.contemplativeSessions ?? []).filter((session) => session.status === 'completed')
  return { total: sessions.length, breathing: sessions.filter((session) => session.practiceType === 'breathing').length, meditation: sessions.filter((session) => session.practiceType === 'meditation').length, minutes: Math.round(sessions.reduce((sum, session) => sum + (Number(session.duration) || 0), 0) / 60), sessions }
}

export function persistContemplativeSessionStatus(user, payload, status) {
  if (!user?.id || !payload?.sessionId?.trim() || !PRACTICE_TYPES.has(payload.practiceType) || !SESSION_STATUSES.has(status)) return null
  const persisted = normalizeState(getUserState(user))
  const index = persisted.contemplativeSessions.findIndex((item) => item.sessionId === payload.sessionId)
  if (index >= 0 && persisted.contemplativeSessions[index].status === 'completed') return persisted
  const previous = index >= 0 ? persisted.contemplativeSessions[index] : {}
  const session = normalizeContemplativeSession({ ...previous, ...payload, userId: user.id, status, startedAt: previous.startedAt ?? payload.startedAt ?? (status === 'active' ? new Date().toISOString() : null) })
  const sessions = index >= 0 ? persisted.contemplativeSessions.map((item, itemIndex) => itemIndex === index ? session : item) : [session, ...persisted.contemplativeSessions]
  const next = normalizeState({ ...persisted, contemplativeSessions: sessions.slice(0, 240) })
  saveUserProgress(user.id, next)
  return next
}

function metadata(session) {
  return { sessionId: session.sessionId, practiceType: session.practiceType, techniqueId: session.techniqueId, intention: session.intention, duration: session.duration, cyclesCompleted: session.cyclesCompleted }
}

export function completeContemplativeSession(user, payload) {
  if (!user?.id || !payload?.sessionId?.trim() || !PRACTICE_TYPES.has(payload.practiceType)) return { ok: false, message: 'Sessão contemplativa inválida.' }
  const persisted = normalizeState(getUserState(user))
  const existing = persisted.contemplativeSessions.find((item) => item.sessionId === payload.sessionId && item.status === 'completed')
  if (existing) return { ok: true, duplicate: true, progress: persisted, session: existing, summary: existing.completionSummary }
  const now = new Date().toISOString()
  const session = normalizeContemplativeSession({ ...payload, userId: user.id, status: 'completed', completedAt: now, rewardAppliedAt: now })
  const progress = session.practiceType === 'meditation'
    ? completePractice(persisted, { durationMinutes: Math.max(1, Math.ceil(session.duration / 60)), rewardMode: persisted.daily?.practice ? 'free' : 'primary' })
    : { ...persisted, sparks: persisted.sparks + 1, lastUnlocks: ['+1 Centelha · Respiração registrada', ...(persisted.lastUnlocks ?? [])].slice(0, 5) }
  const summary = { ...metadata(session), audioMode: session.audioMode, sparksGained: Math.max(0, progress.sparks - persisted.sparks), xpGained: Math.max(0, progress.xp - persisted.xp), d7tGained: Math.max(0, (progress.tokenBalance ?? 0) - (persisted.tokenBalance ?? 0)), journeyRecorded: true }
  const completedSession = { ...session, analyticsRecordedAt: now, completionSummary: summary }
  const previousSessions = progress.contemplativeSessions.filter((item) => item.sessionId !== completedSession.sessionId)
  const next = ensureToday(normalizeState({ ...progress, contemplativeSessions: [completedSession, ...previousSessions].slice(0, 240) }))
  saveUserProgress(user.id, next)
  const eventType = session.practiceType === 'breathing' ? 'breathing_completed' : 'meditation_completed'
  recordLocalEvent(user.id, eventType, metadata(completedSession), { dedupeKey: `${eventType}:${session.sessionId}` })
  return { ok: true, duplicate: false, progress: next, session: completedSession, summary }
}

export function updateContemplativeFeedback(user, sessionId, feedback) {
  if (!user?.id || !sessionId || !['tenser', 'same', 'calmer'].includes(feedback)) return null
  const persisted = normalizeState(getUserState(user))
  if (!persisted.contemplativeSessions.some((session) => session.sessionId === sessionId && session.status === 'completed')) return null
  const next = normalizeState({ ...persisted, contemplativeSessions: persisted.contemplativeSessions.map((session) => session.sessionId === sessionId ? { ...session, postPracticeFeedback: feedback } : session) })
  saveUserProgress(user.id, next)
  recordLocalEvent(user.id, 'post_practice_feedback', { sessionId, feedback }, { dedupeKey: `post_practice_feedback:${sessionId}` })
  return next
}
