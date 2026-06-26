import { codexCards } from '../data/codex.js'
import { codes, missions, portals, weeks } from '../data/game.js'

export const STORAGE_KEY = 'd7-jogo-consciencia-state-v2'
export const LEGACY_KEY = 'd7-jogo-consciencia-state-v1'

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function daysBetween(start, end) {
  const a = new Date(`${start}T00:00:00`)
  const b = new Date(`${end}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

export function getStage(progress) {
  return weeks[progress?.weekIndex] ?? weeks[0]
}

export function getJourneyCode(progress) {
  return `${getStage(progress).id}${progress.day}`
}

export function unique(items) {
  return [...new Set(items.filter(Boolean))]
}

export function scoreOf(player) {
  return Number(player.xp ?? 0) + Number(player.streak ?? 0) * 50 + Number(player.cards ?? 0) * 25 + Number(player.portals ?? 0) * 200 + Number(player.codes ?? 0) * 150
}

export function makeInitialState(profile = {}) {
  return {
    profile: { name: 'Jogador D7', title: 'Iniciado do Nada', avatar: 'D7', ...profile },
    progress: { weekIndex: 0, day: 1, streak: 0, lastPracticeDate: null, completedDays: [], resets: 0 },
    xp: 0,
    sparks: 0,
    unlockedCards: ['he-alef', 'sa-om'],
    studiedCards: [],
    unlockedCodes: [],
    openedPortals: [],
    completedMissions: [],
    daily: { date: todayKey(), practice: false, word: false, study: false, visited: [] },
    wordLog: [],
    codex: [
      { id: 'origem-dual', title: 'Códice Dual D7', text: 'Uma criação simbólica do jogo: hebraico como trilha de letras, números e códigos; sânscrito como trilha de sons, mantras e estados.', date: 'Registro inicial' },
    ],
    sessions: [],
    ritualMinutesTotal: 0,
    ritualMilestonesUnlocked: [],
    lastPracticeDurationMinutes: null,
    circles: [
      { id: 'aurora', name: 'Círculo Aurora', members: 7, pulse: 'Aberto', focus: 'Semana A', seal: '△' },
      { id: 'nucleo', name: 'Núcleo Brasa', members: 4, pulse: 'Privado', focus: 'Prática diária', seal: '◈' },
      { id: 'dual', name: 'Biblioteca Dual', members: 12, pulse: 'Estudo', focus: 'Códice Dual', seal: '✦' },
    ],
    lastUnlocks: [],
    tokenBalance: 0,
    totalTokenEarned: 0,
    tokenLedger: [],
    rankingPoints: 0,
    presenceBonusTotal: 0,
    presenceCounter108: 0,
    totalPresenceTicks: 0,
    totalTimersCompleted: 0,
    lastPresenceTickAt: null,
    integrityWarnings: 0,
    sealProgress: { unlockedSeals: [], completedChallenges: [], attempts: {}, totalFocusSeconds: 0, lastCompletedAt: null, lastSealId: null },
    symbolicMaps: [],
    symbolicMapProgress: { createdCount: 0, lastMapId: null, lastArchetype: null, completedSteps: [] },
  }
}

function arrayOr(value, fallback = []) {
  return Array.isArray(value) ? value : fallback
}

function numberOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

export function normalizeState(raw) {
  const base = makeInitialState()
  if (!raw || typeof raw !== 'object') return base

  const progress = { ...base.progress, ...(raw.progress && typeof raw.progress === 'object' ? raw.progress : {}) }
  progress.weekIndex = Math.min(Math.max(numberOr(progress.weekIndex, 0), 0), weeks.length - 1)
  progress.day = Math.min(Math.max(numberOr(progress.day, 1), 1), 7)
  progress.streak = Math.max(numberOr(progress.streak, 0), 0)
  progress.resets = Math.max(numberOr(progress.resets, 0), 0)
  progress.completedDays = unique(arrayOr(progress.completedDays, base.progress.completedDays))

  const daily = { ...base.daily, ...(raw.daily && typeof raw.daily === 'object' ? raw.daily : {}) }
  daily.visited = unique(arrayOr(daily.visited, base.daily.visited))
  daily.practice = Boolean(daily.practice)
  daily.word = Boolean(daily.word)
  daily.study = Boolean(daily.study)

  const sealProgress = raw.sealProgress && typeof raw.sealProgress === 'object' ? raw.sealProgress : {}
  const symbolicMapProgress = raw.symbolicMapProgress && typeof raw.symbolicMapProgress === 'object' ? raw.symbolicMapProgress : {}
  const sessionsTotal = arrayOr(raw.sessions, base.sessions).reduce((sum, session) => sum + Number(session?.minutes ?? session?.durationMinutes ?? 0), 0)
  const rawRitualMinutesTotal = Number(raw.ritualMinutesTotal)
  const ritualMinutesTotal = Number.isFinite(rawRitualMinutesTotal) && rawRitualMinutesTotal > 0 ? rawRitualMinutesTotal : sessionsTotal

  return {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile && typeof raw.profile === 'object' ? raw.profile : {}) },
    progress,
    xp: Math.max(numberOr(raw.xp, base.xp), 0),
    sparks: Math.max(numberOr(raw.sparks, base.sparks), 0),
    daily,
    circles: arrayOr(raw.circles).length ? raw.circles : base.circles,
    unlockedCards: arrayOr(raw.unlockedCards).includes('nada') ? ['he-alef', 'sa-om'] : unique(arrayOr(raw.unlockedCards, base.unlockedCards)),
    studiedCards: unique(arrayOr(raw.studiedCards, base.studiedCards)),
    unlockedCodes: unique(arrayOr(raw.unlockedCodes, base.unlockedCodes)),
    openedPortals: unique(arrayOr(raw.openedPortals, base.openedPortals)),
    completedMissions: unique(arrayOr(raw.completedMissions, base.completedMissions)),
    wordLog: arrayOr(raw.wordLog, base.wordLog).slice(0, 12),
    codex: arrayOr(raw.codex).length ? raw.codex : base.codex,
    sessions: arrayOr(raw.sessions, base.sessions),
    ritualMinutesTotal,
    ritualMilestonesUnlocked: unique([
      ...arrayOr(raw.ritualMilestonesUnlocked, base.ritualMilestonesUnlocked),
      ...(ritualMinutesTotal >= 21 ? [21] : []),
      ...(ritualMinutesTotal >= 108 ? [108] : []),
    ]),
    lastPracticeDurationMinutes: Number.isFinite(Number(raw.lastPracticeDurationMinutes)) ? Math.max(numberOr(raw.lastPracticeDurationMinutes, 0), 0) : base.lastPracticeDurationMinutes,
    lastUnlocks: unique(arrayOr(raw.lastUnlocks, base.lastUnlocks)).slice(0, 5),
    tokenBalance: Math.max(numberOr(raw.tokenBalance, base.tokenBalance), 0),
    totalTokenEarned: Math.max(numberOr(raw.totalTokenEarned, base.totalTokenEarned), 0),
    tokenLedger: arrayOr(raw.tokenLedger, base.tokenLedger).filter((entry) => entry && typeof entry === 'object'),
    rankingPoints: Math.max(numberOr(raw.rankingPoints, base.rankingPoints), 0),
    presenceBonusTotal: Math.max(numberOr(raw.presenceBonusTotal, base.presenceBonusTotal), 0),
    integrityWarnings: Math.max(numberOr(raw.integrityWarnings, base.integrityWarnings), 0),
    presenceCounter108: Math.min(108, Math.max(numberOr(raw.presenceCounter108, base.presenceCounter108), 0)),
    totalPresenceTicks: Math.max(numberOr(raw.totalPresenceTicks, base.totalPresenceTicks), 0),
    totalTimersCompleted: Math.max(numberOr(raw.totalTimersCompleted, base.totalTimersCompleted), 0),
    lastPresenceTickAt: typeof raw.lastPresenceTickAt === 'string' ? raw.lastPresenceTickAt : base.lastPresenceTickAt,
    sealProgress: {
      ...base.sealProgress,
      ...sealProgress,
      unlockedSeals: unique(arrayOr(sealProgress.unlockedSeals, base.sealProgress.unlockedSeals)),
      completedChallenges: unique(arrayOr(sealProgress.completedChallenges, base.sealProgress.completedChallenges)),
      attempts: sealProgress.attempts && typeof sealProgress.attempts === 'object' && !Array.isArray(sealProgress.attempts) ? sealProgress.attempts : {},
      totalFocusSeconds: Math.max(numberOr(sealProgress.totalFocusSeconds, 0), 0),
    },
    symbolicMaps: arrayOr(raw.symbolicMaps, base.symbolicMaps).filter((item) => item && typeof item === 'object').slice(0, 12),
    symbolicMapProgress: {
      ...base.symbolicMapProgress,
      ...symbolicMapProgress,
      createdCount: Math.max(numberOr(symbolicMapProgress.createdCount, 0), 0),
      completedSteps: unique(arrayOr(symbolicMapProgress.completedSteps, base.symbolicMapProgress.completedSteps)),
    },
  }
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
    return normalizeState(saved ? JSON.parse(saved) : null)
  } catch {
    return makeInitialState()
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)))
  } catch {
    // Storage can be unavailable in private mode or blocked browsers.
  }
}

export function resetStoredState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // Reset remains safe even when storage is unavailable.
  }
}

export function ensureToday(state) {
  const today = todayKey()
  let next = state
  if (next.daily.date !== today) {
    next = { ...next, daily: { date: today, practice: false, word: false, study: false, visited: [] }, completedMissions: [] }
  }
  const last = next.progress.lastPracticeDate
  if (!last || last === today || daysBetween(last, today) <= 1) return next
  return unlockDerived({
    ...next,
    progress: { ...next.progress, weekIndex: 0, day: 1, streak: 0, lastPracticeDate: null, completedDays: [], resets: next.progress.resets + 1 },
    codex: [{ id: `retorno-${Date.now()}`, title: 'Selo do Retorno', text: 'A sequência foi quebrada. O ciclo retorna para A1 e registra o retorno consciente.', date: new Date().toLocaleDateString('pt-BR') }, ...next.codex],
  })
}

export function advanceProgress(progress) {
  if (progress.day < 7) return { ...progress, day: progress.day + 1 }
  if (progress.weekIndex < weeks.length - 1) return { ...progress, weekIndex: progress.weekIndex + 1, day: 1 }
  return { ...progress, weekIndex: weeks.length - 1, day: 7 }
}

export function cardById(id) {
  return codexCards.find((card) => card.id === id)
}

function nextCardsForSession(totalSessions, completedDays) {
  const ids = ['he-bet', 'sa-a']
  if (totalSessions >= 2) ids.push('he-gimel', 'sa-ma')
  if (totalSessions >= 3) ids.push('he-dalet', 'sa-sha')
  if (totalSessions >= 4) ids.push('he-he', 'sa-mantra')
  if (totalSessions >= 5) ids.push('he-vav', 'sa-prana')
  if (totalSessions >= 6) ids.push('he-zayin', 'sa-shanti')
  if (completedDays.includes('A7')) ids.push('hw-or', 'hw-lev')
  if (completedDays.some((day) => day.startsWith('B'))) ids.push('hw-ruach', 'sa-dhyana')
  if (completedDays.some((day) => day.startsWith('C'))) ids.push('hw-emet', 'sa-atman')
  if (completedDays.some((day) => day.startsWith('D'))) ids.push('hw-shalom', 'he-mem', 'he-shin', 'he-tav')
  return ids
}

function sumPracticeMinutes(sessions = []) {
  return sessions.reduce((sum, session) => sum + Math.max(0, Number(session?.minutes ?? session?.durationMinutes ?? 0) || 0), 0)
}

export function clampPracticeMinutes(minutes) {
  const value = Math.floor(Number(minutes) || 0)
  return Math.min(108, Math.max(1, value))
}

export function calculatePracticeReward(durationMinutes, progress, today = todayKey()) {
  const currentMinutes = Math.max(0, Number(durationMinutes) || 0)
  const validMinutes = clampPracticeMinutes(currentMinutes || 1)
  const ritualMinutesTotal = Math.max(0, Number(progress.ritualMinutesTotal ?? sumPracticeMinutes(progress.sessions ?? [])) || 0)
  const nextRitualMinutesTotal = ritualMinutesTotal + validMinutes
  const primaryRewardAvailable = !progress.daily?.practice
  const primaryReward = primaryRewardAvailable ? {
    xp: 50 + Math.floor(validMinutes * 2),
    sparks: 3 + Math.floor(validMinutes / 7),
    d7t: validMinutes >= 21 ? 3 : 1,
    rewarded: true,
  } : {
    xp: 0,
    sparks: 0,
    d7t: 0,
    rewarded: false,
  }
  const alreadyUnlocked = unique(progress.ritualMilestonesUnlocked ?? [])
  const newlyUnlocked = [
    ...(nextRitualMinutesTotal >= 21 && !alreadyUnlocked.includes(21) ? [21] : []),
    ...(nextRitualMinutesTotal >= 108 && !alreadyUnlocked.includes(108) ? [108] : []),
  ]
  const milestonesUnlocked = unique([...alreadyUnlocked, ...newlyUnlocked])
  const milestoneRewards = {
    xp: 0,
    sparks: 0,
    d7t: 0,
    unlocked: [],
  }
  if (newlyUnlocked.includes(21)) {
    milestoneRewards.xp += 21
    milestoneRewards.d7t += 2
    milestoneRewards.unlocked.push(21)
  }
  if (newlyUnlocked.includes(108)) {
    milestoneRewards.xp += 108
    milestoneRewards.d7t += 7
    milestoneRewards.unlocked.push(108)
  }
  return {
    validMinutes,
    nextRitualMinutesTotal,
    primaryReward,
    milestoneRewards,
    milestonesUnlocked,
    completedAt: new Date().toISOString(),
    today,
  }
}

export function recordPresenceTick(state, amount = 1, at = new Date().toISOString()) {
  const current = ensureToday(state)
  const increment = Math.max(0, Number(amount) || 0)
  if (!increment) return current
  const nextTicks = (current.totalPresenceTicks ?? 0) + increment
  return {
    ...current,
    presenceCounter108: Math.min(108, (current.presenceCounter108 ?? 0) + increment),
    totalPresenceTicks: nextTicks,
    totalTimersCompleted: (current.totalTimersCompleted ?? 0) + 1,
    lastPresenceTickAt: at,
  }
}

export function completePractice(state, options = {}) {
  const current = ensureToday(state)
  const durationMinutes = clampPracticeMinutes(options.durationMinutes ?? getStage(current.progress).minutes)
  const rewardMode = options.rewardMode === 'free' ? 'free' : 'primary'
  const code = getJourneyCode(current.progress)
  const totalSessions = current.sessions.length + 1
  const completedDays = rewardMode === 'primary' && !current.daily.practice ? unique([...current.progress.completedDays, code]) : current.progress.completedDays
  const newStreak = rewardMode === 'primary' && !current.daily.practice && current.progress.lastPracticeDate !== todayKey() ? current.progress.streak + 1 : current.progress.streak
  const reward = calculatePracticeReward(durationMinutes, current)
  const practiceXp = rewardMode === 'primary' ? reward.primaryReward.xp : 0
  const practiceSparks = rewardMode === 'primary' ? reward.primaryReward.sparks : 0
  const practiceTokens = rewardMode === 'primary' ? reward.primaryReward.d7t : 0
  const unlockedMilestones = reward.milestoneRewards.unlocked
  const milestoneXp = reward.milestoneRewards.xp
  const milestoneTokens = reward.milestoneRewards.d7t
  const ritualMinutesTotal = reward.nextRitualMinutesTotal
  const sessions = [{
    id: `sessao-${Date.now()}`,
    mode: 'Ritual',
    code,
    minutes: durationMinutes,
    xp: practiceXp + milestoneXp,
    sparks: practiceSparks,
    d7t: practiceTokens + milestoneTokens,
    rewarded: rewardMode === 'primary' || unlockedMilestones.length > 0,
    rewardMode,
    date: todayKey(),
    completedAt: reward.completedAt,
  }, ...current.sessions]
  const unlockedCards = unique([...current.unlockedCards, ...nextCardsForSession(totalSessions, completedDays)])
  const next = recordPresenceTick({
    ...current,
    xp: current.xp + practiceXp + milestoneXp,
    sparks: current.sparks + practiceSparks,
    tokenBalance: Math.max(0, (current.tokenBalance ?? 0) + practiceTokens + milestoneTokens),
    totalTokenEarned: (current.totalTokenEarned ?? 0) + practiceTokens + milestoneTokens,
    unlockedCards,
    daily: { ...current.daily, practice: current.daily.practice || rewardMode === 'primary' },
    progress: rewardMode === 'primary' && !current.daily.practice ? advanceProgress({ ...current.progress, streak: newStreak, lastPracticeDate: todayKey(), completedDays }) : current.progress,
    sessions,
    ritualMinutesTotal,
    ritualMilestonesUnlocked: reward.milestonesUnlocked,
    lastPracticeDurationMinutes: durationMinutes,
    codex: [{ id: `codice-${Date.now()}`, title: `${code}: Prática ritual concluída`, text: `Prática de ${durationMinutes} minuto(s), ${rewardMode === 'primary' ? `+${practiceXp} XP e +${practiceSparks} Centelhas.` : 'sem recompensa principal adicional.'}`, date: new Date().toLocaleDateString('pt-BR') }, ...current.codex],
  }, durationMinutes, reward.completedAt)

  const lastUnlocks = []
  if (rewardMode === 'primary') {
    lastUnlocks.push('Prática registrada', `+${practiceXp} XP`, `+${practiceSparks} Centelhas`, `+${practiceTokens} D7T`)
  } else {
    lastUnlocks.push('Prática livre registrada')
  }
  if (unlockedMilestones.includes(21)) lastUnlocks.unshift('Marco 21 desbloqueado', '+21 XP', '+2 D7T')
  if (unlockedMilestones.includes(108)) lastUnlocks.unshift('Marco 108 desbloqueado', '+108 XP', '+7 D7T')
  return unlockDerived({
    ...next,
    ritualMilestonesUnlocked: reward.milestonesUnlocked,
    lastUnlocks: unique([...lastUnlocks, ...(next.lastUnlocks ?? [])]).slice(0, 5),
  }, lastUnlocks)
}

export function recordVisit(state, view) {
  const current = ensureToday(state)
  if (!['jornada', 'ranking'].includes(view) || current.daily.visited.includes(view)) return current
  return unlockDerived({ ...current, xp: current.xp + 10, daily: { ...current.daily, visited: unique([...current.daily.visited, view]) } }, [`Missão: visitar ${view}`, '+10 XP'])
}

export function studyCard(state, cardId) {
  const current = ensureToday(state)
  if (!current.unlockedCards.includes(cardId)) return current
  const firstStudyToday = !current.daily.study
  return unlockDerived({
    ...current,
    xp: current.xp + (firstStudyToday ? 15 : 5),
    studiedCards: unique([...current.studiedCards, cardId]),
    daily: { ...current.daily, study: true },
  }, ['Carta estudada', firstStudyToday ? '+15 XP' : '+5 XP'])
}

export function recordWord(state, word) {
  const text = word.trim()
  if (!text) return state
  const current = ensureToday(state)
  return unlockDerived({
    ...current,
    sparks: current.sparks + 2,
    daily: { ...current.daily, word: true },
    wordLog: [{ id: `palavra-${Date.now()}`, text, date: todayKey() }, ...current.wordLog].slice(0, 12),
    codex: [{ id: `palavra-codice-${Date.now()}`, title: 'Palavra registrada', text: `A palavra "${text}" entrou na biblioteca simbólica do jogador.`, date: new Date().toLocaleDateString('pt-BR') }, ...current.codex],
  }, ['Palavra registrada', '+2 Centelhas'])
}

export function openPortal(state, portalId) {
  const portal = portals.find((item) => item.id === portalId)
  if (!portal || state.openedPortals.includes(portalId)) return state
  const weekComplete = state.progress.completedDays.includes(`${portal.week}7`)
  if (!weekComplete) return state
  return unlockDerived({
    ...state,
    xp: state.xp + 120 + portals.findIndex((item) => item.id === portalId) * 40,
    openedPortals: unique([...state.openedPortals, portalId]),
    codex: [{ id: `portal-${portalId}-${Date.now()}`, title: `${portal.name} aberto`, text: `${portal.phrase} Recompensa: ${portal.reward}.`, date: new Date().toLocaleDateString('pt-BR') }, ...state.codex],
  }, [`${portal.name} aberto`, portal.rareCard])
}

export function missionStatus(state, mission) {
  if (mission.type === 'practice') return state.daily.practice
  if (mission.type === 'word') return state.daily.word
  if (mission.type === 'study') return state.daily.study
  if (mission.type === 'visit') return state.daily.visited.includes(mission.view)
  return false
}

export function weeklyMissionStatus(state, missionId) {
  const hebrew = state.unlockedCards.filter((id) => cardById(id)?.track === 'hebraica').length
  const sanskrit = state.unlockedCards.filter((id) => cardById(id)?.track === 'sânscrita').length
  if (missionId === 'weekly-a7') return ['A7', 'B7', 'C7', 'D7'].some((day) => state.progress.completedDays.includes(day))
  if (missionId === 'weekly-hebrew-3') return hebrew >= 3
  if (missionId === 'weekly-sanskrit-3') return sanskrit >= 3
  if (missionId === 'weekly-code') return state.unlockedCodes.length >= 1
  if (missionId === 'weekly-portal') return state.openedPortals.length >= 1
  return false
}

export function unlockDerived(state, messages = []) {
  const cardSet = new Set(state.unlockedCards)
  const codeSet = new Set(state.unlockedCodes)
  const portalSet = new Set(state.openedPortals)
  const has = (id) => cardSet.has(id)
  if (has('he-alef') && has('sa-om')) codeSet.add('code-alef-om')
  if (has('hw-or') && has('sa-shanti')) codeSet.add('code-or-shanti')
  if (has('hw-ruach') && has('sa-prana')) codeSet.add('code-ruach-prana')
  if (has('hw-emet') && has('sa-dhyana')) codeSet.add('code-emet-dhyana')
  if (state.progress.completedDays.includes('D7')) codeSet.add('seal-d7')
  if (state.progress.resets > 0) codeSet.add('seal-return')
  if (state.progress.streak >= 3) codeSet.add('seal-stay')
  if (portalSet.size >= 4) codeSet.add('seal-cycle')

  const completedMissions = unique([
    ...missions.daily.filter((mission) => missionStatus(state, mission)).map((mission) => mission.id),
    ...missions.weekly.filter((mission) => weeklyMissionStatus(state, mission.id)).map((mission) => mission.id),
  ])

  const beforeCodes = new Set(state.unlockedCodes)
  const newCodes = [...codeSet].filter((id) => !beforeCodes.has(id)).map((id) => codes.find((code) => code.id === id)?.name).filter(Boolean)
  return { ...state, unlockedCodes: [...codeSet], completedMissions, lastUnlocks: unique([...messages, ...newCodes].slice(0, 5)) }
}

export function playerLevel(xp) {
  return Math.floor(xp / 250) + 1
}
