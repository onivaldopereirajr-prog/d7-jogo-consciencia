import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'
import { getUserAvatarProfile } from './avatarService.js'

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

export function sendRoomMessage(user, text, progress = {}) {
  const clean = String(text ?? '').trim().slice(0, 500)
  if (!user?.id || !clean) return getRoomState()
  const state = getRoomState()
  const avatar = getUserAvatarProfile(user, progress)
  const message = { id: makeId('msg'), userId: user.id, nickname: user.name || 'Visitante D7', author: user.name || 'Visitante D7', avatarSymbol: avatar.symbolId, avatarGlyph: avatar.glyph, avatarColor: avatar.color, role: state.permissions[user.id]?.role ?? 'participante', text: clean, createdAt: new Date().toISOString() }
  const next = { ...state, messages: [message, ...state.messages].slice(0, MAX_MESSAGES) }
  saveRoomState(next)
  return next
}

export function ensureParticipantPermission(user, progress = {}) {
  const state = getRoomState()
  const avatar = getUserAvatarProfile(user, progress)
  const existing = state.permissions[user.id]
  if (existing) return state
  const next = {
    ...state,
    permissions: {
      ...state.permissions,
      [user.id]: { userId: user.id, name: user.name || 'Visitante D7', nickname: user.name || 'Visitante D7', avatarSymbol: avatar.symbolId, avatarGlyph: avatar.glyph, avatarColor: avatar.color, role: 'participante', speech: 'none', camera: 'none', updatedAt: new Date().toISOString() },
    },
  }
  saveRoomState(next)
  return next
}

export function updateRoomPermission(user, patch, progress = {}) {
  const state = ensureParticipantPermission(user, progress)
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
