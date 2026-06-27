import { hashPassword } from './localAuth.js'
import { safeGetStorage, safeRemoveStorage, safeSetStorage } from '../utils/storageSafe.js'

export const ADMIN_KEY = 'd7_admin_local'
export const ADMIN_SESSION_KEY = 'd7_admin_session'
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
  return admin && typeof admin === 'object' && admin.passwordHash && admin.salt ? admin : null
}

export function getPublicAdminLocal() {
  const admin = getAdminLocal()
  if (!admin) return null
  return { id: admin.id, name: admin.name, createdAt: admin.createdAt, lastLoginAt: admin.lastLoginAt }
}

export function hasAdminSession() {
  const session = safeGetStorage(ADMIN_SESSION_KEY, null)
  const admin = getAdminLocal()
  return Boolean(session?.adminId && admin?.id === session.adminId)
}

export function endAdminSession() {
  safeRemoveStorage(ADMIN_SESSION_KEY)
}

export async function createAdminLocal({ name, password, confirmPassword }) {
  const cleanName = String(name ?? '').trim()
  if (getAdminLocal()) return { ok: false, message: 'Já existe acesso administrativo local neste navegador.' }
  if (!cleanName) return { ok: false, message: 'Informe o nome do administrador.' }
  if (!password || password.length < MIN_PIN_LENGTH) return { ok: false, message: `Use pelo menos ${MIN_PIN_LENGTH} caracteres no PIN/senha admin.` }
  if (password !== confirmPassword) return { ok: false, message: 'A confirmação do PIN/senha não confere.' }
  const salt = randomToken()
  const admin = {
    id: `d7_admin_${Date.now()}_${randomToken().slice(0, 8)}`,
    name: cleanName,
    passwordHash: await hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  }
  safeSetStorage(ADMIN_KEY, admin)
  safeSetStorage(ADMIN_SESSION_KEY, { adminId: admin.id, loginAt: new Date().toISOString() })
  return { ok: true, admin: getPublicAdminLocal(), message: 'Acesso administrativo local criado.' }
}

export async function loginAdminLocal({ password }) {
  const admin = getAdminLocal()
  if (!admin) return { ok: false, message: 'Crie o acesso administrativo local primeiro.' }
  if (!password) return { ok: false, message: 'Informe o PIN/senha admin.' }
  const passwordHash = await hashPassword(password, admin.salt)
  if (passwordHash !== admin.passwordHash) return { ok: false, message: 'PIN/senha admin inválido.' }
  const updated = { ...admin, lastLoginAt: new Date().toISOString() }
  safeSetStorage(ADMIN_KEY, updated)
  safeSetStorage(ADMIN_SESSION_KEY, { adminId: admin.id, loginAt: new Date().toISOString() })
  return { ok: true, admin: getPublicAdminLocal(), message: 'Admin local autenticado.' }
}

export function getObserverMode() {
  return Boolean(safeGetStorage(OBSERVER_KEY, false))
}

export function setObserverMode(enabled) {
  safeSetStorage(OBSERVER_KEY, Boolean(enabled))
  return Boolean(enabled)
}
