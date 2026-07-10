import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'

export const LOCAL_EVENTS_KEY = 'd7_local_events_by_user'
const MAX_EVENTS_PER_USER = 300

function makeId(prefix = 'event') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function getEventsByUser() {
  const data = safeGetStorage(LOCAL_EVENTS_KEY, {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export function getUserEvents(userId) {
  if (!userId) return []
  const events = getEventsByUser()[userId]
  return Array.isArray(events) ? events : []
}

export function recordLocalEvent(userId, eventType, metadata = {}, options = {}) {
  if (!userId || !eventType) return null
  const all = getEventsByUser()
  const userEvents = Array.isArray(all[userId]) ? all[userId] : []
  if (options.dedupeKey) {
    const existing = userEvents.find((item) => item.dedupeKey === options.dedupeKey)
    if (existing) return existing
  }
  const event = {
    id: makeId('evt'),
    userId,
    eventType,
    createdAt: new Date().toISOString(),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    dedupeKey: typeof options.dedupeKey === 'string' ? options.dedupeKey : null,
  }
  safeSetStorage(LOCAL_EVENTS_KEY, { ...all, [userId]: [event, ...userEvents].slice(0, MAX_EVENTS_PER_USER) })
  return event
}

export function summarizeLocalEvents(summaries = []) {
  const all = getEventsByUser()
  const flat = Object.values(all).flatMap((events) => (Array.isArray(events) ? events : []))
  const byType = flat.reduce((acc, event) => ({ ...acc, [event.eventType]: (acc[event.eventType] ?? 0) + 1 }), {})
  const viewEvents = flat.filter((event) => event.eventType.startsWith('view_'))
  const views = viewEvents.reduce((acc, event) => ({ ...acc, [event.eventType.replace('view_', '')]: (acc[event.eventType.replace('view_', '')] ?? 0) + 1 }), {})
  const usersByActivity = summaries.map((summary) => ({
    userId: summary.user.id,
    name: summary.user.name,
    events: Array.isArray(all[summary.user.id]) ? all[summary.user.id].length : 0,
    practices: summary.completedPractices ?? 0,
    ritualMinutes: summary.ritualMinutesTotal ?? 0,
  })).sort((a, b) => (b.events + b.practices) - (a.events + a.practices))
  return {
    totalEvents: flat.length,
    totalAccesses: byType.login ?? 0,
    lastAccess: flat.filter((event) => event.eventType === 'login').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt ?? null,
    topViews: Object.entries(views).sort((a, b) => b[1] - a[1]).slice(0, 6),
    practicesCompleted: byType.practice_completed ?? 0,
    wheelSpins: byType.wheel_spin ?? 0,
    byType,
    recentEvents: flat.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12),
    usersByActivity: usersByActivity.slice(0, 6),
  }
}
