import { initiationModules, libraryPhasesById, studyableLibraryCards } from '../data/initiationLibrary.js'

const libraryCardsById = Object.fromEntries(studyableLibraryCards.map((card) => [card.id, card]))
const libraryCards = studyableLibraryCards
const libraryCardIds = new Set(libraryCards.map((card) => card.id))
const libraryInitialCardIds = new Set(['lib-intro', 'he-alef', 'sa-om', 'sa-a'])

function unique(items) {
  return [...new Set((items ?? []).filter(Boolean))]
}

function numberOr(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

function getPracticeCount(progress) {
  return Array.isArray(progress?.sessions) ? progress.sessions.length : 0
}

function getStudyCount(progress) {
  return Array.isArray(progress?.studiedCards) ? progress.studiedCards.length : 0
}

function getMapCount(progress) {
  return Array.isArray(progress?.symbolicMaps) ? progress.symbolicMaps.length : 0
}

function hasCode(progress, codeId) {
  return Array.isArray(progress?.unlockedCodes) && progress.unlockedCodes.includes(codeId)
}

function hasSeal(progress, sealId) {
  return Array.isArray(progress?.sealProgress?.unlockedSeals) && progress.sealProgress.unlockedSeals.includes(sealId)
}

function hasModuleCards(progress, cardIds = []) {
  return cardIds.every((id) => progress?.studiedCards?.includes(id))
}

function hasLedgerSource(progress, sourceType, sourceId) {
  return Array.isArray(progress?.tokenLedger) && progress.tokenLedger.some((entry) => entry.sourceType === sourceType && entry.sourceId === sourceId)
}

function moduleRequirementMet(progress, module) {
  const requirement = module?.requirement ?? {}
  const practiceMinutes = numberOr(progress?.ritualMinutesTotal, 0)
  const studyCount = getStudyCount(progress)
  const seals = progress?.sealProgress?.unlockedSeals ?? []
  const maps = getMapCount(progress)

  if (requirement.practiceMinutes && practiceMinutes < requirement.practiceMinutes) return false
  if (requirement.studyCount && studyCount < requirement.studyCount) return false
  if (Array.isArray(requirement.cardIds) && requirement.cardIds.length && !requirement.cardIds.every((id) => progress?.studiedCards?.includes(id))) return false
  if (Array.isArray(requirement.cards) && requirement.cards.length && !requirement.cards.every((id) => progress?.unlockedCards?.includes(id) || progress?.studiedCards?.includes(id))) return false
  if (Array.isArray(requirement.seals) && requirement.seals.length && !requirement.seals.every((id) => seals.includes(id))) return false
  if (requirement.mapCreated && maps < requirement.mapCreated) return false
  return true
}

function cardUnlockRule(progress, cardId) {
  if (libraryInitialCardIds.has(cardId)) return true
  if (progress?.unlockedCards?.includes(cardId) || progress?.studiedCards?.includes(cardId)) return true

  const practiceCount = getPracticeCount(progress)
  const studyCount = getStudyCount(progress)

  if (cardId === 'lib-intro') return true

  if (['he-bet', 'sa-ma', 'kb-cabala', 'kb-einsof', 'kb-ohr'].includes(cardId)) {
    return practiceCount >= 1 || studyCount >= 1 || hasCode(progress, 'code-alef-om')
  }

  if (['he-gimel', 'sa-aa', 'sa-ra', 'sa-sha', 'kb-tzimtzum', 'kb-kav'].includes(cardId)) {
    return practiceCount >= 2 || hasCode(progress, 'code-alef-om') || hasCode(progress, 'code-or-shanti')
  }

  if (['he-dalet', 'sa-mantra', 'sa-prana', 'sa-shanti', 'kb-tree', 'kb-three-pillars', 'kb-keter', 'kb-chokhmah', 'kb-binah', 'bridge-or-shanti'].includes(cardId)) {
    return practiceCount >= 3 || hasCode(progress, 'code-or-shanti')
  }

  if (['he-he', 'he-vav', 'hw-or', 'hw-lev', 'hw-ruach', 'kb-chesed', 'kb-gevurah', 'kb-tiferet', 'kb-yesod', 'kb-malkhut', 'sa-dhyana', 'sa-atman', 'kb-dream', 'kb-visualization', 'kb-ritual', 'bridge-ruach-prana', 'bridge-emet-dhyana'].includes(cardId)) {
    return practiceCount >= 5 || hasSeal(progress, 'seal-d7') || getMapCount(progress) > 0 || hasCode(progress, 'code-ruach-prana') || hasCode(progress, 'code-emet-dhyana')
  }

  if (['he-zayin', 'he-chet', 'he-tet', 'he-yod', 'he-kaf', 'he-lamed', 'he-mem', 'he-nun', 'he-samekh', 'he-ayin', 'he-pe', 'he-tsadi', 'he-qof', 'he-resh', 'he-shin', 'he-tav', 'hw-shalom', 'hw-emet', 'sa-vrtti', 'bridge-d7'].includes(cardId)) {
    return practiceCount >= 7 || hasSeal(progress, 'seal-cycle') || (progress?.progress?.streak ?? 0) >= 2 || getMapCount(progress) > 0
  }

  return false
}

export function isLibraryCard(cardId) {
  return libraryCardIds.has(cardId)
}

export function getLibraryCard(cardId) {
  return libraryCardsById[cardId] ?? null
}

export function getLibraryCardStatus(progress, cardId) {
  if (!isLibraryCard(cardId)) return 'unknown'
  if (progress?.studiedCards?.includes(cardId)) return 'studied'
  return cardUnlockRule(progress, cardId) ? 'available' : 'locked'
}

export function getLibraryModuleStatus(progress, moduleId) {
  const module = initiationModules.find((item) => item.id === moduleId)
  if (!module) return { module: null, unlocked: false, completed: false, progress: 0, total: 0, status: 'locked' }
  const total = module.cardIds.length
  const completed = hasModuleCards(progress, module.cardIds)
  const unlocked = moduleRequirementMet(progress, module)
  const progressCount = module.cardIds.filter((id) => progress?.studiedCards?.includes(id)).length
  return {
    module,
    unlocked,
    completed,
    progress: progressCount,
    total,
    status: completed ? 'completed' : unlocked ? 'available' : 'locked',
  }
}

export function getLibraryPhaseStatus(progress, phaseId) {
  const phase = libraryPhasesById[phaseId]
  if (!phase) return { phase: null, completed: false, progress: 0, total: 0, status: 'locked' }
  const total = phase.requiredCards.length
  const progressCount = phase.requiredCards.filter((id) => progress?.studiedCards?.includes(id)).length
  const completed = total > 0 && progressCount === total
  return {
    phase,
    completed,
    progress: progressCount,
    total,
    status: completed ? 'completed' : progressCount > 0 ? 'available' : 'locked',
  }
}

export function getLibraryStudyStats(progress) {
  const studiedCards = Array.isArray(progress?.studiedCards) ? progress.studiedCards.filter((id) => isLibraryCard(id)) : []
  const completedModules = initiationModules.filter((module) => hasModuleCards(progress, module.cardIds)).map((module) => module.id)
  const completedPhases = Object.values(libraryPhasesById).filter((phase) => phase.requiredCards.every((id) => progress?.studiedCards?.includes(id))).map((phase) => phase.id)
  const title = getLibraryTitle(progress)
  return {
    studiedCardsCount: studiedCards.length,
    completedModulesCount: completedModules.length,
    completedPhasesCount: completedPhases.length,
    unlockedStudyCount: libraryCards.filter((card) => cardUnlockRule(progress, card.id)).length,
    lockedStudyCount: libraryCards.length - libraryCards.filter((card) => cardUnlockRule(progress, card.id)).length,
    title,
    studiedCards,
    completedModules,
    completedPhases,
    moduleStatuses: initiationModules.map((module) => getLibraryModuleStatus(progress, module.id)),
    phaseStatuses: Object.values(libraryPhasesById).map((phase) => getLibraryPhaseStatus(progress, phase.id)),
  }
}

export function getRecommendedLibraryCard(progress) {
  const orderedCards = [
    'lib-intro',
    'he-alef', 'sa-om', 'sa-a',
    'he-bet', 'sa-ma', 'kb-cabala', 'kb-einsof', 'kb-ohr',
    'he-gimel', 'sa-aa', 'sa-ra', 'sa-sha', 'kb-tzimtzum', 'kb-kav',
    'he-dalet', 'sa-mantra', 'sa-prana', 'sa-shanti', 'kb-tree', 'kb-three-pillars', 'kb-keter', 'kb-chokhmah', 'kb-binah',
    'he-he', 'he-vav', 'hw-or', 'hw-lev', 'hw-ruach', 'kb-chesed', 'kb-gevurah', 'kb-tiferet', 'kb-yesod', 'kb-malkhut', 'sa-dhyana', 'sa-atman', 'kb-dream', 'kb-visualization', 'kb-ritual', 'bridge-ruach-prana', 'bridge-emet-dhyana',
    'he-zayin', 'he-chet', 'he-tet', 'he-yod', 'he-kaf', 'he-lamed', 'he-mem', 'he-nun', 'he-samekh', 'he-ayin', 'he-pe', 'he-tsadi', 'he-qof', 'he-resh', 'he-shin', 'he-tav', 'hw-shalom', 'hw-emet', 'sa-vrtti', 'bridge-d7',
  ]
  return orderedCards.map((id) => libraryCardsById[id]).find((card) => card && cardUnlockRule(progress, card.id) && !progress?.studiedCards?.includes(card.id)) ?? null
}

export function getLibraryTitle(progress) {
  const stats = {
    studiedCardsCount: getStudyCount(progress),
    completedModules: initiationModules.filter((module) => hasModuleCards(progress, module.cardIds)).map((module) => module.id),
    completedPhases: Object.values(libraryPhasesById).filter((phase) => phase.requiredCards.every((id) => progress?.studiedCards?.includes(id))).map((phase) => phase.id),
  }
  if (stats.completedPhases.length >= 4) return 'Mestre da Presença Simbólica'
  if (stats.completedPhases.includes('phase-d') || hasSeal(progress, 'seal-cycle') || progress?.symbolicMaps?.length > 0) return 'Portador do Código D7'
  if (stats.completedModules.includes('ten-sefirot')) return 'Guardião das Sefirot'
  if (stats.completedModules.includes('sounds-mantras') || stats.completedModules.includes('sanskrit-words-d7')) return 'Tecelão dos Sons'
  if (stats.completedModules.includes('tree-of-life')) return 'Peregrino da Árvore'
  if (stats.completedModules.length >= 4) return 'Estudioso do Códice'
  if (stats.studiedCardsCount >= 4) return 'Guardião do Om'
  if (stats.studiedCardsCount >= 2) return 'Leitor de Alef'
  return 'Iniciado do Silêncio'
}

export function getLibraryModuleReward(module) {
  return module?.reward ?? { xp: 0, sparks: 0, d7t: 0, rankingPoints: 0 }
}

export function getLibraryPhaseReward(phase) {
  return phase?.reward ?? { xp: 0, sparks: 0, d7t: 0, rankingPoints: 0 }
}

function appendLedger(progress, sourceType, sourceId, amount, reason) {
  if (!amount) return progress
  if (hasLedgerSource(progress, sourceType, sourceId)) return progress
  const entry = {
    id: `${sourceType}-${sourceId}-${Date.now()}`,
    sourceType,
    sourceId,
    amount,
    createdAt: new Date().toISOString(),
    reason,
  }
  return {
    ...progress,
    tokenBalance: Math.max(0, numberOr(progress?.tokenBalance, 0) + amount),
    totalTokenEarned: numberOr(progress?.totalTokenEarned, 0) + amount,
    tokenLedger: [...(progress?.tokenLedger ?? []), entry],
  }
}

export function studyLibraryCard(progress, cardId) {
  const card = getLibraryCard(cardId)
  if (!card) return null
  if (!cardUnlockRule(progress, cardId)) {
    return {
      ok: false,
      progress,
      message: 'Este card ainda está bloqueado. Siga a trilha indicada pela biblioteca.',
    }
  }

  const now = new Date().toISOString()
  const alreadyStudied = progress?.studiedCards?.includes(cardId)
  const baseReward = card.reward ?? { xp: 0, sparks: 0, d7t: 0, rankingPoints: 0 }
  let next = {
    ...progress,
    daily: { ...(progress?.daily ?? {}), study: true },
    studiedCards: unique([...(progress?.studiedCards ?? []), cardId]),
    libraryProgress: {
      ...(progress?.libraryProgress ?? {}),
      lastStudiedCardId: cardId,
      lastStudiedAt: now,
      studyLog: [
        {
          id: `library-study-${cardId}-${Date.now()}`,
          cardId,
          cardTitle: card.title,
          moduleId: card.moduleId,
          createdAt: now,
          repeated: alreadyStudied,
        },
        ...((progress?.libraryProgress?.studyLog ?? []) || []),
      ].slice(0, 24),
    },
  }

  let lastUnlocks
  if (!alreadyStudied) {
    next = appendLedger(next, 'study-card', cardId, baseReward.d7t || 1, `Estudo inicial do card ${card.title}`)
    next = {
      ...next,
      xp: numberOr(next.xp, 0) + numberOr(baseReward.xp, 0),
      sparks: numberOr(next.sparks, 0) + numberOr(baseReward.sparks, 0),
      rankingPoints: numberOr(next.rankingPoints, 0) + numberOr(baseReward.rankingPoints, 0),
      lastUnlocks: unique([`${card.title} estudado`, ...(next.lastUnlocks ?? [])]).slice(0, 5),
      libraryProgress: {
        ...(next.libraryProgress ?? {}),
        currentTitle: getLibraryTitle(next),
      },
    }
    lastUnlocks = [
      `${card.title} estudado`,
      `+${numberOr(baseReward.xp, 0)} XP`,
      `+${numberOr(baseReward.sparks, 0)} Centelhas`,
      `+${numberOr(baseReward.d7t, 0) || 1} D7T`,
    ]
  } else {
    next = {
      ...next,
      lastUnlocks: unique([`${card.title} revisado`, ...(next.lastUnlocks ?? [])]).slice(0, 5),
      libraryProgress: {
        ...(next.libraryProgress ?? {}),
        currentTitle: getLibraryTitle(next),
      },
    }
    lastUnlocks = [`${card.title} revisado`, 'Revisão sem recompensa repetida']
  }

  const completedModules = initiationModules.filter((module) => hasModuleCards(next, module.cardIds))
  const moduleRewards = []
  for (const module of completedModules) {
    const completedIds = next.libraryProgress?.completedModuleIds ?? []
    if (completedIds.includes(module.id)) continue
    const reward = getLibraryModuleReward(module)
    next = {
      ...next,
      xp: numberOr(next.xp, 0) + numberOr(reward.xp, 0),
      sparks: numberOr(next.sparks, 0) + numberOr(reward.sparks, 0),
      rankingPoints: numberOr(next.rankingPoints, 0) + numberOr(reward.rankingPoints, 0),
    }
    next = appendLedger(next, 'library-module', module.id, reward.d7t || 0, `Módulo concluído: ${module.title}`)
    next = {
      ...next,
      libraryProgress: {
        ...(next.libraryProgress ?? {}),
        completedModuleIds: unique([...(next.libraryProgress?.completedModuleIds ?? []), module.id]),
        lastModuleId: module.id,
        currentTitle: getLibraryTitle({ ...next, libraryProgress: { ...(next.libraryProgress ?? {}), completedModuleIds: unique([...(next.libraryProgress?.completedModuleIds ?? []), module.id]) } }),
      },
      lastUnlocks: unique([`Módulo concluído: ${module.title}`, ...(next.lastUnlocks ?? [])]).slice(0, 5),
    }
    moduleRewards.push(module.title)
  }

  const completedPhases = Object.values(libraryPhasesById).filter((phase) => phase.requiredCards.every((id) => next.studiedCards.includes(id)))
  for (const phase of completedPhases) {
    const completedIds = next.libraryProgress?.completedPhaseIds ?? []
    if (completedIds.includes(phase.id)) continue
    const reward = getLibraryPhaseReward(phase)
    next = {
      ...next,
      xp: numberOr(next.xp, 0) + numberOr(reward.xp, 0),
      sparks: numberOr(next.sparks, 0) + numberOr(reward.sparks, 0),
      rankingPoints: numberOr(next.rankingPoints, 0) + numberOr(reward.rankingPoints, 0),
    }
    next = appendLedger(next, 'library-phase', phase.id, reward.d7t || 0, `Fase concluída: ${phase.title} ${phase.subtitle}`)
    next = {
      ...next,
      libraryProgress: {
        ...(next.libraryProgress ?? {}),
        completedPhaseIds: unique([...(next.libraryProgress?.completedPhaseIds ?? []), phase.id]),
        lastPhaseId: phase.id,
        currentTitle: getLibraryTitle({ ...next, libraryProgress: { ...(next.libraryProgress ?? {}), completedPhaseIds: unique([...(next.libraryProgress?.completedPhaseIds ?? []), phase.id]) } }),
      },
      lastUnlocks: unique([`Fase concluída: ${phase.title}`, ...(next.lastUnlocks ?? [])]).slice(0, 5),
    }
  }

  const finalTitle = getLibraryTitle(next)
  next = {
    ...next,
    libraryProgress: {
      ...(next.libraryProgress ?? {}),
      currentTitle: finalTitle,
    },
  }

  return {
    ok: true,
    progress: next,
    message: alreadyStudied
      ? `Revisão registrada de ${card.title}. Recompensa principal não foi repetida.`
      : `Card estudado: ${card.title}.`,
    lastUnlocks,
    card,
    repeated: alreadyStudied,
    moduleRewards,
  }
}

export function getLibrarySummary(progress) {
  const stats = getLibraryStudyStats(progress)
  const recommended = getRecommendedLibraryCard(progress)
  return {
    ...stats,
    recommended,
    modules: initiationModules,
    glossary: [],
  }
}

export { libraryCardsById }
