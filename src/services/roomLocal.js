import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'
import { getUserAvatarProfile } from './avatarService.js'
import { createAuditEvent } from './auditLogLocal.js'
import { sanitizeAvatar, sanitizeMessage, sanitizeRoomDescription, sanitizeRoomName, sanitizeText, sanitizeUserName, wasSanitized } from '../utils/sanitizeText.js'

export const ROOM_STATE_KEY = 'd7_room_state_local'
export const PLAYER_ROOMS_KEY = 'd7_player_rooms_local'
const MAX_MESSAGES = 80
const MAX_ROOMS = 24

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}



function sanitizeRoomMessageItem(message = {}) {
  return {
    ...message,
    nickname: sanitizeUserName(message.nickname ?? message.author, { fallback: 'Visitante D7' }),
    author: sanitizeUserName(message.author ?? message.nickname, { fallback: 'Visitante D7' }),
    avatarGlyph: sanitizeAvatar(message.avatarGlyph),
    text: sanitizeMessage(message.text),
  }
}

function sanitizePermissionItem(item = {}) {
  return {
    ...item,
    name: sanitizeUserName(item.name ?? item.nickname, { fallback: 'Visitante D7' }),
    nickname: sanitizeUserName(item.nickname ?? item.name, { fallback: 'Visitante D7' }),
    avatarGlyph: sanitizeAvatar(item.avatarGlyph),
  }
}

function sanitizePlayerRoomItem(room = {}) {
  return {
    ...room,
    name: sanitizeRoomName(room.name, { fallback: 'Sala Maiindy Local' }),
    description: sanitizeRoomDescription(room.description),
    theme: sanitizeText(room.theme, { fallback: 'presença', maxLength: 50 }),
    icon: sanitizeAvatar(room.icon),
    ownerName: sanitizeUserName(room.ownerName),
    ownerAvatar: sanitizeAvatar(room.ownerAvatar),
    messages: Array.isArray(room.messages) ? room.messages.map(sanitizeRoomMessageItem).filter((message) => message.text) : [],
  }
}

function baseState() {
  return { messages: [], permissions: {}, updatedAt: new Date().toISOString() }
}

function baseRoomsState() {
  return { rooms: [], activeRoomId: 'd7-main-room', updatedAt: new Date().toISOString() }
}

export function getRoomState() {
  const state = safeGetStorage(ROOM_STATE_KEY, baseState())
  if (!state || typeof state !== 'object') return baseState()
  const permissions = state.permissions && typeof state.permissions === 'object' ? Object.fromEntries(Object.entries(state.permissions).map(([userId, item]) => [userId, sanitizePermissionItem(item)])) : {}
  const messages = Array.isArray(state.messages) ? state.messages.map(sanitizeRoomMessageItem).filter((message) => message.text) : []
  return { ...baseState(), ...state, messages, permissions }
}

export function saveRoomState(state) {
  return safeSetStorage(ROOM_STATE_KEY, { ...state, updatedAt: new Date().toISOString(), messages: (state.messages ?? []).slice(0, MAX_MESSAGES) })
}

export function getPlayerRoomsState() {
  const state = safeGetStorage(PLAYER_ROOMS_KEY, baseRoomsState())
  const rooms = Array.isArray(state?.rooms) ? state.rooms.map(sanitizePlayerRoomItem) : []
  return { ...baseRoomsState(), ...state, rooms: rooms.slice(0, MAX_ROOMS) }
}

export function savePlayerRoomsState(state) {
  return safeSetStorage(PLAYER_ROOMS_KEY, { ...state, rooms: (state.rooms ?? []).slice(0, MAX_ROOMS), updatedAt: new Date().toISOString() })
}

export function createPlayerRoom(user, form = {}, progress = {}) {
  if (!user?.id) return getPlayerRoomsState()
  const avatar = getUserAvatarProfile(user, progress)
  const cleanRoom = {
    name: sanitizeRoomName(form.name, { fallback: 'Sala Maiindy Local' }),
    description: sanitizeRoomDescription(form.description),
    theme: sanitizeText(form.theme, { fallback: 'presença', maxLength: 50 }),
    icon: sanitizeAvatar(form.icon || avatar.glyph),
    ownerName: sanitizeUserName(form.playerName || user.name),
    ownerAvatar: sanitizeAvatar(form.playerAvatar || avatar.glyph),
  }
  if (wasSanitized(form.name, cleanRoom.name) || wasSanitized(form.description, cleanRoom.description) || wasSanitized(form.theme, cleanRoom.theme) || wasSanitized(form.icon, cleanRoom.icon) || wasSanitized(form.playerName || user.name, cleanRoom.ownerName) || wasSanitized(form.playerAvatar || avatar.glyph, cleanRoom.ownerAvatar)) {
    createAuditEvent('unsafe_text_sanitized', {
      actorRole: 'player',
      actorSafeId: user.id,
      status: 'info',
      metadata: { field: 'room_form' },
    })
  }
  const room = {
    id: makeId('room'),
    name: cleanRoom.name,
    description: cleanRoom.description,
    theme: cleanRoom.theme,
    icon: cleanRoom.icon,
    ownerId: user.id,
    ownerName: cleanRoom.ownerName,
    ownerAvatar: cleanRoom.ownerAvatar,
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
  const clean = sanitizeMessage(text)
  if (!user?.id || !clean) {
    createAuditEvent('unsafe_message_rejected', { actorRole: 'player', actorSafeId: user?.id ?? 'anonymous', status: 'rejected', metadata: { roomType: 'player' } })
    return getPlayerRoomsState()
  }
  if (wasSanitized(text, clean)) {
    createAuditEvent('unsafe_text_sanitized', { actorRole: 'player', actorSafeId: user.id, status: 'info', metadata: { field: 'player_room_message' } })
  }
  const state = getPlayerRoomsState()
  const avatar = getUserAvatarProfile(user, progress)
  const nextRooms = state.rooms.map((room) => {
    if (room.id !== roomId) return room
    const message = {
      id: makeId('msg'),
      userId: user.id,
      nickname: sanitizeUserName(form.playerName || user.name),
      avatarGlyph: sanitizeAvatar(form.playerAvatar || avatar.glyph),
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
  const clean = sanitizeMessage(text)
  if (!user?.id || !clean) {
    createAuditEvent('unsafe_message_rejected', { actorRole: 'player', actorSafeId: user?.id ?? 'anonymous', status: 'rejected', metadata: { roomType: 'main' } })
    return getRoomState()
  }
  if (wasSanitized(text, clean)) {
    createAuditEvent('unsafe_text_sanitized', { actorRole: 'player', actorSafeId: user.id, status: 'info', metadata: { field: 'room_message' } })
  }
  const state = getRoomState()
  const avatar = getUserAvatarProfile(user, progress)
  const safeName = sanitizeUserName(user.name, { fallback: 'Visitante D7' })
  const message = { id: makeId('msg'), userId: user.id, nickname: safeName, author: safeName, avatarSymbol: avatar.symbolId, avatarGlyph: sanitizeAvatar(avatar.glyph), avatarColor: avatar.color, role: state.permissions[user.id]?.role ?? 'participante', text: clean, createdAt: new Date().toISOString() }
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
      [user.id]: { userId: user.id, name: sanitizeUserName(user.name, { fallback: 'Visitante D7' }), nickname: sanitizeUserName(user.name, { fallback: 'Visitante D7' }), avatarSymbol: avatar.symbolId, avatarGlyph: sanitizeAvatar(avatar.glyph), avatarColor: avatar.color, role: 'participante', speech: 'none', camera: 'none', updatedAt: new Date().toISOString() },
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
