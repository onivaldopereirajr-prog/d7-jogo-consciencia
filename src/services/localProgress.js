import { mockPlayers } from '../data/game.js'
import { STORAGE_KEY, LEGACY_KEY, ensureToday, getJourneyCode, getStage, loadState, makeInitialState, normalizeState, playerLevel } from '../utils/gameState.js'
import { getRankingScore, getSealGateScore, getUserSealEvents } from './sealEngine.js'
import { getLibraryStudyStats } from './libraryEngine.js'
import { safeGetStorage, safeRemoveStorage, safeSetStorage } from '../utils/storageSafe.js'
import { getUsers, publicUser } from './localAuth.js'

export const PROGRESS_BY_USER_KEY = 'd7_progress_by_user'

export function getProgressByUser() {
  const data = safeGetStorage(PROGRESS_BY_USER_KEY, {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export function saveProgressByUser(data) {
  return safeSetStorage(PROGRESS_BY_USER_KEY, data)
}

export function makeUserInitialState(user) {
  const base = makeInitialState()
  return {
    ...base,
    profile: { name: user.name, title: 'Iniciado do Nada', avatar: user.name.slice(0, 2).toUpperCase() || 'D7' },
  }
}

export function getUserState(user) {
  if (!user?.id) return ensureToday(makeInitialState())
  const all = getProgressByUser()
  const saved = all[user.id]
  return ensureToday(normalizeState(saved ?? makeUserInitialState(user)))
}

export function saveUserProgress(userId, state) {
  if (!userId) return false
  const all = getProgressByUser()
  return saveProgressByUser({ ...all, [userId]: { ...normalizeState(state), updatedAt: new Date().toISOString() } })
}

export function resetUserProgress(user) {
  if (!user?.id) return makeInitialState()
  const fresh = makeUserInitialState(user)
  saveUserProgress(user.id, fresh)
  return fresh
}

export function deleteUserProgress(userId) {
  const all = getProgressByUser()
  delete all[userId]
  saveProgressByUser(all)
}

export function migrateLegacyProgressIfSafe(user) {
  if (!user?.id) return { migrated: false, reason: 'Usuário ausente.' }
  const all = getProgressByUser()
  if (all[user.id]) return { migrated: false, reason: 'Usuário já possui progresso local.' }
  const legacy = loadState()
  const hasLegacyProgress = legacy.xp > 0 || legacy.sparks > 0 || legacy.sessions.length > 0 || legacy.progress.completedDays.length > 0 || legacy.unlockedCards.length > 2
  if (!hasLegacyProgress) return { migrated: false, reason: 'Nenhum progresso antigo relevante encontrado.' }
  saveProgressByUser({ ...all, [user.id]: { ...normalizeState(legacy), profile: { ...legacy.profile, name: user.name, avatar: user.name.slice(0, 2).toUpperCase() || 'D7' }, migratedFromAnonymousAt: new Date().toISOString() } })
  return { migrated: true, reason: 'Progresso anônimo antigo migrado para este usuário.' }
}

export function clearLegacyAnonymousProgress() {
  safeRemoveStorage(STORAGE_KEY)
  safeRemoveStorage(LEGACY_KEY)
}

export function userProgressSummary(user, state) {
  const current = ensureToday(state)
  const stage = getStage(current.progress)
  const library = getLibraryStudyStats(current)
  return {
    user: publicUser(user),
    currentStage: getJourneyCode(current.progress),
    currentWeek: stage.id,
    currentDay: current.progress.day,
    xp: current.xp,
    sparks: current.sparks,
    level: playerLevel(current.xp),
    score: getRankingScore(current),
    gateScore: getSealGateScore(current),
    tokenBalance: current.tokenBalance ?? 0,
    totalTokenEarned: current.totalTokenEarned ?? 0,
    unlockedSeals: current.sealProgress?.unlockedSeals ?? [],
    completedChallenges: current.sealProgress?.completedChallenges ?? [],
    totalSealFocusSeconds: current.sealProgress?.totalFocusSeconds ?? 0,
    integrityWarnings: current.integrityWarnings ?? 0,
    lastSealId: current.sealProgress?.lastSealId ?? null,
    sealEvents: getUserSealEvents(user.id).slice(-6),
    symbolicMapsCount: current.symbolicMaps?.length ?? 0,
    lastMapArchetype: current.symbolicMapProgress?.lastArchetype ?? null,
    symbolicMaps: (current.symbolicMaps ?? []).slice(0, 5),
    ritualMinutesTotal: current.ritualMinutesTotal ?? 0,
    ritualMilestonesUnlocked: current.ritualMilestonesUnlocked ?? [],
    lastPracticeDurationMinutes: current.lastPracticeDurationMinutes ?? null,
    presenceCounter108: current.presenceCounter108 ?? 0,
    totalPresenceTicks: current.totalPresenceTicks ?? 0,
    totalTimersCompleted: current.totalTimersCompleted ?? 0,
    lastPresenceTickAt: current.lastPresenceTickAt ?? null,
    streak: current.progress.streak,
    completedPractices: current.sessions.length,
    lastPracticeDate: current.progress.lastPracticeDate,
    cards: current.unlockedCards,
    medals: current.unlockedCodes,
    portals: current.openedPortals,
    practiceHistory: current.sessions,
    updatedAt: current.updatedAt ?? null,
    libraryTitle: current.libraryProgress?.currentTitle ?? library.title,
    libraryCardsStudied: library.studiedCardsCount,
    libraryCardsUnlocked: library.unlockedStudyCount,
    libraryModulesCompleted: library.completedModulesCount,
    libraryPhasesCompleted: library.completedPhasesCount,
    libraryRecommendation: library.recommended?.id ?? null,
    lastLibraryCardId: current.libraryProgress?.lastStudiedCardId ?? null,
    lastLibraryModuleId: current.libraryProgress?.lastModuleId ?? null,
    lastLibraryPhaseId: current.libraryProgress?.lastPhaseId ?? null,
    libraryStudyLog: current.libraryProgress?.studyLog ?? [],
  }
}

export function getAllLocalSummaries() {
  const users = getUsers()
  const all = getProgressByUser()
  return users.map((user) => userProgressSummary(user, normalizeState(all[user.id] ?? makeUserInitialState(user))))
}

export function localRanking(currentUserId) {
  const localPlayers = getAllLocalSummaries().map((summary) => ({
    name: summary.user.name,
    title: summary.user.login,
    xp: summary.xp,
    sparks: summary.sparks,
    streak: summary.streak,
    cards: summary.cards.length,
    portals: summary.portals.length,
    codes: summary.medals.length,
    seals: summary.unlockedSeals.length,
    tokens: summary.tokenBalance,
    ritualMinutesTotal: summary.ritualMinutesTotal ?? 0,
    ritualMilestonesUnlocked: summary.ritualMilestonesUnlocked ?? [],
    stage: summary.currentStage,
    score: summary.score,
    libraryCardsStudied: summary.libraryCardsStudied ?? 0,
    libraryModulesCompleted: summary.libraryModulesCompleted ?? 0,
    libraryPhasesCompleted: summary.libraryPhasesCompleted ?? 0,
    libraryTitle: summary.libraryTitle ?? 'Iniciado do Silêncio',
    current: summary.user.id === currentUserId,
  }))
  return [...mockPlayers.map((item) => ({ ...item, seals: item.portals, tokens: 0, stage: 'D7', score: item.xp + item.streak * 50 + item.cards * 25 + item.portals * 200 + item.codes * 150 })), ...localPlayers].sort((a, b) => b.score - a.score)
}
