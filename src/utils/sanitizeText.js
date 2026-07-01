const DANGEROUS_CHARS = /[<>"'`&]/g
const HTML_TAGS = /<[^>]*>/g

const defaults = {
  fallback: '',
  maxLength: 500,
}

function normalizeValue(value) {
  return String(value ?? '')
    .replace(HTML_TAGS, ' ')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(DANGEROUS_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeText(value, options = {}) {
  const config = { ...defaults, ...options }
  const clean = normalizeValue(value).slice(0, config.maxLength)
  return clean || config.fallback
}

export function wasSanitized(value, cleanValue) {
  return normalizeValue(value) !== String(cleanValue ?? '').trim()
}

export function sanitizeUserName(value, options = {}) {
  return sanitizeText(value, { fallback: 'Jogador D7', maxLength: 40, ...options })
}

export function sanitizeAvatar(value, options = {}) {
  return sanitizeText(value, { fallback: 'D7', maxLength: 8, ...options })
}

export function sanitizeRoomName(value, options = {}) {
  return sanitizeText(value, { fallback: 'Sala Maiindy', maxLength: 50, ...options })
}

export function sanitizeRoomDescription(value, options = {}) {
  return sanitizeText(value, { fallback: 'Encontro local de presença.', maxLength: 160, ...options })
}

export function sanitizeMessage(value, options = {}) {
  return sanitizeText(value, { fallback: '', maxLength: 500, ...options })
}

export function sanitizeReason(value, options = {}) {
  return sanitizeText(value, { fallback: 'Motivo não informado', maxLength: 160, ...options })
}
