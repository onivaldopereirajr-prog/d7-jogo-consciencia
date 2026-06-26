import { useMemo, useState } from 'react'
import { initiationModules, libraryGlossary, libraryPhasesById, studyableLibraryCards } from '../data/initiationLibrary.js'
import { getLibraryCardStatus, getLibraryModuleStatus, getLibraryPhaseStatus, getLibraryStudyStats, getRecommendedLibraryCard } from '../services/libraryEngine.js'
import LibraryProgress from './LibraryProgress.jsx'
import StudyCard from './StudyCard.jsx'

const TRADITION_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'sânscrito', label: 'Sânscrito' },
  { id: 'hebraico', label: 'Hebraico' },
  { id: 'cabala', label: 'Cabala' },
  { id: 'ponte-d7', label: 'Ponte D7' },
]

function progressLabel(current, total) {
  return `${current}/${total}`
}

function requirementText(module) {
  const requirement = module.requirement ?? {}
  const parts = []
  if (requirement.practiceMinutes) parts.push(`${requirement.practiceMinutes} min de prática`)
  if (requirement.studyCount) parts.push(`${requirement.studyCount} estudos`)
  if (Array.isArray(requirement.cardIds) && requirement.cardIds.length) parts.push(`${requirement.cardIds.length} cards prévios`)
  if (Array.isArray(requirement.cards) && requirement.cards.length) parts.push(`${requirement.cards.length} cartas`)
  if (Array.isArray(requirement.seals) && requirement.seals.length) parts.push(`${requirement.seals.length} selos`)
  if (requirement.mapCreated) parts.push(`${requirement.mapCreated} mapa`)
  return parts.length ? parts.join(' · ') : 'Disponível como base da biblioteca.'
}

function formatModuleReward(module) {
  const reward = module.reward ?? {}
  return [`+${reward.xp ?? 0} XP`, `+${reward.sparks ?? 0} Centelhas`, `+${reward.d7t ?? 0} D7T`, `+${reward.rankingPoints ?? 0} ranking`].join(' · ')
}

function formatPhaseReward(phase) {
  const reward = phase.reward ?? {}
  return [`+${reward.xp ?? 0} XP`, `+${reward.sparks ?? 0} Centelhas`, `+${reward.d7t ?? 0} D7T`].join(' · ')
}

export default function InitiationLibrary({ progress, onStudyCard }) {
  const stats = getLibraryStudyStats(progress)
  const [selectedTradition, setSelectedTradition] = useState('all')
  const [selectedModuleId, setSelectedModuleId] = useState(() => stats.completedModules[0] ?? initiationModules[0]?.id ?? 'codex-introduction')
  const [glossaryQuery, setGlossaryQuery] = useState('')

  const recommended = getRecommendedLibraryCard(progress)
  const recommendedTitle = recommended ? `${recommended.title} · ${recommended.summary}` : 'Tudo que está disponível já foi estudado nesta camada.'

  const focusedModuleId = visibleModules.some((module) => module.id === selectedModuleId) ? selectedModuleId : (visibleModules[0]?.id ?? initiationModules[0]?.id ?? 'codex-introduction')
  const selectedModule = initiationModules.find((module) => module.id === focusedModuleId) ?? initiationModules[0]
  const selectedModuleStatus = selectedModule ? getLibraryModuleStatus(progress, selectedModule.id) : null
  const selectedPhase = selectedModule?.phaseId ? libraryPhasesById[selectedModule.phaseId] : null
  const selectedPhaseStatus = selectedPhase ? getLibraryPhaseStatus(progress, selectedPhase.id) : null

  const visibleModules = useMemo(() => {
    return initiationModules.filter((module) => selectedTradition === 'all' || module.tradition === selectedTradition)
  }, [selectedTradition])

  const visibleCards = useMemo(() => {
    return studyableLibraryCards.filter((card) => selectedTradition === 'all' || card.tradition === selectedTradition)
  }, [selectedTradition])

  const visibleGlossary = useMemo(() => {
    const query = glossaryQuery.trim().toLowerCase()
    if (!query) return libraryGlossary
    return libraryGlossary.filter((entry) => `${entry.term} ${entry.definition}`.toLowerCase().includes(query))
  }, [glossaryQuery])

  function handleStudyRecommended() {
    if (!recommended) return
    onStudyCard(recommended.id)
  }

  return (
    <section className="library-shell content-section" aria-labelledby="library-title">
      <div className="library-hero">
        <div className="library-hero__copy">
          <span className="overline">Biblioteca Iniciática D7</span>
          <h2 id="library-title">Estudo simbólico, missão gamificada e memória de presença</h2>
          <p>Resumos originais, missões curtas e pontes entre sânscrito, Cabala, sefirot, letras hebraicas e o universo do D7. O conteúdo é introdutório, educativo e narrativo.</p>
          <div className="library-hero__actions">
            <button type="button" className="primary-action" onClick={handleStudyRecommended} disabled={!recommended}>Estudar agora</button>
            <span className="library-hero__note">Cada símbolo estudado abre uma camada da jornada.</span>
          </div>
        </div>
        <LibraryProgress stats={stats} onStudyRecommended={recommended ? handleStudyRecommended : null} recommendedTitle={recommendedTitle} />
      </div>

      <div className="library-phases">
        {Object.values(libraryPhasesById).map((phase) => {
          const completed = selectedModule?.phaseId === phase.id ? selectedPhaseStatus?.completed : stats.completedPhases.includes(phase.id)
          return (
            <article key={phase.id} className={completed ? 'library-phase-card completed' : 'library-phase-card'}>
              <span>{phase.title}</span>
              <strong>{phase.subtitle}</strong>
              <p>{phase.summary}</p>
              <small>{progressLabel(phase.requiredCards.filter((id) => progress.studiedCards?.includes(id)).length, phase.requiredCards.length)} · {formatPhaseReward(phase)}</small>
            </article>
          )
        })}
      </div>

      <div className="library-filters">
        <div className="library-filter-group" role="tablist" aria-label="Filtrar tradição">
          {TRADITION_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={selectedTradition === filter.id ? 'filter-chip active' : 'filter-chip'}
              aria-pressed={selectedTradition === filter.id}
              onClick={() => setSelectedTradition(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="library-search">
          <span>Buscar no glossário</span>
          <input value={glossaryQuery} onChange={(event) => setGlossaryQuery(event.target.value)} placeholder="Cabala, mantra, sefirot..." />
        </label>
      </div>

      <div className="library-layout">
        <aside className="library-focus-panel">
          {selectedModule && (
            <StudyCard
              badge={selectedModule.tradition}
              title={selectedModule.title}
              subtitle={selectedModule.subtitle}
              summary={selectedModule.summary}
              symbol={selectedModuleStatus?.completed ? '✓' : selectedModuleStatus?.unlocked ? '◉' : '✧'}
              status={selectedModuleStatus?.status ?? 'locked'}
              meta={`${progressLabel(selectedModuleStatus?.progress ?? 0, selectedModuleStatus?.total ?? selectedModule.cardIds.length)} · ${selectedModule.level}`}
              reward={selectedModule.reward}
              challenge={selectedModule.mission}
              note={selectedModule.ethicalNote}
              actionLabel={selectedModuleStatus?.completed ? 'Módulo concluído' : selectedModuleStatus?.unlocked ? 'Ver cards' : 'Bloqueado'}
              onAction={selectedModuleStatus?.unlocked ? () => setSelectedModuleId(selectedModule.id) : null}
              disabled={!selectedModuleStatus?.unlocked}
            >
              <div className="study-card__inline-metrics">
                <span>{requirementText(selectedModule)}</span>
                <span>{formatModuleReward(selectedModule)}</span>
                <span>{selectedModuleStatus?.completed ? 'Camada aberta' : selectedModuleStatus?.unlocked ? 'Disponível' : 'Bloqueada'}</span>
              </div>
            </StudyCard>
          )}
          {selectedPhase && selectedPhaseStatus && (
            <StudyCard
              badge="Trilha"
              title={selectedPhase.title}
              subtitle={selectedPhase.subtitle}
              summary={selectedPhase.summary}
              symbol={selectedPhaseStatus.completed ? '✓' : '⟡'}
              status={selectedPhaseStatus.status}
              meta={`${progressLabel(selectedPhaseStatus.progress, selectedPhaseStatus.total)} · ${selectedPhase.titleReward}`}
              reward={selectedPhase.reward}
              note="A fase sintetiza a travessia do jogador dentro da biblioteca e do códice."
              actionLabel={selectedPhaseStatus.completed ? 'Fase concluída' : selectedPhaseStatus.status === 'locked' ? 'Bloqueada' : 'Continuar estudo'}
              onAction={selectedPhaseStatus.status === 'locked' ? null : () => setSelectedModuleId(selectedModule.id)}
              disabled={selectedPhaseStatus.status === 'locked' || selectedPhaseStatus.completed}
            />
          )}
        </aside>

        <div className="library-module-grid">
          {visibleModules.map((module) => {
            const moduleStatus = getLibraryModuleStatus(progress, module.id)
            const selected = module.id === selectedModuleId
            return (
              <StudyCard
                key={module.id}
                badge={module.tradition}
                title={module.title}
                subtitle={module.subtitle}
                summary={module.summary}
                symbol={moduleStatus.completed ? '✓' : moduleStatus.unlocked ? '◉' : '✧'}
                status={moduleStatus.status}
                meta={`${progressLabel(moduleStatus.progress, moduleStatus.total)} · ${module.level}`}
                reward={module.reward}
                challenge={module.mission}
                note={module.ethicalNote}
                actionLabel={selected ? 'Selecionado' : moduleStatus.unlocked ? 'Abrir módulo' : 'Bloqueado'}
                onAction={moduleStatus.unlocked ? () => setSelectedModuleId(module.id) : null}
                disabled={!moduleStatus.unlocked || selected}
              />
            )
          })}
        </div>
      </div>

      <section className="library-cards-panel" aria-labelledby="library-cards-title">
        <div className="library-section-head">
          <div>
            <span className="overline">Cartas da biblioteca</span>
            <h3 id="library-cards-title">Camadas desbloqueadas e seladas</h3>
            <p>O estado mostra o que já pode ser estudado e o que ainda depende de prática, selos, mapa ou sequência.</p>
          </div>
          <small>{visibleCards.length} cards na tradição filtrada</small>
        </div>
        <div className="library-card-grid">
          {visibleCards.map((card) => {
            const status = getLibraryCardStatus(progress, card.id)
            const unlocked = status !== 'locked'
            const studied = status === 'studied'
            return (
              <StudyCard
                key={card.id}
                badge={card.tradition}
                title={card.title}
                subtitle={card.transliteration}
                summary={card.summary}
                symbol={unlocked ? card.symbol : '✧'}
                status={status}
                meta={`${card.kind ?? 'Carta'} · ${card.level}`}
                reward={card.reward}
                challenge={card.challengePrompt}
                note={card.ethicalNote}
                actionLabel={studied ? 'Revisar carta' : unlocked ? 'Estudar carta' : 'Bloqueado'}
                onAction={unlocked ? () => onStudyCard(card.id) : null}
                disabled={!unlocked}
              >
                <div className="study-card__inline-metrics">
                  <span>{card.gameUse}</span>
                  {card.linkedSeal && <span>Selo: {card.linkedSeal}</span>}
                  {card.linkedCard && <span>Carta: {card.linkedCard}</span>}
                </div>
              </StudyCard>
            )
          })}
        </div>
      </section>

      <section className="library-glossary" aria-labelledby="glossary-title">
        <div className="library-section-head">
          <div>
            <span className="overline">Glossário</span>
            <h3 id="glossary-title">Termos e definições curtas</h3>
          </div>
          <small>{visibleGlossary.length} termos</small>
        </div>
        <div className="glossary-grid">
          {visibleGlossary.map((entry) => (
            <article key={entry.id} className="glossary-card">
              <h4>{entry.term}</h4>
              <p>{entry.definition}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
