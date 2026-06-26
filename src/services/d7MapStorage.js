import { unique } from '../utils/gameState.js'
import { hasRewardBeenGranted } from './sealEngine.js'

export const FIRST_MAP_SOURCE = 'first-map'

export function saveSymbolicMap(progress, mapResult) {
  const currentMaps = Array.isArray(progress.symbolicMaps) ? progress.symbolicMaps : []
  const alreadyRewarded = hasRewardBeenGranted(progress, 'symbolic-map', FIRST_MAP_SOURCE)
  const tokenAmount = alreadyRewarded ? 0 : 7
  const ledgerEntry = alreadyRewarded ? null : {
    id: `token-symbolic-map-${Date.now()}`,
    sourceType: 'symbolic-map',
    sourceId: FIRST_MAP_SOURCE,
    amount: tokenAmount,
    createdAt: new Date().toISOString(),
    reason: 'Primeiro Mapa Simbólico D7 criado',
  }
  const next = {
    ...progress,
    symbolicMaps: [mapResult, ...currentMaps].slice(0, 12),
    symbolicMapProgress: {
      createdCount: currentMaps.length + 1,
      lastMapId: mapResult.id,
      lastArchetype: mapResult.archetype.name,
      completedSteps: ['name', 'hebrew', 'sanskrit', 'birth', 'core', 'card', 'challenge', 'seal'],
    },
    lastUnlocks: unique([`Mapa Simbólico D7: ${mapResult.archetype.name}`, ...(progress.lastUnlocks ?? [])]).slice(0, 5),
  }
  if (alreadyRewarded) return { progress: next, rewarded: false, message: 'Mapa salvo no Códice. Recompensa principal já havia sido concedida.' }
  return {
    progress: {
      ...next,
      xp: (next.xp ?? 0) + 70,
      sparks: (next.sparks ?? 0) + 7,
      rankingPoints: (next.rankingPoints ?? 0) + 77,
      tokenBalance: (next.tokenBalance ?? 0) + tokenAmount,
      totalTokenEarned: (next.totalTokenEarned ?? 0) + tokenAmount,
      tokenLedger: [...(next.tokenLedger ?? []), ledgerEntry],
      unlockedCards: unique([...(next.unlockedCards ?? []), 'mapa-do-nome']),
      unlockedCodes: unique([...(next.unlockedCodes ?? []), 'symbolic-map-first']),
      lastUnlocks: unique(['Carta Mapa do Nome desbloqueada', '+70 XP', '+7 D7T', ...(next.lastUnlocks ?? [])]).slice(0, 5),
    },
    rewarded: true,
    message: 'Mapa salvo. Primeira recompensa concedida: +70 XP, +7 centelhas, +7 D7T e Carta Mapa do Nome.',
  }
}

export function tokenTotalsByOrigin(progress) {
  return (progress.tokenLedger ?? []).reduce((totals, entry) => ({ ...totals, [entry.sourceType]: (totals[entry.sourceType] ?? 0) + entry.amount }), {})
}
