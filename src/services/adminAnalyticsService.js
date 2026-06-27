import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'

export const SESSION_EVENTS_KEY = 'd7_session_events_by_user'
export const ADMIN_AUDIT_KEY = 'd7_admin_audit_events'
export const SECURITY_ALERTS_KEY = 'd7_security_alerts'
export const PAGE_VIEWS_KEY = 'd7_page_views_by_user'
const MAX_EVENTS = 500
const MAX_ALERTS = 120

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function cleanMetadata(metadata = {}) {
  const blocked = new Set(['password', 'confirmPassword', 'passwordHash', 'salt', 'hash'])
  return Object.fromEntries(Object.entries(metadata || {}).filter(([key]) => !blocked.has(key)))
}

function categoryOf(eventType = '') {
  if (eventType.includes('login') || eventType.includes('logout') || eventType.includes('session')) return 'acesso'
  if (eventType.includes('practice') || eventType.includes('seal')) return 'prática'
  if (eventType.includes('study') || eventType.includes('library') || eventType.includes('codex')) return 'estudo'
  if (eventType.includes('social') || eventType.includes('room') || eventType.includes('comment') || eventType.includes('post') || eventType.includes('friend')) return 'social'
  if (eventType.includes('security') || eventType.includes('blocked') || eventType.includes('reported') || eventType.includes('password')) return 'segurança'
  if (eventType.includes('d7t') || eventType.includes('wheel') || eventType.includes('token')) return 'token'
  if (eventType.includes('admin')) return 'admin'
  return 'sistema'
}

function describe(event) {
  const name = event.nickname || 'Usuário local'
  const map = {
    user_login: `${name} entrou no app`,
    user_logout: `${name} saiu do app`,
    session_started: `${name} iniciou sessão local`,
    session_heartbeat: `${name} atualizou presença local`,
    practice_started: `${name} iniciou prática`,
    practice_completed: `${name} concluiu prática`,
    seal_started: `${name} iniciou selo`,
    seal_completed: `${name} concluiu selo`,
    study_card_completed: `${name} estudou um card`,
    symbolic_map_created: `${name} salvou mapa simbólico`,
    wheel_spin: `${name} girou a Roda D7`,
    d7t_spent: `${name} gastou D7T simbólico`,
    d7t_earned: `${name} ganhou D7T simbólico`,
    social_post_created: `${name} criou post local`,
    social_comment_created: `${name} comentou localmente`,
    social_reaction_created: `${name} reagiu localmente`,
    friend_request_sent: `${name} enviou convite local`,
    friend_request_accepted: `${name} aceitou convite local`,
    user_blocked: `${name} bloqueou usuário local`,
    post_reported: `${name} registrou denúncia local`,
    admin_opened: `${name} abriu o admin`,
    admin_login: `${name} autenticou admin local`,
    language_changed: `${name} mudou idioma`,
    radio_played: `${name} iniciou Rádio D7`,
    room_message_sent: `${name} enviou mensagem na Sala D7`,
    room_speech_requested: `${name} solicitou fala`,
    room_camera_requested: `${name} solicitou câmera`,
    room_preview_toggled: `${name} alterou preview local`,
    room_permission_changed: `${name} alterou permissão de sala`,
  }
  if (event.eventType?.startsWith('view_')) return `${name} abriu ${event.eventType.replace('view_', '')}`
  return map[event.eventType] ?? `${name}: ${event.eventType}`
}

export function getSessionEventsByUser() {
  const data = safeGetStorage(SESSION_EVENTS_KEY, {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export function getAuditEvents() {
  const data = safeGetStorage(ADMIN_AUDIT_KEY, [])
  return Array.isArray(data) ? data : []
}

export function getSecurityAlerts() {
  const data = safeGetStorage(SECURITY_ALERTS_KEY, [])
  return Array.isArray(data) ? data : []
}

export function trackAdminEvent(user, eventType, metadata = {}, view = null, sessionId = null) {
  if (!eventType) return null
  const userId = typeof user === 'string' ? user : user?.id
  const nickname = typeof user === 'object' ? user?.name : metadata.nickname
  const event = {
    id: makeId('audit'),
    userId: userId || 'anonymous',
    nickname: nickname || 'Visitante D7',
    eventType,
    category: categoryOf(eventType),
    description: '',
    createdAt: new Date().toISOString(),
    view: view || metadata.view || null,
    sessionId: sessionId || metadata.sessionId || null,
    metadata: cleanMetadata(metadata),
  }
  event.description = describe(event)
  const byUser = getSessionEventsByUser()
  const current = Array.isArray(byUser[event.userId]) ? byUser[event.userId] : []
  safeSetStorage(SESSION_EVENTS_KEY, { ...byUser, [event.userId]: [event, ...current].slice(0, MAX_EVENTS) })
  safeSetStorage(ADMIN_AUDIT_KEY, [event, ...getAuditEvents()].slice(0, MAX_EVENTS))
  if (eventType.startsWith('view_')) recordPageView(event.userId, event.view || eventType.replace('view_', ''), event)
  return event
}

export function recordPageView(userId, view, event = {}) {
  if (!userId || !view) return null
  const all = safeGetStorage(PAGE_VIEWS_KEY, {})
  const data = all && typeof all === 'object' && !Array.isArray(all) ? all : {}
  const item = { id: makeId('view'), userId, view, createdAt: event.createdAt ?? new Date().toISOString(), sessionId: event.sessionId ?? null }
  const current = Array.isArray(data[userId]) ? data[userId] : []
  safeSetStorage(PAGE_VIEWS_KEY, { ...data, [userId]: [item, ...current].slice(0, MAX_EVENTS) })
  return item
}

export function createSecurityAlert({ severity = 'info', message, userId = null, metadata = {} }) {
  if (!message) return null
  const alert = { id: makeId('alert'), severity, message, userId, createdAt: new Date().toISOString(), resolved: false, metadata: cleanMetadata(metadata) }
  safeSetStorage(SECURITY_ALERTS_KEY, [alert, ...getSecurityAlerts()].slice(0, MAX_ALERTS))
  return alert
}

export function resolveSecurityAlert(alertId) {
  const alerts = getSecurityAlerts().map((alert) => alert.id === alertId ? { ...alert, resolved: true, resolvedAt: new Date().toISOString() } : alert)
  safeSetStorage(SECURITY_ALERTS_KEY, alerts)
  return alerts
}

export function summarizeAdminAnalytics(summaries = [], presence = [], roomState = { messages: [], permissions: {} }) {
  const events = getAuditEvents()
  const alerts = getSecurityAlerts()
  const today = new Date().toISOString().slice(0, 10)
  const todayEvents = events.filter((event) => event.createdAt?.startsWith(today))
  const activeNow = presence.filter((item) => item.status === 'online')
  const d7tEarned = events.filter((event) => event.eventType === 'd7t_earned').reduce((sum, event) => sum + Number(event.metadata.amount ?? 0), 0)
  const d7tSpent = events.filter((event) => event.eventType === 'd7t_spent' || event.eventType === 'wheel_spin').reduce((sum, event) => sum + Number(event.metadata.costD7T ?? 0), 0)
  const sessionSeconds = presence.reduce((sum, item) => sum + Number(item.estimatedSessionSeconds ?? 0), 0)
  return {
    usersCount: summaries.length,
    activeNow: activeNow.length,
    sessionsToday: todayEvents.filter((event) => event.eventType === 'session_started' || event.eventType === 'user_login').length,
    practicesToday: todayEvents.filter((event) => event.eventType === 'practice_completed').length,
    postsCreated: events.filter((event) => event.eventType === 'social_post_created').length,
    roomMessages: roomState.messages?.length ?? 0,
    d7tEarned,
    d7tSpent,
    pendingReports: events.filter((event) => event.eventType === 'post_reported').length,
    securityEvents: alerts.filter((alert) => !alert.resolved).length,
    averageSessionSeconds: presence.length ? Math.round(sessionSeconds / presence.length) : 0,
    events,
    alerts,
  }
}

export function buildAdminReport({ summaries, presence, analytics, roomState }) {
  return {
    generatedAt: new Date().toISOString(),
    note: 'Relatório local deste navegador. Não inclui senha, hash ou salt.',
    users: summaries.map((summary) => ({
      id: summary.user.id,
      name: summary.user.name,
      login: summary.user.login,
      createdAt: summary.user.createdAt,
      lastLoginAt: summary.user.lastLoginAt,
      xp: summary.xp,
      sparks: summary.sparks,
      d7t: summary.tokenBalance,
      score: summary.score,
      stage: summary.currentStage,
      practices: summary.completedPractices,
      libraryCardsStudied: summary.libraryCardsStudied,
      unlockedSeals: summary.unlockedSeals.length,
      privacy: 'perfil privado local por padrão',
    })),
    metrics: analytics,
    presence,
    recentEvents: analytics.events.slice(0, 60),
    alerts: analytics.alerts,
    room: {
      participants: Object.values(roomState.permissions ?? {}).map((item) => ({ userId: item.userId, nickname: item.nickname, role: item.role, speech: item.speech, camera: item.camera })),
      recentMessages: (roomState.messages ?? []).slice(0, 20).map((message) => ({ id: message.id, userId: message.userId, nickname: message.nickname, role: message.role, createdAt: message.createdAt })),
    },
  }
}
