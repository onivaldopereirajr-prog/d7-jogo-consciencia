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
    circles: [
      { id: 'aurora', name: 'Círculo Aurora', members: 7, pulse: 'Aberto', focus: 'Semana A', seal: '△' },
      { id: 'nucleo', name: 'Núcleo Brasa', members: 4, pulse: 'Privado', focus: 'Prática diária', seal: '◈' },
      { id: 'dual', name: 'Biblioteca Dual', members: 12, pulse: 'Estudo', focus: 'Códice Dual', seal: '✦' },
    ],
    lastUnlocks: [],
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
    lastUnlocks: unique(arrayOr(raw.lastUnlocks, base.lastUnlocks)).slice(0, 5),
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

export function completePractice(state) {
  const current = ensureToday(state)
  if (current.daily.practice) return unlockDerived(current, ['Prática de hoje já registrada'])
  const stage = getStage(current.progress)
  const code = getJourneyCode(current.progress)
  const totalSessions = current.sessions.length + 1
  const completedDays = unique([...current.progress.completedDays, code])
  const newStreak = current.progress.lastPracticeDate === todayKey() ? current.progress.streak : current.progress.streak + 1
  const xp = 45 + stage.minutes * 20
  const sparks = 4 + stage.minutes
  const unlockedCards = unique([...current.unlockedCards, ...nextCardsForSession(totalSessions, completedDays)])
  const next = {
    ...current,
    xp: current.xp + xp,
    sparks: current.sparks + sparks,
    unlockedCards,
    daily: { ...current.daily, practice: true },
    progress: advanceProgress({ ...current.progress, streak: newStreak, lastPracticeDate: todayKey(), completedDays }),
    sessions: [{ id: `sessao-${Date.now()}`, mode: 'Nada', code, minutes: stage.minutes, xp, sparks, date: todayKey() }, ...current.sessions],
    codex: [{ id: `codice-${Date.now()}`, title: `${code}: Nada concluído`, text: `Prática de ${stage.minutes} minuto(s), +${xp} XP e +${sparks} Centelhas.`, date: new Date().toLocaleDateString('pt-BR') }, ...current.codex],
  }
  return unlockDerived(next, ['Prática registrada', `+${xp} XP`, `+${sparks} Centelhas`])
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
