import { safeGetStorage, safeRemoveStorage, safeSetStorage } from '../utils/storageSafe.js'

export const AUDIT_LOG_KEY = 'd7_audit_logs'

const SENSITIVE_FIELD_TOKENS = ['password', 'pin', 'hash', 'salt', 'secret', 'recovery', 'token']
const MAX_AUDIT_EVENTS = 300

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function isSensitiveField(key) {
  const normalized = String(key).toLowerCase()
  return SENSITIVE_FIELD_TOKENS.some((token) => normalized.includes(token))
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `d7_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function sanitizeAuditData(value) {
  if (Array.isArray(value)) return value.map(sanitizeAuditData)
  if (!isPlainObject(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitiveField(key))
      .map(([key, item]) => [key, sanitizeAuditData(item)]),
  )
}

function safeText(value, fallback = 'local-admin') {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, 80) : fallback
}

export function listAuditEvents() {
  const events = safeGetStorage(AUDIT_LOG_KEY, [])
  return Array.isArray(events) ? events : []
}

export function createAuditEvent(action, payload = {}) {
  const safePayload = sanitizeAuditData(payload)
  const event = {
    id: makeId(),
    action: safeText(action, 'unknown_action'),
    actorRole: safeText(safePayload.actorRole, 'local-admin'),
    actorSafeId: safeText(safePayload.actorSafeId ?? safePayload.actorName, 'local-admin'),
    targetSafeId: safePayload.targetSafeId ? safeText(safePayload.targetSafeId, '') : null,
    timestamp: new Date().toISOString(),
    status: safeText(safePayload.status, 'info'),
    metadata: sanitizeAuditData(safePayload.metadata ?? {}),
  }
  const next = [event, ...listAuditEvents()].slice(0, MAX_AUDIT_EVENTS)
  safeSetStorage(AUDIT_LOG_KEY, next)
  return event
}

export function clearAuditEvents({ actorSafeId = 'local-admin', actorRole = 'owner-local-admin' } = {}) {
  safeRemoveStorage(AUDIT_LOG_KEY)
  return createAuditEvent('audit_logs_cleared', { actorSafeId, actorRole, status: 'success' })
}

export function exportAuditEvents() {
  return {
    type: 'd7_local_audit_logs',
    generatedAt: new Date().toISOString(),
    storageKey: AUDIT_LOG_KEY,
    note: 'Logs locais sanitizados. Nao incluem senha, PIN, hash, salt, token sensivel nem segredo de recuperacao.',
    events: listAuditEvents().map(sanitizeAuditData),
  }
}
