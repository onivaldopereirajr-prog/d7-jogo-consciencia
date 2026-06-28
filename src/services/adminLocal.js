import { hashPassword } from './localAuth.js'
import { safeGetStorage, safeRemoveStorage, safeSetStorage } from '../utils/storageSafe.js'

export const ADMIN_KEY = 'd7_owner_admin'
export const ADMIN_SESSION_KEY = 'd7_owner_admin_session'
export const LEGACY_ADMIN_KEY = 'd7_admin_local'
export const LEGACY_ADMIN_SESSION_KEY = 'd7_admin_session'
export const OBSERVER_KEY = 'd7_room_observer_mode'
const MIN_PIN_LENGTH = 6

function randomToken() {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getAdminLocal() {
  const admin = safeGetStorage(ADMIN_KEY, null)
  if (admin && typeof admin === 'object' && admin.passwordHash && admin.salt) return admin
  const legacy = safeGetStorage(LEGACY_ADMIN_KEY, null)
  if (legacy && typeof legacy === 'object' && legacy.passwordHash && legacy.salt) {
    const migrated = { ...legacy, alias: legacy.alias ?? 'admin', migratedFrom: LEGACY_ADMIN_KEY }
    safeSetStorage(ADMIN_KEY, migrated)
    return migrated
  }
  return null
}

export function getPublicAdminLocal() {
  const admin = getAdminLocal()
  if (!admin) return null
  return { id: admin.id, name: admin.name, alias: admin.alias, createdAt: admin.createdAt, lastLoginAt: admin.lastLoginAt }
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
    endAdminSession()
    return false
  }
  return true
}

export function endAdminSession() {
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
    passwordHash: await hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  }
  safeSetStorage(ADMIN_KEY, admin)
  safeSetStorage(ADMIN_SESSION_KEY, adminSessionPayload(admin.id, rememberDevice))
  return { ok: true, admin: getPublicAdminLocal(), message: 'Acesso administrativo local criado.' }
}

export async function loginAdminLocal({ alias, password, rememberDevice = false }) {
  const admin = getAdminLocal()
  const cleanAlias = String(alias ?? '').trim().toLowerCase()
  if (!admin) return { ok: false, message: 'Crie o acesso administrativo local primeiro.' }
  if (!cleanAlias) return { ok: false, message: 'Informe o apelido administrativo.' }
  if ((admin.alias ?? 'admin') !== cleanAlias) return { ok: false, message: 'Apelido administrativo inválido.' }
  if (!password) return { ok: false, message: 'Informe o PIN/senha admin.' }
  const passwordHash = await hashPassword(password, admin.salt)
  if (passwordHash !== admin.passwordHash) return { ok: false, message: 'PIN/senha admin inválido.' }
  const updated = { ...admin, lastLoginAt: new Date().toISOString() }
  safeSetStorage(ADMIN_KEY, updated)
  safeSetStorage(ADMIN_SESSION_KEY, adminSessionPayload(admin.id, rememberDevice))
  return { ok: true, admin: getPublicAdminLocal(), message: 'Admin local autenticado.' }
}

export function getObserverMode() {
  return Boolean(safeGetStorage(OBSERVER_KEY, false))
}

export function setObserverMode(enabled) {
  safeSetStorage(OBSERVER_KEY, Boolean(enabled))
  return Boolean(enabled)
}
