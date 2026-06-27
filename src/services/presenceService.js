import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'
import { getUserAvatarProfile } from './avatarService.js'

export const PRESENCE_KEY = 'd7_presence_by_user'
export const SESSION_ID_KEY = 'd7_current_session_id'

function makeId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function shortAgent() {
  if (typeof navigator === 'undefined') return 'Ambiente local'
  const ua = navigator.userAgent || 'Navegador local'
  if (/iPhone|iPad/i.test(ua)) return 'iOS Safari/Browser'
  if (/Android/i.test(ua)) return 'Android Browser'
  if (/Chrome/i.test(ua)) return 'Chrome/Chromium'
  if (/Safari/i.test(ua)) return 'Safari'
  return ua.slice(0, 42)
}

export function getPresenceByUser() {
  const data = safeGetStorage(PRESENCE_KEY, {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export function getOrCreateSessionId(userId) {
  const current = safeGetStorage(SESSION_ID_KEY, null)
  if (current?.userId === userId && current?.sessionId) return current.sessionId
  const sessionId = makeId()
  safeSetStorage(SESSION_ID_KEY, { userId, sessionId, createdAt: new Date().toISOString() })
  return sessionId
}

export function updatePresence(user, progress = {}, currentView = 'home', eventType = 'heartbeat') {
  if (!user?.id) return null
  const all = getPresenceByUser()
  const previous = all[user.id] ?? {}
  const now = new Date().toISOString()
  const sessionId = previous.sessionId ?? getOrCreateSessionId(user.id)
  const loginAt = previous.loginAt ?? now
  const avatar = getUserAvatarProfile(user, progress)
  const estimatedSessionSeconds = Math.max(0, Math.round((Date.now() - new Date(loginAt).getTime()) / 1000))
  const next = {
    userId: user.id,
    nickname: user.name,
    avatarSymbol: avatar.symbolId,
    avatarGlyph: avatar.glyph,
    avatarColor: avatar.color,
    currentView,
    sessionId,
    loginAt,
    lastSeenAt: now,
    lastActivityAt: now,
    isActiveLocal: true,
    estimatedSessionSeconds,
    deviceLabel: 'Navegador local',
    userAgentShort: shortAgent(),
    eventsCount: Number(previous.eventsCount ?? 0) + (eventType === 'heartbeat' ? 0 : 1),
    updatedAt: now,
  }
  safeSetStorage(PRESENCE_KEY, { ...all, [user.id]: next })
  return next
}

export function markPresenceInactive(userId) {
  if (!userId) return null
  const all = getPresenceByUser()
  const current = all[userId]
  if (!current) return null
  const next = { ...current, isActiveLocal: false, lastSeenAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  safeSetStorage(PRESENCE_KEY, { ...all, [userId]: next })
  return next
}

export function presenceStatus(item, now = Date.now()) {
  const last = item?.lastSeenAt ? new Date(item.lastSeenAt).getTime() : 0
  const diff = Math.max(0, now - last)
  if (diff < 2 * 60 * 1000 && item?.isActiveLocal) return 'online'
  if (diff < 10 * 60 * 1000) return 'away'
  return 'offline'
}

export function getPresenceList(summaries = []) {
  const all = getPresenceByUser()
  const now = Date.now()
  return summaries.map((summary) => {
    const item = all[summary.user.id]
    const fallback = {
      userId: summary.user.id,
      nickname: summary.user.name,
      avatarSymbol: summary.avatarSymbol,
      avatarGlyph: null,
      avatarColor: summary.avatarColor,
      currentView: 'sem sessão local',
      loginAt: summary.user.lastLoginAt,
      lastSeenAt: summary.user.lastLoginAt,
      lastActivityAt: summary.user.lastLoginAt,
      isActiveLocal: false,
      estimatedSessionSeconds: 0,
      deviceLabel: 'Navegador local',
      userAgentShort: 'sem presença registrada',
      eventsCount: 0,
    }
    const merged = { ...fallback, ...(item ?? {}) }
    return { ...merged, status: presenceStatus(merged, now) }
  }).sort((a, b) => new Date(b.lastSeenAt ?? 0) - new Date(a.lastSeenAt ?? 0))
}
