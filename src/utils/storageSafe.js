export function safeParseJSON(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function safeGetStorage(key, fallback = null) {
  try {
    return safeParseJSON(localStorage.getItem(key), fallback)
  } catch {
    return fallback
  }
}

export function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function safeRemoveStorage(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
