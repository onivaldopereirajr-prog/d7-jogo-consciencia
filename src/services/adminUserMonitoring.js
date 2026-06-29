import { createAuditEvent } from './auditLogLocal.js'
import { getAdminLocal } from './adminLocal.js'
import { getUsers, saveUsers } from './localAuth.js'
import { getAllLocalSummaries } from './localProgress.js'
import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'

export const SCREEN_TIME_KEY = 'd7_screen_time_by_user'
const MAX_REASON_LENGTH = 160
const TOTAL_TRAINING_DAYS = 28

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function daysBetween(dateValue, now = new Date()) {
  if (!dateValue) return null
  const start = new Date(`${String(dateValue).slice(0, 10)}T00:00:00`)
  const end = new Date(`${now.toISOString().slice(0, 10)}T00:00:00`)
  if (Number.isNaN(start.getTime())) return null
  return Math.round((end - start) / 86400000)
}

function normalizeViewName(viewName) {
  const value = String(viewName ?? 'home').trim().toLowerCase()
  const allowed = new Set(['home', 'jornada', 'pratica', 'codice', 'perfil', 'biblioteca', 'sala', 'roda', 'admin', 'ranking', 'acompanhamento'])
  return allowed.has(value) ? value : 'home'
}

function safeReason(reason) {
  return String(reason ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_REASON_LENGTH)
}

function getScreenTimeStore() {
  const data = safeGetStorage(SCREEN_TIME_KEY, {})
  return isPlainObject(data) ? data : {}
}

function saveScreenTimeStore(data) {
  safeSetStorage(SCREEN_TIME_KEY, data)
}

function getUserById(userId) {
  return getUsers().find((user) => user.id === userId) ?? null
}

function isProtectedUser(user) {
  const admin = getAdminLocal()
  const role = String(user?.role ?? '').toLowerCase()
  return Boolean(role.includes('admin') || role.includes('owner') || (admin?.alias && user?.login && admin.alias === user.login))
}

export function getUserScreenTimeSummary(userId) {
  const item = getScreenTimeStore()[userId]
  if (!isPlainObject(item)) return { totalSeconds: 0, byView: {}, currentSessionSeconds: 0, lastSeenAt: null }
  return {
    totalSeconds: Number(item.totalSeconds || 0),
    byView: isPlainObject(item.byView) ? item.byView : {},
    currentSessionSeconds: Number(item.currentSessionSeconds || 0),
    lastSeenAt: item.lastSeenAt ?? null,
  }
}

export function startScreenTimeSession(userId) {
  if (!userId) return null
  const all = getScreenTimeStore()
  const current = getUserScreenTimeSummary(userId)
  const next = { ...current, currentSessionSeconds: 0, lastSeenAt: new Date().toISOString() }
  saveScreenTimeStore({ ...all, [userId]: next })
  return next
}

export function recordScreenTimeTick(userId, viewName, seconds = 15) {
  if (!userId) return null
  const safeSeconds = Math.min(60, Math.max(1, Math.round(Number(seconds) || 0)))
  const view = normalizeViewName(viewName)
  const all = getScreenTimeStore()
  const current = getUserScreenTimeSummary(userId)
  const next = {
    totalSeconds: current.totalSeconds + safeSeconds,
    byView: { ...current.byView, [view]: Number(current.byView[view] || 0) + safeSeconds },
    currentSessionSeconds: current.currentSessionSeconds + safeSeconds,
    lastSeenAt: new Date().toISOString(),
  }
  saveScreenTimeStore({ ...all, [userId]: next })
  return next
}

export function getUserTrainingStatus(summary) {
  if (!summary?.user?.id) return { label: 'Sem dados suficientes neste navegador.', state: 'unknown', percent: 0, delayed: false, following: false }
  const completed = Number(summary.completedPractices ?? 0)
  const lastPracticeDate = summary.lastPracticeDate ?? null
  const dayGap = daysBetween(lastPracticeDate)
  const percent = Math.min(100, Math.round((completed / TOTAL_TRAINING_DAYS) * 100))
  if (completed <= 0 && !lastPracticeDate) return { label: 'Não iniciou', state: 'not_started', percent: 0, delayed: false, following: false }
  const delayed = dayGap !== null && dayGap > 2
  const following = completed > 0 && !delayed
  return {
    label: delayed ? 'Trilha atrasada' : following ? 'Seguindo a trilha' : 'Sem dados suficientes neste navegador.',
    state: delayed ? 'delayed' : following ? 'following' : 'unknown',
    percent,
    delayed,
    following,
    completedPractices: completed,
    lastPracticeDate,
  }
}

function buildMonitoringSummary(summary) {
  const user = getUserById(summary.user.id) ?? summary.user
  const screenTime = getUserScreenTimeSummary(summary.user.id)
  const training = getUserTrainingStatus(summary)
  return {
    safeId: summary.user.id,
    name: summary.user.name,
    alias: summary.user.login,
    role: summary.user.role ?? user.role ?? 'player',
    status: user.status ?? 'active',
    blockedAt: user.blockedAt ?? null,
    blockedReason: user.blockedReason ?? null,
    createdAt: summary.user.createdAt,
    lastLoginAt: summary.user.lastLoginAt,
    localStatus: user.status === 'blocked' ? 'bloqueado localmente' : 'ativo local',
    currentCycle: summary.currentStage ?? null,
    level: summary.level ?? 0,
    xp: summary.xp ?? 0,
    score: summary.score ?? 0,
    sparks: summary.sparks ?? 0,
    completedPractices: summary.completedPractices ?? 0,
    lastPracticeDate: summary.lastPracticeDate ?? null,
    screenTime,
    training,
    progressScore: Number(summary.score ?? 0) + Number(summary.xp ?? 0) + Number(summary.completedPractices ?? 0) * 100,
  }
}

export function listUserMonitoringSummaries() {
  return getAllLocalSummaries().map(buildMonitoringSummary)
}

export function searchUserMonitoringSummaries(query = '', filters = {}) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase()
  const status = filters.status ?? 'todos'
  const training = filters.training ?? 'todos'
  const sort = filters.sort ?? 'ultimo_acesso'
  const now = new Date()
  let rows = listUserMonitoringSummaries().filter((row) => {
    const haystack = `${row.name} ${row.alias} ${row.safeId}`.toLowerCase()
    if (normalizedQuery && !haystack.includes(normalizedQuery)) return false
    if (status === 'ativos' && row.status === 'blocked') return false
    if (status === 'inativos' && daysBetween(row.lastLoginAt, now) !== null && daysBetween(row.lastLoginAt, now) <= 7) return false
    if (status === 'bloqueados' && row.status !== 'blocked') return false
    if (status === 'seguindo_trilha' && row.training.state !== 'following') return false
    if (status === 'trilha_atrasada' && row.training.state !== 'delayed') return false
    if (status === 'sem_progresso' && row.completedPractices > 0) return false
    if (training === 'seguindo' && row.training.state !== 'following') return false
    if (training === 'atrasada' && row.training.state !== 'delayed') return false
    if (training === 'sem_progresso' && row.training.state !== 'not_started') return false
    return true
  })
  rows = rows.sort((a, b) => {
    if (sort === 'maior_progresso') return b.progressScore - a.progressScore
    if (sort === 'menor_progresso') return a.progressScore - b.progressScore
    if (sort === 'maior_tempo') return b.screenTime.totalSeconds - a.screenTime.totalSeconds
    return new Date(b.lastLoginAt ?? 0) - new Date(a.lastLoginAt ?? 0)
  })
  return rows
}

export function getMonitoringCounters() {
  const rows = listUserMonitoringSummaries()
  return {
    total: rows.length,
    active: rows.filter((row) => row.status !== 'blocked').length,
    blocked: rows.filter((row) => row.status === 'blocked').length,
    noProgress: rows.filter((row) => row.training.state === 'not_started').length,
    following: rows.filter((row) => row.training.state === 'following').length,
  }
}

export function blockLocalUser(userId, reason = '', confirmation = 'BLOQUEAR') {
  const users = getUsers()
  const user = users.find((item) => item.id === userId)
  if (!user) return { ok: false, message: 'Usuário local não encontrado.' }
  const protectedUser = isProtectedUser(user)
  const expected = protectedUser ? 'BLOQUEAR ADMIN' : 'BLOQUEAR'
  if (confirmation !== expected) return { ok: false, message: `Digite ${expected} para confirmar.` }
  const blockedReason = safeReason(reason)
  const updated = { ...user, status: 'blocked', blockedAt: new Date().toISOString(), blockedReason }
  saveUsers(users.map((item) => item.id === userId ? updated : item))
  createAuditEvent('user_blocked', {
    actorRole: 'owner-local-admin',
    actorSafeId: 'local-admin',
    targetSafeId: user.id,
    status: 'success',
    metadata: { protectedUser, hasReason: Boolean(blockedReason) },
  })
  return { ok: true, message: `${user.name} bloqueado localmente neste navegador.` }
}

export function unblockLocalUser(userId) {
  const users = getUsers()
  const user = users.find((item) => item.id === userId)
  if (!user) return { ok: false, message: 'Usuário local não encontrado.' }
  const updated = { ...user, status: 'active', blockedAt: null, blockedReason: null }
  saveUsers(users.map((item) => item.id === userId ? updated : item))
  createAuditEvent('user_unblocked', {
    actorRole: 'owner-local-admin',
    actorSafeId: 'local-admin',
    targetSafeId: user.id,
    status: 'success',
  })
  return { ok: true, message: `${user.name} desbloqueado localmente neste navegador.` }
}

export function getTodayScreenTimeKey() {
  return todayKey()
}
