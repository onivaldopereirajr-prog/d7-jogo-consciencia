import { sealDefinitions, sealById } from '../data/seals.js'
import { studyableLibraryCards } from '../data/initiationLibrary.js'
import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'
import { recordPresenceTick, unique } from '../utils/gameState.js'

export const SEAL_EVENTS_KEY = 'd7_seal_events_by_user'
const ABSENCE_LIMIT_SECONDS = 15

function fallbackHash(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return `fallback-${(hash >>> 0).toString(16)}`
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createEventHash(event, previousHash = '') {
  const normalized = [
    event.userId,
    event.sealId,
    event.eventType,
    event.startedAt,
    event.completedAt ?? '',
    event.durationSeconds ?? 0,
    event.challengeCompleted ? '1' : '0',
    event.rewardGranted ? '1' : '0',
    event.tokenGranted ? '1' : '0',
    event.rankingPointsGranted ?? 0,
    previousHash,
  ].join('|')
  if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const encoded = new TextEncoder().encode(normalized)
    return { eventHash: toHex(await globalThis.crypto.subtle.digest('SHA-256', encoded)), integrityLevel: 'sha-256' }
  }
  return { eventHash: fallbackHash(normalized), integrityLevel: 'basic-fallback' }
}

export function getSealEventsByUser() {
  const data = safeGetStorage(SEAL_EVENTS_KEY, {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export function getUserSealEvents(userId) {
  return Array.isArray(getSealEventsByUser()[userId]) ? getSealEventsByUser()[userId] : []
}

export async function appendSealEvent(userId, event) {
  const all = getSealEventsByUser()
  const events = Array.isArray(all[userId]) ? all[userId] : []
  const previousEventHash = events.at(-1)?.eventHash ?? ''
  const hash = await createEventHash({ ...event, userId, previousEventHash }, previousEventHash)
  const nextEvent = { ...event, userId, previousEventHash, ...hash }
  safeSetStorage(SEAL_EVENTS_KEY, { ...all, [userId]: [...events, nextEvent] })
  return nextEvent
}

export function getSealCooldownMinutes(order) {
  return order <= 4 ? order * 10 : (order - 3) * 60
}

export function getRequiredGateScore(order) {
  return 40 + order * order * 15
}

export function getSealGateScore(progress) {
  const completedPracticesCount = progress.sessions?.length ?? 0
  const unlockedSealsCount = progress.sealProgress?.unlockedSeals?.length ?? 0
  const completedChallengesCount = progress.sealProgress?.completedChallenges?.length ?? 0
  const totalFocusSeconds = progress.sealProgress?.totalFocusSeconds ?? 0
  const totalTokenEarned = progress.totalTokenEarned ?? 0
  const warnings = progress.integrityWarnings ?? 0
  return Math.max(0,
    completedPracticesCount * 20 +
    unlockedSealsCount * 30 +
    (progress.progress?.streak ?? 0) * 15 +
    Math.floor(totalFocusSeconds / 60) * 5 +
    (progress.unlockedCards?.length ?? 0) * 10 +
    completedChallengesCount * 25 +
    Math.floor(totalTokenEarned / 10) -
    warnings * 40,
  )
}

export function getRankingScore(progress) {
  const sealProgress = progress.sealProgress ?? {}
  const ritualMinutesTotal = Math.max(0, Number(progress.ritualMinutesTotal ?? 0) || 0)
  const ritualMilestonesUnlocked = Array.isArray(progress.ritualMilestonesUnlocked) ? progress.ritualMilestonesUnlocked : []
  const libraryCardIds = new Set(studyableLibraryCards.map((card) => card.id))
  const libraryStudiedCount = Array.isArray(progress.studiedCards) ? progress.studiedCards.filter((id) => libraryCardIds.has(id)).length : 0
  const libraryModuleCount = Array.isArray(progress.libraryProgress?.completedModuleIds) ? progress.libraryProgress.completedModuleIds.length : 0
  const libraryPhaseCount = Array.isArray(progress.libraryProgress?.completedPhaseIds) ? progress.libraryProgress.completedPhaseIds.length : 0
  return Math.max(0,
    (progress.xp ?? 0) +
    (progress.sparks ?? 0) * 7 +
    (progress.unlockedCards?.length ?? 0) * 25 +
    (sealProgress.unlockedSeals?.length ?? 0) * 77 +
    (sealProgress.completedChallenges?.length ?? 0) * 35 +
    (progress.tokenBalance ?? 0) * 5 +
    (progress.progress?.streak ?? 0) * 13 +
    Math.floor((sealProgress.totalFocusSeconds ?? 0) / 60) * 3 +
    Math.floor(ritualMinutesTotal * 2) +
    libraryStudiedCount * 10 +
    libraryModuleCount * 30 +
    libraryPhaseCount * 40 +
    (ritualMilestonesUnlocked.includes(21) ? 21 : 0) +
    (ritualMilestonesUnlocked.includes(108) ? 108 : 0) +
    (progress.presenceBonusTotal ?? 0) -
    (progress.integrityWarnings ?? 0) * 50,
  )
}

export function hasRewardBeenGranted(progress, sourceType, sourceId) {
  return (progress.tokenLedger ?? []).some((entry) => entry.sourceType === sourceType && entry.sourceId === sourceId)
}

export function normalizeChallengeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/g, '')
}

function challengeComparisonStatus(seal, value) {
  const raw = String(value ?? '')
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, message: 'Digite a frase do desafio para concluir o selo.' }
  }
  if (seal.challengeType === 'confirm_phrase') {
    const normalizedValue = normalizeChallengeText(trimmed)
    const normalizedRequired = normalizeChallengeText(seal.requiredPhrase)
    if (normalizedValue === normalizedRequired) return { ok: true }
    return { ok: false, message: 'Confira a frase do desafio. Você pode copiar exatamente como aparece na tela.' }
  }
  if (seal.challengeType === 'reflection') {
    if (trimmed.length >= seal.requiredTextMinLength) return { ok: true }
    return { ok: false, message: 'Confira a frase do desafio. Você pode copiar exatamente como aparece na tela.' }
  }
  if (seal.challengeType === 'choice') {
    return trimmed === seal.correctOption ? { ok: true } : { ok: false, message: 'Confira a frase do desafio. Você pode copiar exatamente como aparece na tela.' }
  }
  if (seal.challengeType === 'practice_done') return value ? { ok: true } : { ok: false, message: 'Digite a frase do desafio para concluir o selo.' }
  if (seal.challengeType === 'active_tab') return { ok: true }
  return { ok: false, message: 'Confira a frase do desafio. Você pode copiar exatamente como aparece na tela.' }
}

export function getSealAttempt(progress, sealId) {
  return progress.sealProgress?.attempts?.[sealId] ?? null
}

export function getCooldownInfo(progress, seal) {
  const lastCompletedAt = progress.sealProgress?.lastCompletedAt
  if (!lastCompletedAt || seal.order === 1) return { ready: true, remainingMinutes: 0 }
  const nextAt = new Date(lastCompletedAt).getTime() + getSealCooldownMinutes(seal.order) * 60000
  const remainingMs = nextAt - Date.now()
  return { ready: remainingMs <= 0, remainingMinutes: Math.max(0, Math.ceil(remainingMs / 60000)) }
}

export function getSealStatus(progress, seal) {
  const attempt = getSealAttempt(progress, seal.id)
  if (progress.sealProgress?.unlockedSeals?.includes(seal.id)) return 'unlocked'
  if (attempt?.status === 'failed') return 'failed'
  if (attempt?.status === 'challenge_pending') return 'challenge_pending'
  if (attempt?.status === 'running') return 'running'
  const gate = getSealGateScore(progress)
  const cooldown = getCooldownInfo(progress, seal)
  if (seal.order === 1) return 'available'
  if (seal.requiredPreviousSeal && !progress.sealProgress?.unlockedSeals?.includes(seal.requiredPreviousSeal)) return 'locked'
  if (!cooldown.ready) return 'cooldown'
  if (gate < getRequiredGateScore(seal.order)) return 'locked'
  if ((progress.sessions?.length ?? 0) < seal.requiredPracticeCount) return 'locked'
  if ((progress.progress?.streak ?? 0) < seal.requiredStreak) return 'locked'
  return 'available'
}

export function startSealAttempt(progress, sealId) {
  const seal = sealById[sealId]
  if (!seal || !['available', 'failed'].includes(getSealStatus(progress, seal))) return progress
  const now = Date.now()
  return {
    ...progress,
    sealProgress: {
      ...progress.sealProgress,
      attempts: {
        ...progress.sealProgress.attempts,
        [sealId]: {
          sealId,
          status: 'running',
          startedAt: new Date(now).toISOString(),
          expectedEndAt: new Date(now + seal.durationSeconds * 1000).toISOString(),
          hiddenSeconds: 0,
          visibilityLostAt: null,
        },
      },
    },
  }
}

export function cancelSealAttempt(progress, sealId) {
  const attempts = { ...progress.sealProgress.attempts }
  delete attempts[sealId]
  return { ...progress, sealProgress: { ...progress.sealProgress, attempts } }
}

export function syncSealAttempt(progress, sealId) {
  const attempt = getSealAttempt(progress, sealId)
  if (!attempt || attempt.status !== 'running') return progress
  const expected = new Date(attempt.expectedEndAt).getTime()
  if (Date.now() < expected) return progress
  return {
    ...progress,
    sealProgress: {
      ...progress.sealProgress,
      attempts: {
        ...progress.sealProgress.attempts,
        [sealId]: { ...attempt, status: 'challenge_pending', timerCompletedAt: new Date().toISOString() },
      },
    },
  }
}

export function markSealAbsence(progress, sealId, seconds) {
  const attempt = getSealAttempt(progress, sealId)
  if (!attempt || attempt.status !== 'running') return progress
  if (seconds <= ABSENCE_LIMIT_SECONDS) return progress
  return {
    ...progress,
    integrityWarnings: (progress.integrityWarnings ?? 0) + 1,
    sealProgress: {
      ...progress.sealProgress,
      attempts: {
        ...progress.sealProgress.attempts,
        [sealId]: { ...attempt, status: 'failed', failedReason: 'Ausência da aba por mais de 15 segundos.' },
      },
    },
    lastUnlocks: unique(['O selo exige presença ativa. Volte para concluir com integridade.', ...(progress.lastUnlocks ?? [])]).slice(0, 5),
  }
}

export function validateSealChallenge(seal, value, progress) {
  if (seal.challengeType === 'practice_done') return !!progress.daily?.practice
  const result = challengeComparisonStatus(seal, value)
  return result.ok
}

export async function completeSealChallenge(progress, userId, sealId, challengeValue) {
  const seal = sealById[sealId]
  const attempt = getSealAttempt(progress, sealId)
  if (!seal || !attempt || attempt.status !== 'challenge_pending') return { progress, ok: false, message: 'Timer do selo ainda não foi concluído.' }
  if (hasRewardBeenGranted(progress, 'seal', sealId)) return { progress, ok: false, message: 'Recompensa deste selo já foi concedida.' }
  const validation = seal.challengeType === 'practice_done' ? { ok: Boolean(progress.daily?.practice) } : challengeComparisonStatus(seal, challengeValue)
  if (!validation.ok) return { progress, ok: false, message: validation.message }

  const perfectPresenceBonus = (attempt.hiddenSeconds ?? 0) === 0 ? 2 : 0
  const writtenBonus = ['reflection', 'confirm_phrase'].includes(seal.challengeType) ? 2 : 0
  const cycleBonus = seal.id === 'seal-cycle' ? 21 : 0
  const tokenAmount = seal.rewardTokens + perfectPresenceBonus + writtenBonus + cycleBonus
  const ledgerEntry = { id: `token-${sealId}-${Date.now()}`, sourceType: 'seal', sourceId: sealId, amount: tokenAmount, createdAt: new Date().toISOString(), reason: `${seal.name} desbloqueado` }
  const completedAt = new Date().toISOString()
  const event = await appendSealEvent(userId, {
    sealId,
    eventType: 'seal_completed',
    startedAt: attempt.startedAt,
    completedAt,
    durationSeconds: seal.durationSeconds,
    challengeCompleted: true,
    rewardGranted: true,
    tokenGranted: tokenAmount,
    rankingPointsGranted: seal.rewardRankingPoints,
  })
  const attempts = { ...progress.sealProgress.attempts }
  delete attempts[sealId]
  const next = recordPresenceTick({
    ...progress,
    xp: (progress.xp ?? 0) + seal.rewardXp,
    sparks: (progress.sparks ?? 0) + seal.rewardSparks,
    rankingPoints: (progress.rankingPoints ?? 0) + seal.rewardRankingPoints,
    tokenBalance: Math.max(0, (progress.tokenBalance ?? 0) + tokenAmount),
    totalTokenEarned: (progress.totalTokenEarned ?? 0) + tokenAmount,
    presenceBonusTotal: (progress.presenceBonusTotal ?? 0) + perfectPresenceBonus * 10,
    tokenLedger: [...(progress.tokenLedger ?? []), ledgerEntry],
    unlockedCodes: unique([...(progress.unlockedCodes ?? []), seal.rewardCard]),
    unlockedCards: unique([...(progress.unlockedCards ?? []), ...cardsForSeal(seal.id)]),
    sealProgress: {
      ...progress.sealProgress,
      attempts,
      unlockedSeals: unique([...(progress.sealProgress.unlockedSeals ?? []), sealId]),
      completedChallenges: unique([...(progress.sealProgress.completedChallenges ?? []), sealId]),
      totalFocusSeconds: (progress.sealProgress.totalFocusSeconds ?? 0) + seal.durationSeconds,
      lastCompletedAt: completedAt,
      lastSealId: sealId,
    },
    lastUnlocks: unique([`${seal.name} desbloqueado`, `+${seal.rewardXp} XP`, `+${tokenAmount} D7T`, ...(progress.lastUnlocks ?? [])]).slice(0, 5),
  }, 1, completedAt)
  return { progress: next, ok: true, message: 'Desafio concluído. Selo desbloqueado.', event }
}

export function cardsForSeal(sealId) {
  const map = {
    'code-alef-om': ['he-alef', 'sa-om'],
    'code-or-shanti': ['hw-or', 'sa-shanti'],
    'code-ruach-prana': ['hw-ruach', 'sa-prana'],
    'code-emet-dhyana': ['hw-emet', 'sa-dhyana'],
    'seal-d7': ['he-zayin'],
    'seal-return': ['he-mem'],
    'seal-stay': ['he-shin'],
    'seal-cycle': ['he-tav'],
  }
  return map[sealId] ?? []
}

export function requirementText(progress, seal) {
  const parts = []
  if (seal.requiredPreviousSeal) parts.push(`requer ${sealDefinitions.find((item) => item.id === seal.requiredPreviousSeal)?.name}`)
  if (seal.requiredPracticeCount) parts.push(`${seal.requiredPracticeCount} práticas`)
  if (seal.requiredStreak) parts.push(`sequência ${seal.requiredStreak}`)
  const cooldown = getCooldownInfo(progress, seal)
  if (!cooldown.ready) parts.push(`falta ${cooldown.remainingMinutes} min`)
  return parts.length ? parts.join(' · ') : 'disponível como primeiro limiar'
}
