import { useState } from 'react'
import { buildSymbolicMap } from '../services/d7MapEngine.js'

const codexMapCards = [
  { id: 'map-name', title: 'Mapa do Nome', detail: 'ponte entre nome, letras e sons' },
  { id: 'map-gematria', title: 'Gematria Simbólica', detail: 'soma lúdica das letras hebraicas aproximadas' },
  { id: 'map-sanskrit', title: 'Som Sânscrito', detail: 'fonética simbólica inspirada em Devanagari' },
  { id: 'map-core', title: 'Núcleo D7', detail: 'redução matemática narrativa de 1 a 7' },
  { id: 'map-sefirah', title: 'Sefirá D7', detail: 'arquétipo simbólico inspirado em sefirot' },
  { id: 'map-archetype', title: 'Arquétipo D7', detail: 'Chamado, Porta, Sopro, Verdade, Permanência, Retorno ou Ciclo' },
  { id: 'map-astral', title: 'Trilha dos Astros Simbólicos', detail: 'data e hora como ciclo narrativo, não mapa astral profissional' },
  { id: 'map-card', title: 'Carta do Mapa', detail: 'carta recomendada pela leitura lúdica' },
]

function MapMetric({ label, value }) {
  return <div className="map-metric"><span>{label}</span><strong>{value}</strong></div>
}

export default function D7SymbolicMap({ progress, onSaveMap }) {
  const [form, setForm] = useState({ name: progress.profile?.name ?? '', birthDate: '', birthTime: '', place: '', language: '' })
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState(null)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function calculate(event) {
    event.preventDefault()
    const built = buildSymbolicMap(form)
    if (!built.ok) {
      setMessage({ type: 'error', text: built.message })
      return
    }
    setResult(built.result)
    setMessage({ type: 'success', text: built.usedDefaultTime ? 'Mapa calculado usando 00:00 como horário simbólico.' : 'Mapa Simbólico D7 calculado.' })
  }

  function save() {
    if (!result) return
    const saved = onSaveMap(result)
    setMessage({ type: saved.rewarded ? 'success' : 'success', text: saved.message })
  }

  const completed = progress.symbolicMapProgress?.completedSteps ?? []
  const steps = [
    ['name', 'Inserir nome'],
    ['hebrew', 'Calcular trilha hebraica'],
    ['sanskrit', 'Calcular trilha sânscrita'],
    ['birth', 'Inserir data/hora'],
    ['core', 'Revelar Núcleo D7'],
    ['card', 'Receber carta'],
    ['challenge', 'Ver desafio'],
    ['seal', 'Abrir selo relacionado'],
  ]

  return (
    <section className="symbolic-map-panel" aria-labelledby="symbolic-map-title">
      <div className="map-intro">
        <span className="overline">Mapa Simbólico D7</span>
        <h3 id="symbolic-map-title">Nome, data, sons e ciclos narrativos</h3>
        <p>Experiência simbólica do jogo inspirada em gematria, letras hebraicas, sons sânscritos e ciclos D7. Não é previsão científica, mapa astral profissional, diagnóstico espiritual ou verdade absoluta.</p>
      </div>
      <form className="map-form" onSubmit={calculate}>
        <label htmlFor="map-name">Nome completo</label>
        <input id="map-name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Seu nome" />
        <label htmlFor="map-date">Data de nascimento</label>
        <input id="map-date" type="date" value={form.birthDate} onChange={(event) => update('birthDate', event.target.value)} />
        <label htmlFor="map-time">Horário de nascimento</label>
        <input id="map-time" type="time" value={form.birthTime} onChange={(event) => update('birthTime', event.target.value)} />
        <label htmlFor="map-place">Cidade/país simbólico</label>
        <input id="map-place" value={form.place} onChange={(event) => update('place', event.target.value)} placeholder="Opcional" />
        <label htmlFor="map-language">Idioma original do nome</label>
        <input id="map-language" value={form.language} onChange={(event) => update('language', event.target.value)} placeholder="Opcional" />
        <button type="submit" className="primary-action">Calcular Mapa Simbólico D7</button>
      </form>
      {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}

      <div className="map-card-grid">
        {codexMapCards.map((card) => {
          const unlocked = Boolean(result) || completed.includes('core')
          return <article key={card.id} className={unlocked ? 'map-card unlocked' : 'map-card'}><span>{unlocked ? 'Aberto' : 'Selado'}</span><h4>{card.title}</h4><p>{unlocked ? card.detail : 'Requer: calcular e salvar um Mapa Simbólico D7.'}</p></article>
        })}
      </div>

      {result && (
        <div className="map-result">
          <div className="map-result-head">
            <div>
              <span className="overline">Resultado narrativo</span>
              <h3>{result.archetype.name} · Núcleo D7 {result.d7Core}</h3>
              <p>{result.disclaimer}</p>
            </div>
            <button type="button" className="complete-action" onClick={save}>Salvar no meu Códice</button>
          </div>
          <div className="map-metrics-grid">
            <MapMetric label="Nome original" value={result.input.name} />
            <MapMetric label="Hebraico simbólico" value={result.hebrew.hebrewApprox || '—'} />
            <MapMetric label="Sânscrito simbólico" value={result.sanskrit.devanagariApprox || '—'} />
            <MapMetric label="Gematria simbólica" value={result.hebrew.gematriaTotal} />
            <MapMetric label="Fonética D7" value={result.sanskrit.soundScore} />
            <MapMetric label="Data" value={result.birthDateScore} />
            <MapMetric label="Hora" value={result.birthTimeScore} />
            <MapMetric label="Eixo D7" value={result.d7Axis} />
            <MapMetric label="Portal D7" value={result.d7Gate} />
            <MapMetric label="Sefirá simbólica" value={result.sefirah.name} />
            <MapMetric label="Som dominante" value={result.dominantSound.roman} />
            <MapMetric label="Carta" value={result.recommendedCard} />
          </div>
          <article className="map-narrative">
            <h4>{result.sefirah.name}: {result.sefirah.keyword}</h4>
            <p>{result.narrative}</p>
            <p><strong>Desafio recomendado:</strong> {result.recommendedChallenge}</p>
            <p><strong>Selo recomendado:</strong> {result.recommendedSeal}</p>
            <p><strong>Recompensa sugerida:</strong> {result.suggestedReward}</p>
          </article>
        </div>
      )}

      <div className="map-steps">
        {steps.map(([id, label]) => <span key={id} className={completed.includes(id) ? 'done' : result ? 'available' : 'locked'}>{label}</span>)}
      </div>
    </section>
  )
}
