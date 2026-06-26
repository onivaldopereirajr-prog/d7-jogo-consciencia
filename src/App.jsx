import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'd7-jogo-consciencia-state-v1'

const weeks = [
  { id: 'A', name: 'Alvorecer', minutes: 1, intent: 'Entrar no silêncio sem negociar com a mente.' },
  { id: 'B', name: 'Brasa', minutes: 2, intent: 'Sustentar presença quando o ruído pede comando.' },
  { id: 'C', name: 'Câmara', minutes: 3, intent: 'Observar o vazio como campo, não como falta.' },
  { id: 'D', name: 'Domínio', minutes: 4, intent: 'Permanecer inteiro no Nada.' },
]

const navItems = [
  { id: 'home', label: 'Home', icon: '◇' },
  { id: 'jornada', label: 'Jornada', icon: '◆' },
  { id: 'pratica', label: 'Prática', icon: '◉' },
  { id: 'codice', label: 'Códice', icon: '✦' },
  { id: 'ranking', label: 'Ranking', icon: '▲' },
  { id: 'perfil', label: 'Perfil', icon: '☉' },
  { id: 'circulos', label: 'Círculos', icon: '◎' },
]

const cards = [
  { id: 'nada', name: 'Nada', tier: 'Inicial', text: 'A primeira carta: presença sem gesto, sem palavra, sem fuga.' },
  { id: 'centelha', name: 'Centelha Interna', tier: 'A', text: 'Um pulso breve de lucidez atravessa o campo mental.' },
  { id: 'limiar', name: 'Limiar A7', tier: 'A', text: 'A porta da primeira semana reconhece sua constância.' },
  { id: 'brasa', name: 'Brasa Silenciosa', tier: 'B', text: 'Dois minutos criam temperatura para a disciplina.' },
  { id: 'camara', name: 'Câmara Vazia', tier: 'C', text: 'O vazio deixa de ser ausência e vira arquitetura.' },
  { id: 'd7', name: 'Selo D7', tier: 'D', text: 'Quatro semanas fecham o circuito inicial do jogo.' },
]

const medalCatalog = [
  { id: 'primeiro_nada', name: 'Primeiro Nada', rule: 'Conclua sua primeira prática.' },
  { id: 'sete_chamas', name: 'Sete Chamas', rule: 'Complete 7 práticas no total.' },
  { id: 'guardiao_a', name: 'Guardião A', rule: 'Atravesse a semana A.' },
  { id: 'sem_quebra', name: 'Fio Contínuo', rule: 'Mantenha 3 dias de sequência.' },
  { id: 'd7_iniciado', name: 'Iniciado D7', rule: 'Chegue ao ciclo D7.' },
]

const mockPlayers = [
  { name: 'Maya Voss', title: 'Oráculo Urbano', xp: 910, sparks: 71 },
  { name: 'Caio Nox', title: 'Sentinela', xp: 760, sparks: 64 },
  { name: 'Lia Kairós', title: 'Cartógrafa', xp: 620, sparks: 58 },
  { name: 'Ivo Rune', title: 'Discípulo', xp: 410, sparks: 35 },
  { name: 'Nara Void', title: 'Observadora', xp: 290, sparks: 22 },
]

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function daysBetween(start, end) {
  const a = new Date(`${start}T00:00:00`)
  const b = new Date(`${end}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

function makeInitialState() {
  return {
    profile: { name: 'Jogador D7', title: 'Iniciado do Nada', avatar: 'D7' },
    progress: { weekIndex: 0, day: 1, streak: 0, lastPracticeDate: null, completedDays: [] },
    xp: 0,
    sparks: 0,
    unlockedCards: ['nada'],
    medals: [],
    codex: [
      { id: 'origem', title: 'Entrada 0: O Nada', text: 'Nada é o primeiro modo porque corta excesso. O jogador vence quando permanece.', date: 'Registro inicial' },
    ],
    sessions: [],
    circles: [
      { id: 'aurora', name: 'Círculo Aurora', members: 7, pulse: 'Aberto', focus: 'Semana A' },
      { id: 'nucleo', name: 'Núcleo Brasa', members: 4, pulse: 'Privado', focus: 'Prática diária' },
    ],
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return makeInitialState()
    return { ...makeInitialState(), ...JSON.parse(saved) }
  } catch {
    return makeInitialState()
  }
}

function getStage(progress) {
  return weeks[progress.weekIndex] ?? weeks[0]
}

function getJourneyCode(progress) {
  return `${getStage(progress).id}${progress.day}`
}

function evaluateMissedDay(state) {
  const today = todayKey()
  const last = state.progress.lastPracticeDate
  if (!last || last === today || daysBetween(last, today) <= 1) return state

  return {
    ...state,
    progress: {
      ...state.progress,
      weekIndex: 0,
      day: 1,
      streak: 0,
      lastPracticeDate: null,
      completedDays: [],
    },
    codex: [
      {
        id: `reinicio-${Date.now()}`,
        title: 'Reinício ritual',
        text: 'Uma ausência quebrou a sequência. A jornada retorna para A1 sem punição extra.',
        date: new Date().toLocaleDateString('pt-BR'),
      },
      ...state.codex,
    ],
  }
}

function advanceProgress(progress) {
  if (progress.day < 7) return { ...progress, day: progress.day + 1 }
  if (progress.weekIndex < weeks.length - 1) return { ...progress, weekIndex: progress.weekIndex + 1, day: 1 }
  return { ...progress, weekIndex: weeks.length - 1, day: 7 }
}

function unique(items) {
  return [...new Set(items)]
}

function rewardState(state) {
  const currentCode = getJourneyCode(state.progress)
  const totalSessions = state.sessions.length + 1
  const newStreak = (state.progress.lastPracticeDate === todayKey() ? state.progress.streak : state.progress.streak + 1)
  const baseXp = 40 + getStage(state.progress).minutes * 15
  const baseSparks = 3 + getStage(state.progress).minutes
  const completedDays = unique([...state.progress.completedDays, currentCode])
  const nextProgress = advanceProgress({
    ...state.progress,
    streak: newStreak,
    lastPracticeDate: todayKey(),
    completedDays,
  })

  const unlockedCards = unique([
    ...state.unlockedCards,
    totalSessions >= 1 ? 'centelha' : null,
    completedDays.includes('A7') ? 'limiar' : null,
    completedDays.some((day) => day.startsWith('B')) ? 'brasa' : null,
    completedDays.some((day) => day.startsWith('C')) ? 'camara' : null,
    completedDays.includes('D7') ? 'd7' : null,
  ].filter(Boolean))

  const medals = unique([
    ...state.medals,
    totalSessions >= 1 ? 'primeiro_nada' : null,
    totalSessions >= 7 ? 'sete_chamas' : null,
    completedDays.includes('A7') ? 'guardiao_a' : null,
    newStreak >= 3 ? 'sem_quebra' : null,
    completedDays.includes('D7') ? 'd7_iniciado' : null,
  ].filter(Boolean))

  return {
    ...state,
    xp: state.xp + baseXp,
    sparks: state.sparks + baseSparks,
    unlockedCards,
    medals,
    progress: nextProgress,
    sessions: [
      {
        id: `sessao-${Date.now()}`,
        mode: 'Nada',
        code: currentCode,
        minutes: getStage(state.progress).minutes,
        xp: baseXp,
        sparks: baseSparks,
        date: todayKey(),
      },
      ...state.sessions,
    ],
    codex: [
      {
        id: `codice-${Date.now()}`,
        title: `${currentCode}: prática Nada concluída`,
        text: `Você permaneceu por ${getStage(state.progress).minutes} minuto(s). XP +${baseXp}, Centelhas +${baseSparks}.`,
        date: new Date().toLocaleDateString('pt-BR'),
      },
      ...state.codex,
    ],
  }
}

function StatCard({ label, value, detail }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function SectionTitle({ eyebrow, title, children }) {
  return (
    <div className="section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  )
}

function App() {
  const [activeView, setActiveView] = useState('home')
  const [state, setState] = useState(() => evaluateMissedDay(loadState()))
  const [remaining, setRemaining] = useState(() => getStage(state.progress).minutes * 60)
  const [timerStatus, setTimerStatus] = useState('idle')

  const stage = getStage(state.progress)
  const journeyCode = getJourneyCode(state.progress)
  const totalSeconds = stage.minutes * 60
  const progressPercent = Math.round(((totalSeconds - remaining) / totalSeconds) * 100)
  const unlockedCardList = cards.filter((card) => state.unlockedCards.includes(card.id))
  const medalList = medalCatalog.filter((medal) => state.medals.includes(medal.id))
  const rank = useMemo(() => [...mockPlayers, { name: state.profile.name, title: state.profile.title, xp: state.xp, sparks: state.sparks, current: true }].sort((a, b) => b.xp - a.xp), [state.profile.name, state.profile.title, state.xp, state.sparks])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    setRemaining(totalSeconds)
    setTimerStatus('idle')
  }, [totalSeconds, journeyCode])

  useEffect(() => {
    if (timerStatus !== 'running') return undefined
    const interval = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(interval)
          setTimerStatus('complete')
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timerStatus])

  function completePractice() {
    setState((current) => rewardState(evaluateMissedDay(current)))
    setTimerStatus('idle')
    setActiveView('jornada')
  }

  function resetLocalJourney() {
    setState(makeInitialState())
    setTimerStatus('idle')
    setRemaining(60)
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
    const rest = (seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${rest}`
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-mark">
          <span>D7</span>
          <div>
            <strong>Jogo da Consciência</strong>
            <small>MVP local</small>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item.id} className={activeView === item.id ? 'active' : ''} type="button" onClick={() => setActiveView(item.id)}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="overline">Ciclo atual</span>
            <h1>{journeyCode} · Modo Nada</h1>
          </div>
          <div className="resource-strip" aria-label="Recursos do jogador">
            <span>{state.xp} XP</span>
            <span>{state.sparks} Centelhas</span>
            <span>{state.progress.streak} dias</span>
          </div>
        </header>

        {activeView === 'home' && (
          <section className="view-grid home-grid">
            <div className="hero-panel">
              <div className="sigil" aria-hidden="true"><span>D7</span></div>
              <span className="overline">Ritual tecnológico de presença</span>
              <h2>Permaneça no Nada. Avance pela jornada. Grave consciência no Códice.</h2>
              <p>Quatro semanas, sete dias por semana, um timer simples e uma regra central: constância. Se perder um dia, o ciclo recomeça em A1.</p>
              <div className="hero-actions">
                <button type="button" className="primary-action" onClick={() => setActiveView('pratica')}>Iniciar prática</button>
                <button type="button" className="ghost-action" onClick={() => setActiveView('jornada')}>Ver jornada</button>
              </div>
            </div>
            <div className="stacked-stats">
              <StatCard label="Próxima prática" value={`${stage.minutes} min`} detail={`${stage.name} · ${journeyCode}`} />
              <StatCard label="Cartas" value={unlockedCardList.length} detail={`${cards.length} no baralho inicial`} />
              <StatCard label="Medalhas" value={medalList.length} detail="conquistas locais" />
            </div>
          </section>
        )}

        {activeView === 'jornada' && (
          <section className="content-section">
            <SectionTitle eyebrow="Mapa A1-D7" title="Jornada de 28 dias">Cada célula representa uma prática. A duração sobe a cada semana e a sequência diária sustenta o avanço.</SectionTitle>
            <div className="journey-board">
              {weeks.map((week, weekIndex) => (
                <article key={week.id} className="week-card">
                  <div className="week-head">
                    <span>Semana {week.id}</span>
                    <strong>{week.minutes} min</strong>
                  </div>
                  <h3>{week.name}</h3>
                  <p>{week.intent}</p>
                  <div className="day-grid">
                    {Array.from({ length: 7 }, (_, index) => {
                      const day = index + 1
                      const code = `${week.id}${day}`
                      const isCurrent = weekIndex === state.progress.weekIndex && day === state.progress.day
                      const isDone = state.progress.completedDays.includes(code)
                      return <span key={code} className={`${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}>{code}</span>
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'pratica' && (
          <section className="practice-layout">
            <div className="timer-panel">
              <SectionTitle eyebrow={`${journeyCode} · Semana ${stage.id}`} title="Modo Nada">Silêncio, tela presente, respiração livre. Termine o ciclo para registrar a prática.</SectionTitle>
              <div className="timer-orb" style={{ '--progress': `${progressPercent}%` }}>
                <span>{formatTime(remaining)}</span>
                <small>{timerStatus === 'running' ? 'em prática' : timerStatus === 'complete' ? 'ciclo completo' : 'aguardando'}</small>
              </div>
              <div className="timer-controls">
                <button type="button" className="primary-action" onClick={() => setTimerStatus('running')} disabled={timerStatus === 'running' || remaining === 0}>Iniciar</button>
                <button type="button" className="ghost-action" onClick={() => setTimerStatus('paused')} disabled={timerStatus !== 'running'}>Pausar</button>
                <button type="button" className="ghost-action" onClick={() => { setRemaining(totalSeconds); setTimerStatus('idle') }}>Reiniciar</button>
                <button type="button" className="complete-action" onClick={completePractice} disabled={remaining > 0}>Concluir</button>
              </div>
            </div>
            <aside className="ritual-panel">
              <h3>Protocolo Nada</h3>
              <p>Não buscar visão. Não corrigir pensamento. Não performar calma. Apenas notar e permanecer.</p>
              <div className="reward-preview">
                <span>Recompensa</span>
                <strong>+{40 + stage.minutes * 15} XP</strong>
                <strong>+{3 + stage.minutes} Centelhas</strong>
              </div>
            </aside>
          </section>
        )}

        {activeView === 'codice' && (
          <section className="content-section">
            <SectionTitle eyebrow="Memória do jogador" title="Códice">Registros locais das práticas, reinícios e desbloqueios do seu ciclo.</SectionTitle>
            <div className="codex-list">
              {state.codex.map((entry) => (
                <article key={entry.id} className="codex-entry">
                  <span>{entry.date}</span>
                  <h3>{entry.title}</h3>
                  <p>{entry.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'ranking' && (
          <section className="content-section">
            <SectionTitle eyebrow="Ranking local" title="Ordem de presença">Lista mockada salva apenas no navegador, com seu perfil misturado aos jogadores fictícios.</SectionTitle>
            <div className="ranking-list">
              {rank.map((player, index) => (
                <article key={player.name} className={player.current ? 'rank-row current-player' : 'rank-row'}>
                  <strong>#{index + 1}</strong>
                  <div><span>{player.name}</span><small>{player.title}</small></div>
                  <p>{player.xp} XP · {player.sparks} Centelhas</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'perfil' && (
          <section className="profile-grid">
            <div className="profile-card">
              <div className="avatar-ring">{state.profile.avatar}</div>
              <h2>{state.profile.name}</h2>
              <p>{state.profile.title}</p>
              <div className="profile-actions">
                <button type="button" className="ghost-action" onClick={resetLocalJourney}>Resetar MVP local</button>
              </div>
            </div>
            <div className="inventory-card">
              <SectionTitle eyebrow="Inventário" title="Cartas e medalhas" />
              <div className="card-grid">
                {cards.map((card) => (
                  <article key={card.id} className={state.unlockedCards.includes(card.id) ? 'game-card unlocked' : 'game-card locked'}>
                    <span>{card.tier}</span>
                    <h3>{card.name}</h3>
                    <p>{state.unlockedCards.includes(card.id) ? card.text : 'Bloqueada'}</p>
                  </article>
                ))}
              </div>
              <div className="medal-grid">
                {medalCatalog.map((medal) => (
                  <span key={medal.id} className={state.medals.includes(medal.id) ? 'medal owned' : 'medal'}>{medal.name}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeView === 'circulos' && (
          <section className="content-section">
            <SectionTitle eyebrow="Social local" title="Círculos">Protótipo sem backend para representar grupos, convites e foco de prática.</SectionTitle>
            <div className="circle-grid">
              {state.circles.map((circle) => (
                <article key={circle.id} className="circle-card">
                  <span>{circle.pulse}</span>
                  <h3>{circle.name}</h3>
                  <p>{circle.members} membros · foco em {circle.focus}</p>
                  <button type="button" className="ghost-action">Ver círculo</button>
                </article>
              ))}
              <article className="circle-card invite-card">
                <span>Em breve</span>
                <h3>Novo círculo</h3>
                <p>Criação local visual para preparar a experiência social futura.</p>
                <button type="button" className="ghost-action">Preparar convite</button>
              </article>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
