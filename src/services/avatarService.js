import { avatarSymbols, avatarThemes } from '../data/avatarSymbols.js'

export function initialsFromName(name = 'D7') {
  const parts = String(name || 'D7').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'D7'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'D7'
}

export function getAvatarSymbol(symbolId) {
  return avatarSymbols.find((symbol) => symbol.id === symbolId) ?? avatarSymbols[avatarSymbols.length - 1]
}

export function getAvatarTheme(themeId) {
  return avatarThemes.find((theme) => theme.id === themeId) ?? avatarThemes[0]
}

export function getUserAvatarProfile(user = {}, progress = {}) {
  const profile = progress.profile ?? {}
  const symbol = getAvatarSymbol(profile.avatarSymbol ?? user.avatarSymbol ?? 'd7')
  const theme = getAvatarTheme(profile.avatarTheme ?? user.avatarTheme ?? 'aurora')
  return {
    symbolId: symbol.id,
    themeId: theme.id,
    glyph: symbol.glyph,
    label: symbol.label,
    title: profile.avatarTitle ?? symbol.title,
    track: symbol.track,
    meaning: symbol.meaning,
    color: profile.avatarColor ?? symbol.aura ?? theme.color,
    initials: initialsFromName(profile.name ?? user.name),
  }
}

export function applyAvatarChoice(progress, symbolId, themeId) {
  const symbol = getAvatarSymbol(symbolId)
  const theme = getAvatarTheme(themeId)
  return {
    ...progress,
    profile: {
      ...(progress.profile ?? {}),
      avatar: symbol.glyph,
      avatarSymbol: symbol.id,
      avatarTheme: theme.id,
      avatarColor: symbol.aura ?? theme.color,
      avatarTitle: symbol.title,
    },
    lastUnlocks: [`Avatar: ${symbol.label}`, ...((progress.lastUnlocks ?? []).filter((item) => !String(item).startsWith('Avatar:')))].slice(0, 5),
  }
}
