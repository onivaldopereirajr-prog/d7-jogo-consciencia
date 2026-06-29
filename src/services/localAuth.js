import { safeGetStorage, safeRemoveStorage, safeSetStorage } from '../utils/storageSafe.js'
import { createAuditEvent } from './auditLogLocal.js'

export const USERS_KEY = 'd7_local_users'
export const SESSION_KEY = 'd7_current_session'

const MIN_PASSWORD_LENGTH = 6

function normalizeLogin(login) {
  return login.trim().toLowerCase()
}

function randomToken() {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fallbackHash(value) {
  // Fallback local para navegadores sem Web Crypto. Nao e seguranca real de producao.
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return `fallback-${(hash >>> 0).toString(16)}`
}

export async function hashPassword(password, salt) {
  const value = `${salt}:${password}`
  if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const encoded = new TextEncoder().encode(value)
    return toHex(await globalThis.crypto.subtle.digest('SHA-256', encoded))
  }
  return fallbackHash(value)
}

export function getUsers() {
  const users = safeGetStorage(USERS_KEY, [])
  return Array.isArray(users) ? users : []
}

export function getPublicUsers() {
  return getUsers().map(publicUser)
}

export function saveUsers(users) {
  return safeSetStorage(USERS_KEY, users)
}

export function getCurrentSession() {
  const session = safeGetStorage(SESSION_KEY, null)
  if (!session?.userId) return null
  const exists = getUsers().some((user) => user.id === session.userId)
  if (!exists) {
    safeRemoveStorage(SESSION_KEY)
    return null
  }
  return session
}

export function getCurrentUser() {
  const session = getCurrentSession()
  if (!session) return null
  return getUsers().find((user) => user.id === session.userId) ?? null
}

export function setCurrentSession(userId) {
  const session = { userId, loginAt: new Date().toISOString() }
  safeSetStorage(SESSION_KEY, session)
  return session
}

export function logout() {
  safeRemoveStorage(SESSION_KEY)
}

export async function registerUser({ name, login, password, confirmPassword }) {
  const cleanName = name.trim()
  const cleanLogin = normalizeLogin(login)
  if (!cleanName) return { ok: false, message: 'Informe o nome do usuário.' }
  if (!cleanLogin) return { ok: false, message: 'Informe um apelido ou e-mail local.' }
  if (!password) return { ok: false, message: 'Informe uma senha.' }
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, message: `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres na senha.` }
  if (password !== confirmPassword) return { ok: false, message: 'A confirmação de senha não confere.' }

  const users = getUsers()
  if (users.some((user) => user.login === cleanLogin)) return { ok: false, message: 'Já existe um usuário local com esse apelido/e-mail.' }

  const salt = randomToken()
  const passwordHash = await hashPassword(password, salt)
  const user = {
    id: `d7_user_${Date.now()}_${randomToken().slice(0, 8)}`,
    name: cleanName,
    login: cleanLogin,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    role: 'player',
  }
  saveUsers([...users, user])
  setCurrentSession(user.id)
  return { ok: true, user, message: 'Conta local criada.' }
}

export async function loginUser({ login, password }) {
  const cleanLogin = normalizeLogin(login)
  if (!cleanLogin || !password) return { ok: false, message: 'Informe login e senha.' }
  const users = getUsers()
  const user = users.find((item) => item.login === cleanLogin)
  if (!user) return { ok: false, message: 'Usuário local não encontrado neste navegador. Verifique o apelido digitado ou crie uma nova conta local.' }
  const passwordHash = await hashPassword(password, user.salt)
  if (passwordHash !== user.passwordHash) return { ok: false, message: 'Senha inválida.' }
  const updated = { ...user, lastLoginAt: new Date().toISOString() }
  saveUsers(users.map((item) => (item.id === user.id ? updated : item)))
  setCurrentSession(user.id)
  return { ok: true, user: updated, message: 'Login local realizado.' }
}

export async function resetLocalPassword({ userId, password, confirmPassword }) {
  const users = getUsers()
  const user = users.find((item) => item.id === userId)
  if (!user) return { ok: false, message: 'Usuário local não encontrado neste navegador.' }
  if (!password) return { ok: false, message: 'Informe a nova senha.' }
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, message: `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres na senha.` }
  if (password !== confirmPassword) return { ok: false, message: 'A confirmação da nova senha não confere.' }
  const salt = randomToken()
  const passwordHash = await hashPassword(password, salt)
  const updated = { ...user, salt, passwordHash, updatedAt: new Date().toISOString() }
  saveUsers(users.map((item) => (item.id === user.id ? updated : item)))
  createAuditEvent('user_password_reset', {
    actorRole: user.role ?? 'player',
    actorSafeId: user.id,
    targetSafeId: user.id,
    status: 'success',
    metadata: { selfService: true },
  })
  return { ok: true, user: updated, message: 'Senha local redefinida. Agora você pode entrar novamente.' }
}

export function deleteUser(userId) {
  const user = getUsers().find((item) => item.id === userId)
  const users = getUsers().filter((item) => item.id !== userId)
  saveUsers(users)
  if (user) {
    createAuditEvent('user_deleted', {
      actorRole: user.role ?? 'player',
      actorSafeId: user.id,
      targetSafeId: user.id,
      status: 'success',
      metadata: { selfService: true },
    })
  }
  const session = getCurrentSession()
  if (session?.userId === userId) logout()
}

export function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    role: user.role,
  }
}
