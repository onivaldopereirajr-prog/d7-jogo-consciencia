import { defaultLanguage, supportedLanguages } from '../i18n/translations.js'
import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'

export const LANGUAGE_KEY = 'd7_language'

export function normalizeLanguage(language) {
  return supportedLanguages.includes(language) ? language : defaultLanguage
}

export function getStoredLanguage() {
  return normalizeLanguage(safeGetStorage(LANGUAGE_KEY, defaultLanguage))
}

export function saveLanguage(language) {
  const normalized = normalizeLanguage(language)
  safeSetStorage(LANGUAGE_KEY, normalized)
  return normalized
}

export function nextLanguage(language) {
  return normalizeLanguage(language) === 'pt-BR' ? 'en-US' : 'pt-BR'
}
