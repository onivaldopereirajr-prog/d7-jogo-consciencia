import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'
import { d7MantraTracks } from '../data/d7MantraTracks.js'

export const MANTRA_SETTINGS_KEY = 'd7_mantra_settings'

const defaultSettings = {
  enabled: true,
  volume: 0.6,
  muted: false,
  loop: true,
  selectedTrackId: d7MantraTracks[0]?.id ?? null,
}

function clampVolume(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return defaultSettings.volume
  return Math.min(1, Math.max(0, number))
}

export function getMantraSettings() {
  const saved = safeGetStorage(MANTRA_SETTINGS_KEY, defaultSettings)
  const settings = saved && typeof saved === 'object' ? saved : defaultSettings
  const trackExists = d7MantraTracks.some((track) => track.id === settings.selectedTrackId)
  return {
    ...defaultSettings,
    ...settings,
    enabled: settings.enabled !== false,
    volume: clampVolume(settings.volume),
    muted: Boolean(settings.muted),
    loop: settings.loop !== false,
    selectedTrackId: trackExists ? settings.selectedTrackId : defaultSettings.selectedTrackId,
  }
}

export function saveMantraSettings(settings) {
  const current = getMantraSettings()
  const next = {
    ...current,
    ...settings,
    volume: clampVolume(settings.volume ?? current.volume),
    enabled: settings.enabled ?? current.enabled,
    muted: Boolean(settings.muted ?? current.muted),
    loop: settings.loop ?? current.loop,
  }
  safeSetStorage(MANTRA_SETTINGS_KEY, next)
  return next
}

export function getRecommendedMantraTrackId(minutes) {
  const exact = d7MantraTracks.find((track) => track.recommendedFor?.includes(Number(minutes)))
  if (exact) return exact.id
  if (Number(minutes) >= 21) return 'mantra-om-108'
  if (Number(minutes) >= 7) return 'mantra-silencio-d7'
  return d7MantraTracks[0]?.id ?? null
}
