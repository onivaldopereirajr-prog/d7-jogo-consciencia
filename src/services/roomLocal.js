import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'
import { getUserAvatarProfile } from './avatarService.js'

export const ROOM_STATE_KEY = 'd7_room_state_local'
export const PLAYER_ROOMS_KEY = 'd7_player_rooms_local'
const MAX_MESSAGES = 80
const MAX_ROOMS = 24

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeText(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLength)
}

function baseState() {
  return { messages: [], permissions: {}, updatedAt: new Date().toISOString() }
}

function baseRoomsState() {
  return { rooms: [], activeRoomId: 'd7-main-room', updatedAt: new Date().toISOString() }
}

export function getRoomState() {
  const state = safeGetStorage(ROOM_STATE_KEY, baseState())
  return state && typeof state === 'object' ? { ...baseState(), ...state, messages: Array.isArray(state.messages) ? state.messages : [], permissions: state.permissions && typeof state.permissions === 'object' ? state.permissions : {} } : baseState()
}

export function saveRoomState(state) {
  return safeSetStorage(ROOM_STATE_KEY, { ...state, updatedAt: new Date().toISOString(), messages: (state.messages ?? []).slice(0, MAX_MESSAGES) })
}

export function getPlayerRoomsState() {
  const state = safeGetStorage(PLAYER_ROOMS_KEY, baseRoomsState())
  const rooms = Array.isArray(state?.rooms) ? state.rooms : []
  return { ...baseRoomsState(), ...state, rooms: rooms.slice(0, MAX_ROOMS) }
}

export function savePlayerRoomsState(state) {
  return safeSetStorage(PLAYER_ROOMS_KEY, { ...state, rooms: (state.rooms ?? []).slice(0, MAX_ROOMS), updatedAt: new Date().toISOString() })
}

export function createPlayerRoom(user, form = {}, progress = {}) {
  if (!user?.id) return getPlayerRoomsState()
  const avatar = getUserAvatarProfile(user, progress)
  const room = {
    id: makeId('room'),
    name: sanitizeText(form.name, 60) || 'Sala D7 Local',
    description: sanitizeText(form.description, 160) || 'Encontro local de presença.',
    theme: sanitizeText(form.theme, 48) || 'presença',
    icon: sanitizeText(form.icon, 8) || avatar.glyph || 'D7',
    ownerId: user.id,
    ownerName: sanitizeText(form.playerName, 60) || user.name || 'Jogador D7',
    ownerAvatar: sanitizeText(form.playerAvatar, 8) || avatar.glyph || 'D7',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const state = getPlayerRoomsState()
  const next = { ...state, activeRoomId: room.id, rooms: [room, ...state.rooms].slice(0, MAX_ROOMS) }
  savePlayerRoomsState(next)
  return next
}

export function setActivePlayerRoom(roomId) {
  const state = getPlayerRoomsState()
  const activeRoomId = state.rooms.some((room) => room.id === roomId) ? roomId : 'd7-main-room'
  const next = { ...state, activeRoomId }
  savePlayerRoomsState(next)
  return next
}

export function sendPlayerRoomMessage(roomId, user, text, form = {}, progress = {}) {
  const clean = sanitizeText(text, 500)
  if (!user?.id || !clean) return getPlayerRoomsState()
  const state = getPlayerRoomsState()
  const avatar = getUserAvatarProfile(user, progress)
  const nextRooms = state.rooms.map((room) => {
    if (room.id !== roomId) return room
    const message = {
      id: makeId('msg'),
      userId: user.id,
      nickname: sanitizeText(form.playerName, 60) || user.name || 'Jogador D7',
      avatarGlyph: sanitizeText(form.playerAvatar, 8) || avatar.glyph || 'D7',
      text: clean,
      createdAt: new Date().toISOString(),
    }
    return { ...room, messages: [message, ...(room.messages ?? [])].slice(0, MAX_MESSAGES), updatedAt: new Date().toISOString() }
  })
  const next = { ...state, rooms: nextRooms }
  savePlayerRoomsState(next)
  return next
}

export function sendRoomMessage(user, text, progress = {}) {
  const clean = sanitizeText(text, 500)
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
