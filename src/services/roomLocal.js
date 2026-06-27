import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'

export const ROOM_STATE_KEY = 'd7_room_state_local'
const MAX_MESSAGES = 80

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function baseState() {
  return { messages: [], permissions: {}, updatedAt: new Date().toISOString() }
}

export function getRoomState() {
  const state = safeGetStorage(ROOM_STATE_KEY, baseState())
  return state && typeof state === 'object' ? { ...baseState(), ...state, messages: Array.isArray(state.messages) ? state.messages : [], permissions: state.permissions && typeof state.permissions === 'object' ? state.permissions : {} } : baseState()
}

export function saveRoomState(state) {
  return safeSetStorage(ROOM_STATE_KEY, { ...state, updatedAt: new Date().toISOString(), messages: (state.messages ?? []).slice(0, MAX_MESSAGES) })
}

export function sendRoomMessage(user, text) {
  const clean = String(text ?? '').trim().slice(0, 500)
  if (!user?.id || !clean) return getRoomState()
  const state = getRoomState()
  const message = { id: makeId('msg'), userId: user.id, author: user.name, text: clean, createdAt: new Date().toISOString() }
  const next = { ...state, messages: [message, ...state.messages].slice(0, MAX_MESSAGES) }
  saveRoomState(next)
  return next
}

export function ensureParticipantPermission(user) {
  const state = getRoomState()
  const existing = state.permissions[user.id]
  if (existing) return state
  const next = {
    ...state,
    permissions: {
      ...state.permissions,
      [user.id]: { userId: user.id, name: user.name, role: 'ouvinte', speech: 'none', camera: 'none', updatedAt: new Date().toISOString() },
    },
  }
  saveRoomState(next)
  return next
}

export function updateRoomPermission(user, patch) {
  const state = ensureParticipantPermission(user)
  const current = state.permissions[user.id]
  const next = { ...state, permissions: { ...state.permissions, [user.id]: { ...current, ...patch, updatedAt: new Date().toISOString() } } }
  saveRoomState(next)
  return next
}

export function moderateRoomPermission(userId, patch) {
  const state = getRoomState()
  const current = state.permissions[userId]
  if (!current) return state
  const next = { ...state, permissions: { ...state.permissions, [userId]: { ...current, ...patch, updatedAt: new Date().toISOString() } } }
  saveRoomState(next)
  return next
}
