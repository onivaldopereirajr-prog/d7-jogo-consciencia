import { hashPassword } from './localAuth.js'
import { safeGetStorage, safeRemoveStorage, safeSetStorage } from '../utils/storageSafe.js'
import { createAuditEvent } from './auditLogLocal.js'

export const ADMIN_KEY = 'd7_owner_admin'
export const ADMIN_SESSION_KEY = 'd7_owner_admin_session'
export const LEGACY_ADMIN_KEY = 'd7_admin_local'
export const LEGACY_ADMIN_SESSION_KEY = 'd7_admin_session'
export const OBSERVER_KEY = 'd7_room_observer_mode'
export const ADMIN_RATE_LIMIT_KEY = 'd7_admin_login_rate_limit'
export const ADMIN_LOGIN_ATTEMPTS_KEY = 'd7_admin_login_attempts'
export const ADMIN_LOCK_UNTIL_KEY = 'd7_admin_lock_until'
const MIN_PIN_LENGTH = 6
const MAX_FAILED_ATTEMPTS = 5
const LOCK_MS = 5 * 60 * 1000

function randomToken() {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getRateLimit() {
  const legacy = safeGetStorage(ADMIN_RATE_LIMIT_KEY, null)
  const failedAttempts = Number(safeGetStorage(ADMIN_LOGIN_ATTEMPTS_KEY, legacy?.failedAttempts ?? 0) || 0)
  const lockedUntil = safeGetStorage(ADMIN_LOCK_UNTIL_KEY, legacy?.lockedUntil ?? null)
  return { failedAttempts, lockedUntil, updatedAt: legacy?.updatedAt ?? null }
}

function isLocked() {
  const rate = getRateLimit()
  const lockedUntil = rate.lockedUntil ? new Date(rate.lockedUntil).getTime() : 0
  return lockedUntil > Date.now() ? rate : null
}

function clearRateLimit() {
  safeRemoveStorage(ADMIN_RATE_LIMIT_KEY)
  safeRemoveStorage(ADMIN_LOGIN_ATTEMPTS_KEY)
  safeRemoveStorage(ADMIN_LOCK_UNTIL_KEY)
}

function registerFailedAttempt() {
  const rate = getRateLimit()
  const failedAttempts = Number(rate.failedAttempts || 0) + 1
  const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MS).toISOString() : null
  safeSetStorage(ADMIN_LOGIN_ATTEMPTS_KEY, failedAttempts)
  if (lockedUntil) safeSetStorage(ADMIN_LOCK_UNTIL_KEY, lockedUntil)
  else safeRemoveStorage(ADMIN_LOCK_UNTIL_KEY)
  return { failedAttempts, lockedUntil }
}

export function getAdminLocal() {
  const admin = safeGetStorage(ADMIN_KEY, null)
  if (admin && typeof admin === 'object' && admin.passwordHash && admin.salt) return { role: 'owner-local-admin', isOwnerLocal: true, ...admin }
  const legacy = safeGetStorage(LEGACY_ADMIN_KEY, null)
  if (legacy && typeof legacy === 'object' && legacy.passwordHash && legacy.salt) {
    const migrated = { ...legacy, alias: legacy.alias ?? 'admin', role: 'owner-local-admin', isOwnerLocal: true, migratedFrom: LEGACY_ADMIN_KEY }
    safeSetStorage(ADMIN_KEY, migrated)
    return migrated
  }
  return null
}

export function getPublicAdminLocal() {
  const admin = getAdminLocal()
  if (!admin) return null
  return { id: admin.id, name: admin.name, alias: admin.alias, role: admin.role, isOwnerLocal: admin.isOwnerLocal !== false, createdAt: admin.createdAt, lastLoginAt: admin.lastLoginAt }
}

function adminSessionPayload(adminId, rememberDevice = false) {
  const now = Date.now()
  const ttlMs = rememberDevice ? 7 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000
  return { adminId, loginAt: new Date(now).toISOString(), rememberDevice: Boolean(rememberDevice), expiresAt: new Date(now + ttlMs).toISOString() }
}

export function hasAdminSession() {
  const session = safeGetStorage(ADMIN_SESSION_KEY, null) ?? safeGetStorage(LEGACY_ADMIN_SESSION_KEY, null)
  const admin = getAdminLocal()
  if (!session?.adminId || admin?.id !== session.adminId) return false
  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
    createAuditEvent('admin_session_expired', {
      actorRole: admin.role ?? 'owner-local-admin',
      actorSafeId: admin.id,
      status: 'info',
      metadata: { rememberDevice: Boolean(session.rememberDevice), expiredAt: session.expiresAt },
    })
    safeRemoveStorage(ADMIN_SESSION_KEY)
    safeRemoveStorage(LEGACY_ADMIN_SESSION_KEY)
    return false
  }
  return true
}

export function endAdminSession() {
  const admin = getAdminLocal()
  if (admin) {
    createAuditEvent('admin_logout', {
      actorRole: admin.role ?? 'owner-local-admin',
      actorSafeId: admin.id,
      status: 'success',
    })
  }
  safeRemoveStorage(ADMIN_SESSION_KEY)
  safeRemoveStorage(LEGACY_ADMIN_SESSION_KEY)
}

export async function createAdminLocal({ name, alias, password, confirmPassword, rememberDevice = false }) {
  const cleanName = String(name ?? '').trim()
  const cleanAlias = String(alias ?? '').trim().toLowerCase()
  if (getAdminLocal()) return { ok: false, message: 'Já existe acesso administrativo local neste navegador.' }
  if (!cleanName) return { ok: false, message: 'Informe o nome do administrador.' }
  if (!cleanAlias) return { ok: false, message: 'Informe o apelido administrativo.' }
  if (!password || password.length < MIN_PIN_LENGTH) return { ok: false, message: `Use pelo menos ${MIN_PIN_LENGTH} caracteres no PIN/senha admin.` }
  if (password !== confirmPassword) return { ok: false, message: 'A confirmação do PIN/senha não confere.' }
  const salt = randomToken()
  const admin = {
    id: `d7_admin_${Date.now()}_${randomToken().slice(0, 8)}`,
    name: cleanName,
    alias: cleanAlias,
    role: 'owner-local-admin',
    isOwnerLocal: true,
    passwordHash: await hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  }
  safeSetStorage(ADMIN_KEY, admin)
  safeSetStorage(ADMIN_SESSION_KEY, adminSessionPayload(admin.id, rememberDevice))
  clearRateLimit()
  createAuditEvent('admin_login_success', { actorRole: admin.role, actorSafeId: admin.id, status: 'success', metadata: { createdAdmin: true, rememberDevice: Boolean(rememberDevice) } })
  return { ok: true, admin: getPublicAdminLocal(), message: 'Acesso administrativo local criado.' }
}

export async function loginAdminLocal({ alias, password, rememberDevice = false }) {
  const locked = isLocked()
  const cleanAlias = String(alias ?? '').trim().toLowerCase()
  if (locked) {
    createAuditEvent('admin_login_blocked', {
      actorRole: 'local-admin',
      actorSafeId: cleanAlias || 'unknown-admin',
      status: 'blocked',
      metadata: { lockedUntil: locked.lockedUntil },
    })
    return { ok: false, message: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' }
  }
  const admin = getAdminLocal()
  if (!admin || !cleanAlias || !password || (admin.alias ?? 'admin') !== cleanAlias) {
    const rate = registerFailedAttempt()
    createAuditEvent('admin_login_failed', {
      actorRole: 'local-admin',
      actorSafeId: cleanAlias || 'unknown-admin',
      status: rate.lockedUntil ? 'blocked' : 'failed',
      metadata: { failedAttempts: rate.failedAttempts, locked: Boolean(rate.lockedUntil) },
    })
    if (rate.lockedUntil) {
      createAuditEvent('admin_login_blocked', {
        actorRole: 'local-admin',
        actorSafeId: cleanAlias || 'unknown-admin',
        status: 'blocked',
        metadata: { lockedUntil: rate.lockedUntil },
      })
    }
    return { ok: false, message: rate.lockedUntil ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' : 'Credenciais administrativas inválidas.' }
  }
  const passwordHash = await hashPassword(password, admin.salt)
  if (passwordHash !== admin.passwordHash) {
    const rate = registerFailedAttempt()
    createAuditEvent('admin_login_failed', {
      actorRole: admin.role ?? 'owner-local-admin',
      actorSafeId: admin.id,
      status: rate.lockedUntil ? 'blocked' : 'failed',
      metadata: { failedAttempts: rate.failedAttempts, locked: Boolean(rate.lockedUntil) },
    })
    if (rate.lockedUntil) {
      createAuditEvent('admin_login_blocked', {
        actorRole: admin.role ?? 'owner-local-admin',
        actorSafeId: admin.id,
        status: 'blocked',
        metadata: { lockedUntil: rate.lockedUntil },
      })
    }
    return { ok: false, message: rate.lockedUntil ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' : 'Credenciais administrativas inválidas.' }
  }
  const updated = { ...admin, role: admin.role ?? 'owner-local-admin', isOwnerLocal: admin.isOwnerLocal !== false, lastLoginAt: new Date().toISOString() }
  safeSetStorage(ADMIN_KEY, updated)
  safeSetStorage(ADMIN_SESSION_KEY, adminSessionPayload(admin.id, rememberDevice))
  clearRateLimit()
  createAuditEvent('admin_login_success', {
    actorRole: updated.role,
    actorSafeId: updated.id,
    status: 'success',
    metadata: { rememberDevice: Boolean(rememberDevice) },
  })
  return { ok: true, admin: getPublicAdminLocal(), message: 'Admin local autenticado.' }
}

export function getObserverMode() {
  return Boolean(safeGetStorage(OBSERVER_KEY, false))
}

export function setObserverMode(enabled) {
  safeSetStorage(OBSERVER_KEY, Boolean(enabled))
  return Boolean(enabled)
}
