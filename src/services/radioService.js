import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'
import { d7RadioTracks } from '../data/d7RadioTracks.js'

export const RADIO_SETTINGS_KEY = 'd7_radio_settings'

const defaultSettings = {
  volume: 0.7,
  muted: false,
  repeat: true,
  shuffle: false,
  lastTrackId: d7RadioTracks[0]?.id ?? null,
}

function clampVolume(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return defaultSettings.volume
  return Math.min(1, Math.max(0, number))
}

export function getRadioSettings() {
  const saved = safeGetStorage(RADIO_SETTINGS_KEY, defaultSettings)
  const settings = saved && typeof saved === 'object' ? saved : defaultSettings
  const trackExists = d7RadioTracks.some((track) => track.id === settings.lastTrackId)
  return {
    ...defaultSettings,
    ...settings,
    volume: clampVolume(settings.volume),
    muted: Boolean(settings.muted),
    repeat: settings.repeat !== false,
    shuffle: Boolean(settings.shuffle),
    lastTrackId: trackExists ? settings.lastTrackId : defaultSettings.lastTrackId,
  }
}

export function saveRadioSettings(settings) {
  const next = {
    ...getRadioSettings(),
    ...settings,
    volume: clampVolume(settings.volume ?? getRadioSettings().volume),
    muted: Boolean(settings.muted ?? getRadioSettings().muted),
    repeat: settings.repeat ?? getRadioSettings().repeat,
    shuffle: Boolean(settings.shuffle ?? getRadioSettings().shuffle),
  }
  safeSetStorage(RADIO_SETTINGS_KEY, next)
  return next
}

export function getTrackIndex(trackId) {
  const index = d7RadioTracks.findIndex((track) => track.id === trackId)
  return index >= 0 ? index : 0
}

export function getNextTrackIndex(currentIndex, shuffle = false) {
  if (!d7RadioTracks.length) return 0
  if (shuffle && d7RadioTracks.length > 1) {
    let next = currentIndex
    while (next === currentIndex) next = Math.floor(Math.random() * d7RadioTracks.length)
    return next
  }
  return (currentIndex + 1) % d7RadioTracks.length
}

export function getPreviousTrackIndex(currentIndex) {
  if (!d7RadioTracks.length) return 0
  return (currentIndex - 1 + d7RadioTracks.length) % d7RadioTracks.length
}
