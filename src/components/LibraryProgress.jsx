function Stat({ label, value, detail }) {
  return (
    <article className="library-progress__stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  )
}

export default function LibraryProgress({ stats, onStudyRecommended, recommendedTitle }) {
  return (
    <aside className="library-progress" aria-label="Resumo da Biblioteca Iniciática">
      <div className="library-progress__head">
        <span className="overline">Progresso da biblioteca</span>
        <h3>{stats.title}</h3>
        <p>Conteúdo simbólico, educativo e gamificado. Não substitui estudo acadêmico, religioso ou linguístico formal.</p>
      </div>
      <div className="library-progress__grid">
        <Stat label="Cards estudados" value={stats.studiedCardsCount} detail={`${stats.unlockedStudyCount} disponíveis`} />
        <Stat label="Módulos concluídos" value={stats.completedModulesCount} detail="camadas da biblioteca" />
        <Stat label="Fases concluídas" value={stats.completedPhasesCount} detail="trilha do estudioso" />
        <Stat label="Título atual" value={stats.title} detail="desbloqueio narrativo" />
      </div>
      <div className="library-progress__recommendation">
        <span>Próximo estudo recomendado</span>
        <strong>{recommendedTitle}</strong>
        <button type="button" className="ghost-action" onClick={onStudyRecommended} disabled={!onStudyRecommended}>Estudar agora</button>
      </div>
    </aside>
  )
}
