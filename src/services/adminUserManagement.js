import { ADMIN_AUDIT_KEY, PAGE_VIEWS_KEY, SECURITY_ALERTS_KEY, SESSION_EVENTS_KEY, trackAdminEvent } from './adminAnalyticsService.js'
import { LOCAL_EVENTS_KEY } from './analyticsLocal.js'
import { ADMIN_KEY, ADMIN_LOGIN_ATTEMPTS_KEY, ADMIN_LOCK_UNTIL_KEY, ADMIN_RATE_LIMIT_KEY, ADMIN_SESSION_KEY, LEGACY_ADMIN_KEY, LEGACY_ADMIN_SESSION_KEY, OBSERVER_KEY, getAdminLocal } from './adminLocal.js'
import { LANGUAGE_KEY } from './languageService.js'
import { MANTRA_SETTINGS_KEY } from './mantraAudioService.js'
import { PRESENCE_KEY, SESSION_ID_KEY } from './presenceService.js'
import { PROGRESS_BY_USER_KEY } from './localProgress.js'
import { RADIO_SETTINGS_KEY } from './radioService.js'
import { PLAYER_ROOMS_KEY, ROOM_STATE_KEY, getRoomState, saveRoomState } from './roomLocal.js'
import { SEAL_EVENTS_KEY } from './sealEngine.js'
import { SESSION_KEY, USERS_KEY, getCurrentSession, getUsers, hashPassword, logout, saveUsers } from './localAuth.js'
import { WELCOME_SPIN_KEY, WHEEL_EVENTS_KEY } from './wheelService.js'
import { LEGACY_KEY, STORAGE_KEY } from '../utils/gameState.js'
import { safeGetStorage, safeRemoveStorage, safeSetStorage } from '../utils/storageSafe.js'
import { AUDIT_LOG_KEY, createAuditEvent } from './auditLogLocal.js'
import { SCREEN_TIME_KEY } from './adminUserMonitoring.js'
import { PLAN_IDS, USER_PLANS_KEY, getLocalPlan, getPlanDefinition, setLocalPlan } from './subscriptionLocal.js'

const MIN_PASSWORD_LENGTH = 6
const ENTRANCE_KEY = 'd7_entrance_seen'
const SENSITIVE_FIELD_TOKENS = ['password', 'pin', 'hash', 'salt', 'secret', 'recovery']

export const D7_LOCAL_STORAGE_KEYS = [
  USERS_KEY,
  SESSION_KEY,
  PROGRESS_BY_USER_KEY,
  PRESENCE_KEY,
  SESSION_ID_KEY,
  LOCAL_EVENTS_KEY,
  SESSION_EVENTS_KEY,
  ADMIN_AUDIT_KEY,
  SECURITY_ALERTS_KEY,
  PAGE_VIEWS_KEY,
  ROOM_STATE_KEY,
  PLAYER_ROOMS_KEY,
  WHEEL_EVENTS_KEY,
  WELCOME_SPIN_KEY,
  SEAL_EVENTS_KEY,
  ADMIN_KEY,
  ADMIN_SESSION_KEY,
  ADMIN_RATE_LIMIT_KEY,
  ADMIN_LOGIN_ATTEMPTS_KEY,
  ADMIN_LOCK_UNTIL_KEY,
  AUDIT_LOG_KEY,
  SCREEN_TIME_KEY,
  USER_PLANS_KEY,
  LEGACY_ADMIN_KEY,
  LEGACY_ADMIN_SESSION_KEY,
  OBSERVER_KEY,
  LANGUAGE_KEY,
  RADIO_SETTINGS_KEY,
  MANTRA_SETTINGS_KEY,
  ENTRANCE_KEY,
  STORAGE_KEY,
  LEGACY_KEY,
]

function randomToken() {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function isSensitiveField(key) {
  const normalized = String(key).toLowerCase()
  return SENSITIVE_FIELD_TOKENS.some((token) => normalized.includes(token))
}

function isD7StorageKey(key) {
  return typeof key === 'string' && (key.startsWith('d7_') || key.startsWith('d7-'))
}

function getD7LocalStorageKeys() {
  const keys = new Set(D7_LOCAL_STORAGE_KEYS.filter(isD7StorageKey))
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (isD7StorageKey(key)) keys.add(key)
    }
  }
  return [...keys]
}

export function sanitizeAdminData(value) {
  if (Array.isArray(value)) return value.map(sanitizeAdminData)
  if (!isPlainObject(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitiveField(key))
      .map(([key, item]) => [key, sanitizeAdminData(item)]),
  )
}

function getObjectByUserKey(key) {
  const data = safeGetStorage(key, {})
  return isPlainObject(data) ? data : {}
}

function setObjectWithoutUser(key, userId) {
  const data = getObjectByUserKey(key)
  if (!Object.hasOwn(data, userId)) return false
  const next = { ...data }
  delete next[userId]
  safeSetStorage(key, next)
  return true
}

function filterArrayStorage(key, predicate) {
  const items = safeGetStorage(key, [])
  if (!Array.isArray(items)) return 0
  const next = items.filter(predicate)
  safeSetStorage(key, next)
  return items.length - next.length
}

function makeBackupBase(type, extra = {}) {
  return {
    type,
    generatedAt: new Date().toISOString(),
    note: 'Backup local sanitizado. Não inclui senha, hash, salt nem segredo de recuperação.',
    ...extra,
  }
}

export function buildFullLocalBackup(type = 'manual_admin_backup') {
  const storage = {}
  getD7LocalStorageKeys().forEach((key) => {
    const value = safeGetStorage(key, null)
    if (value !== null) storage[key] = sanitizeAdminData(value)
  })
  return makeBackupBase(type, { storage })
}

export function buildUserBackup(userId, type = 'user_admin_backup') {
  const users = getUsers()
  const user = users.find((item) => item.id === userId)
  const progress = getObjectByUserKey(PROGRESS_BY_USER_KEY)[userId] ?? null
  const presence = getObjectByUserKey(PRESENCE_KEY)[userId] ?? null
  const localEvents = getObjectByUserKey(LOCAL_EVENTS_KEY)[userId] ?? []
  const sessionEvents = getObjectByUserKey(SESSION_EVENTS_KEY)[userId] ?? []
  const pageViews = getObjectByUserKey(PAGE_VIEWS_KEY)[userId] ?? []
  const wheelEvents = getObjectByUserKey(WHEEL_EVENTS_KEY)[userId] ?? []
  const welcomeSpin = getObjectByUserKey(WELCOME_SPIN_KEY)[userId] ?? null
  const sealEvents = getObjectByUserKey(SEAL_EVENTS_KEY)[userId] ?? []
  const roomState = getRoomState()
  const room = {
    messages: (roomState.messages ?? []).filter((message) => message.userId === userId).map(sanitizeAdminData),
    permission: roomState.permissions?.[userId] ? sanitizeAdminData(roomState.permissions[userId]) : null,
  }
  const alerts = safeGetStorage(SECURITY_ALERTS_KEY, []).filter((alert) => alert.userId === userId || alert.metadata?.userId === userId)
  const planId = getLocalPlan(userId)

  return makeBackupBase(type, {
    userId,
    user: sanitizeAdminData(user ?? null),
    plan: sanitizeAdminData(getPlanDefinition(planId)),
    progress: sanitizeAdminData(progress),
    presence: sanitizeAdminData(presence),
    events: {
      local: sanitizeAdminData(localEvents),
      session: sanitizeAdminData(sessionEvents),
      pageViews: sanitizeAdminData(pageViews),
      wheel: sanitizeAdminData(wheelEvents),
      seals: sanitizeAdminData(sealEvents),
    },
    welcomeSpin: sanitizeAdminData(welcomeSpin),
    room,
    alerts: sanitizeAdminData(alerts),
  })
}

export function downloadJsonBackup(backup, filenamePrefix = 'd7-backup-local') {
  createAuditEvent('backup_exported', {
    actorRole: 'owner-local-admin',
    actorSafeId: 'local-admin',
    status: 'success',
    metadata: { backupType: backup?.type ?? 'local_backup', filenamePrefix },
  })
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function changeLocalUserPlanFromAdmin({ userId, planId }) {
  const users = getUsers()
  const user = users.find((item) => item.id === userId)
  if (!user) return { ok: false, message: 'Usuário local não encontrado.' }
  if (planId === PLAN_IDS.FOUNDER && !getAdminLocal()) return { ok: false, message: 'Founder/Admin local exige admin/owner autenticado.' }

  const beforePlanId = getLocalPlan(userId)
  const result = setLocalPlan(userId, planId)
  if (!result.ok) return result

  createAuditEvent('user_plan_changed', {
    actorRole: 'owner-local-admin',
    actorSafeId: 'local-admin',
    targetSafeId: user.id,
    status: 'success',
    metadata: {
      beforePlanId,
      afterPlanId: result.planId,
      targetRole: user.role ?? 'player',
    },
  })
  trackAdminEvent('local-admin', 'admin_user_plan_changed', { targetUserId: userId, beforePlanId, afterPlanId: result.planId })
  return { ok: true, planId: result.planId, message: "Plano local de " + user.name + " alterado para " + result.plan.publicName + ". Mudança de plano é local neste navegador." }
}

export function isProtectedLocalUser(user) {
  const admin = getAdminLocal()
  const session = getCurrentSession()
  const loginMatchesAdmin = Boolean(admin?.alias && user?.login && admin.alias === user.login)
  const role = String(user?.role ?? '').toLowerCase()
  const hasAdminRole = role.includes('admin') || role.includes('owner')
  return Boolean(user?.id && session?.userId === user.id) || loginMatchesAdmin || hasAdminRole
}

export async function resetUserPasswordFromAdmin({ userId, password, confirmPassword }) {
  const users = getUsers()
  const user = users.find((item) => item.id === userId)
  if (!user) return { ok: false, message: 'Usuário local não encontrado.' }
  if (!password || password.length < MIN_PASSWORD_LENGTH) return { ok: false, message: `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` }
  if (password !== confirmPassword) return { ok: false, message: 'A confirmação da nova senha/PIN não confere.' }

  const salt = randomToken()
  const passwordHash = await hashPassword(password, salt)
  saveUsers(users.map((item) => item.id === userId ? { ...item, salt, passwordHash, updatedAt: new Date().toISOString(), passwordResetByAdminAt: new Date().toISOString() } : item))
  createAuditEvent('user_password_reset', {
    actorRole: 'owner-local-admin',
    actorSafeId: 'local-admin',
    targetSafeId: user.id,
    status: 'success',
    metadata: { targetRole: user.role ?? 'player' },
  })
  trackAdminEvent('local-admin', 'admin_user_password_reset', { targetUserId: userId, targetLogin: user.login })
  return { ok: true, message: `Senha/PIN de ${user.name} redefinida localmente.` }
}

export function deleteLocalUserFromAdmin({ userId, confirmation }) {
  const users = getUsers()
  const user = users.find((item) => item.id === userId)
  if (!user) return { ok: false, message: 'Usuário local não encontrado.' }

  const protectedUser = isProtectedLocalUser(user)
  const expected = protectedUser ? 'EXCLUIR ADMIN' : 'EXCLUIR'
  if (confirmation !== expected) return { ok: false, message: `Digite ${expected} para confirmar.` }

  const beforeBackup = buildUserBackup(userId, 'before_delete_user')
  saveUsers(users.filter((item) => item.id !== userId))

  const session = getCurrentSession()
  if (session?.userId === userId) logout()

  const removed = {
    progress: setObjectWithoutUser(PROGRESS_BY_USER_KEY, userId),
    presence: setObjectWithoutUser(PRESENCE_KEY, userId),
    localEvents: setObjectWithoutUser(LOCAL_EVENTS_KEY, userId),
    sessionEvents: setObjectWithoutUser(SESSION_EVENTS_KEY, userId),
    pageViews: setObjectWithoutUser(PAGE_VIEWS_KEY, userId),
    wheelEvents: setObjectWithoutUser(WHEEL_EVENTS_KEY, userId),
    welcomeSpin: setObjectWithoutUser(WELCOME_SPIN_KEY, userId),
    sealEvents: setObjectWithoutUser(SEAL_EVENTS_KEY, userId),
    plans: setObjectWithoutUser(USER_PLANS_KEY, userId),
    auditEvents: filterArrayStorage(ADMIN_AUDIT_KEY, (event) => event.userId !== userId && event.metadata?.targetUserId !== userId),
    alerts: filterArrayStorage(SECURITY_ALERTS_KEY, (alert) => alert.userId !== userId && alert.metadata?.userId !== userId && alert.metadata?.targetUserId !== userId),
  }

  const currentSessionId = safeGetStorage(SESSION_ID_KEY, null)
  if (currentSessionId?.userId === userId) safeRemoveStorage(SESSION_ID_KEY)

  const roomState = getRoomState()
  const permissions = { ...(roomState.permissions ?? {}) }
  delete permissions[userId]
  saveRoomState({
    ...roomState,
    permissions,
    messages: (roomState.messages ?? []).filter((message) => message.userId !== userId),
  })

  createAuditEvent('user_deleted', {
    actorRole: 'owner-local-admin',
    actorSafeId: 'local-admin',
    targetSafeId: user.id,
    status: 'success',
    metadata: { protectedUser, removed },
  })
  trackAdminEvent('local-admin', 'admin_user_deleted', { targetUserId: userId, targetLogin: user.login, protectedUser })
  return { ok: true, message: `Usuário local ${user.name} excluído deste navegador.`, backup: beforeBackup, removed }
}

export function clearStalePresence(minutes = 10) {
  const all = getObjectByUserKey(PRESENCE_KEY)
  const cutoff = Date.now() - Math.max(1, Number(minutes) || 10) * 60 * 1000
  const entries = Object.entries(all)
  const next = Object.fromEntries(entries.filter(([, item]) => {
    const last = item?.lastSeenAt ? new Date(item.lastSeenAt).getTime() : 0
    return last >= cutoff
  }))
  safeSetStorage(PRESENCE_KEY, next)

  const sessionRef = safeGetStorage(SESSION_ID_KEY, null)
  if (sessionRef?.userId && !next[sessionRef.userId]) safeRemoveStorage(SESSION_ID_KEY)

  const removedCount = entries.length - Object.keys(next).length
  trackAdminEvent('local-admin', 'admin_stale_presence_cleared', { removedCount, minutes })
  return { ok: true, removedCount, message: `${removedCount} presença(s) antiga(s) removida(s). Usuários não foram apagados.` }
}

export function resetLocalD7Environment() {
  const keys = getD7LocalStorageKeys()
  createAuditEvent('local_environment_reset', {
    actorRole: 'owner-local-admin',
    actorSafeId: 'local-admin',
    status: 'success',
    metadata: { keysCount: keys.length },
  })
  const backup = buildFullLocalBackup('before_reset_local_d7')
  keys.forEach((key) => safeRemoveStorage(key))
  return { ok: true, backup, message: 'Ambiente local D7 resetado neste navegador.' }
}
