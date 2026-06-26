import { useEffect, useMemo, useState } from 'react'
import { codexCards, dualBridges, hebrewLetters, hebrewWords, sanskritItems } from './data/codex.js'
import { codes, dayPhrases, missions, mockPlayers, navItems, portals, weeks } from './data/game.js'
import {
  cardById,
  completePractice,
  ensureToday,
  getJourneyCode,
  getStage,
  loadState,
  missionStatus,
  openPortal,
  playerLevel,
  recordVisit,
  recordWord,
  resetStoredState,
  saveState,
  scoreOf,
  studyCard,
} from './utils/gameState.js'
import './App.css'

const visualAssets = {
  hero: '/images/d7/heroes/hero-codice-dual.svg',
  practice: '/images/d7/fundos/fundo-pratica-nada.svg',
  codex: '/images/d7/codice/codice-dual-d7.svg',
  sealD7: '/images/d7/simbolos/selo-d7.svg',
  ranking: '/images/d7/simbolos/selo-ranking.svg',
  cycle: '/images/d7/simbolos/selo-ciclo-completo.svg',
}

const portalArtById = {
  'portal-a': '/images/d7/portais/portal-a-chamado.svg',
  'portal-b': '/images/d7/portais/portal-b-permanencia.svg',
  'portal-c': '/images/d7/portais/portal-c-observacao.svg',
  'portal-d': '/images/d7/portais/portal-d-ciclo-completo.svg',
}

const codexFeaturedCards = [
  { id: 'card-alef', title: 'Alef', image: '/images/d7/cartas/carta-alef.svg' },
  { id: 'card-om', title: 'Om', image: '/images/d7/cartas/carta-om.svg' },
  { id: 'card-ruach-prana', title: 'Ruach Prana', image: '/images/d7/cartas/carta-ruach-prana.svg' },
  { id: 'card-emet-dhyana', title: 'Emet Dhyana', image: '/images/d7/cartas/carta-emet-dhyana.svg' },
]

function Sigil({ label = 'D7', tone = 'cyan' }) {
  return (
    <div className={`sigil-mark ${tone}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" role="presentation">
        <circle cx="50" cy="50" r="42" />
        <path d="M50 8 L82 50 L50 92 L18 50 Z" />
        <path d="M22 50 H78 M50 22 V78" />
      </svg>
      <span>{label}</span>
    </div>
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

function StatCard({ label, value, detail }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function ProgressLine({ value, max, label = 'Progresso' }) {
  const width = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <span className="progress-line" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax={max} aria-valuenow={value}>
      <i style={{ width: `${width}%` }} aria-hidden="true" />
    </span>
  )
}

function SymbolCard({ card, unlocked, studied, onStudy }) {
  return (
    <article className={`symbol-card ${unlocked ? 'unlocked' : 'locked'}`}>
      <div className="symbol-top">
        <span>{card.kind}</span>
        <strong>{card.value ? card.value : card.track}</strong>
      </div>
      <div className="glyph">{unlocked ? card.symbol : '✧'}</div>
      <h3>{unlocked ? card.transliteration : 'Carta selada'}</h3>
      <p>{unlocked ? `${card.meaning}. ${card.explanation}` : 'Desbloqueie pela prática, missões e portais.'}</p>
      {unlocked && <small>Uso no jogo: {card.gameUse}</small>}
      {unlocked && <button type="button" className="mini-action" onClick={() => onStudy(card.id)}>{studied ? 'Revisar carta' : 'Estudar carta'}</button>}
    </article>
  )
}

function CodeCard({ code, unlocked }) {
  return (
    <article className={`code-card ${unlocked ? 'unlocked' : ''}`}>
      <div className="code-glyph">{unlocked ? code.glyph : '•••'}</div>
      <div>
        <h3>{code.name}</h3>
        <p>{unlocked ? 'Chave ativa na Sala dos Códigos.' : code.unlock}</p>
      </div>
    </article>
  )
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}

function ClosingMantra() {
  return (
    <footer className="closing-mantra" aria-label="Epígrafe final do D7">
      <p>Indu declara a Kyara</p>
      <p>Além do Véu da Madrugada</p>
      <p>A Luz permanece acesa.</p>
      <p>Além do nome e da distância.</p>
      <p>As almas recordam a sua origem.</p>
    </footer>
  )
}

function App() {
  const [activeView, setActiveView] = useState('home')
  const [state, setState] = useState(() => ensureToday(loadState()))
  const [timer, setTimer] = useState(() => {
    const loaded = ensureToday(loadState())
    const loadedStage = getStage(loaded.progress)
    return { journeyCode: getJourneyCode(loaded.progress), remaining: loadedStage.minutes * 60, status: 'idle' }
  })
  const [word, setWord] = useState('')

  const stage = getStage(state.progress)
  const journeyCode = getJourneyCode(state.progress)
  const totalSeconds = stage.minutes * 60
  const timerSynced = timer.journeyCode === journeyCode
  const remaining = timerSynced ? Math.min(timer.remaining, totalSeconds) : totalSeconds
  const timerStatus = timerSynced ? timer.status : 'idle'
  const timerProgress = Math.round(((totalSeconds - remaining) / totalSeconds) * 100)
  const hebrewUnlocked = state.unlockedCards.filter((id) => cardById(id)?.track === 'hebraica').length
  const sanskritUnlocked = state.unlockedCards.filter((id) => cardById(id)?.track === 'sânscrita').length
  const currentScore = scoreOf({ xp: state.xp, streak: state.progress.streak, cards: state.unlockedCards.length, portals: state.openedPortals.length, codes: state.unlockedCodes.length })
  const phrase = dayPhrases[(state.progress.day - 1) % dayPhrases.length]
  const rank = useMemo(() => {
    const player = {
      name: state.profile.name,
      title: state.profile.title,
      xp: state.xp,
      streak: state.progress.streak,
      cards: state.unlockedCards.length,
      portals: state.openedPortals.length,
      codes: state.unlockedCodes.length,
      current: true,
    }
    return [...mockPlayers, player].map((item) => ({ ...item, score: scoreOf(item) })).sort((a, b) => b.score - a.score)
  }, [state])

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (timerStatus !== 'running') return undefined
    const interval = setInterval(() => {
      setTimer((current) => {
        const activeTimer = current.journeyCode === journeyCode ? current : { journeyCode, remaining: totalSeconds, status: 'running' }
        if (activeTimer.remaining <= 1) return { ...activeTimer, remaining: 0, status: 'complete' }
        return { ...activeTimer, remaining: activeTimer.remaining - 1 }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [journeyCode, timerStatus, totalSeconds])

  function navigate(view) {
    setActiveView(view)
    setState((current) => recordVisit(current, view))
  }

  function finishPractice() {
    if (remaining > 0 || state.daily.practice) return
    setState((current) => recordVisit(completePractice(current), 'jornada'))
    setTimer({ journeyCode, remaining: totalSeconds, status: 'idle' })
    setActiveView('jornada')
  }

  function submitWord(event) {
    event.preventDefault()
    setState((current) => recordWord(current, word))
    setWord('')
  }

  function resetMvp() {
    resetStoredState()
    const fresh = ensureToday(loadState())
    setState(fresh)
    setActiveView('home')
    setTimer({ journeyCode: getJourneyCode(fresh.progress), remaining: getStage(fresh.progress).minutes * 60, status: 'idle' })
  }

  function study(cardId) {
    setState((current) => studyCard(current, cardId))
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-mark">
          <Sigil label="D7" />
          <div>
            <strong>Jogo da Consciência</strong>
            <small>Códice Dual V2</small>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item.id} className={activeView === item.id ? 'active' : ''} type="button" aria-current={activeView === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
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
            <h1>{journeyCode} · {stage.name}</h1>
          </div>
          <div className="resource-strip" aria-label="Recursos do jogador">
            <span>Nv. {playerLevel(state.xp)}</span>
            <span>{state.xp} XP</span>
            <span>{state.sparks} Centelhas</span>
            <span>{currentScore} Score</span>
          </div>
        </header>

        {activeView === 'home' && (
          <section className="home-layout">
            <div className="hero-panel">
              <img className="hero-art" src={visualAssets.hero} alt="Portal visual do Códice Dual D7" />
              <div className="hero-sigils">
                <Sigil label="א" tone="gold" />
                <Sigil label="ॐ" tone="violet" />
              </div>
              <span className="overline">Códice Dual D7</span>
              <h2>Uma jornada gamer de foco, presença e símbolos vivos.</h2>
              <p>O Códice Dual é uma criação simbólica do jogo: hebraico funciona como trilha de letras, números e códigos; sânscrito funciona como trilha de sons, mantras e estados. Não é uma afirmação histórica, é uma arquitetura lúdica de contemplação.</p>
              <div className="hero-actions">
                <button type="button" className="primary-action" onClick={() => navigate('pratica')}>Entrar no Nada</button>
                <button type="button" className="ghost-action" onClick={() => navigate('codice')}>Abrir Códice</button>
              </div>
            </div>
            <div className="dashboard-stack">
              <StatCard label="Meta atual" value={`${stage.minutes} min`} detail={`${journeyCode} · ${phrase}`} />
              <StatCard label="Trilha Hebraica" value={`${hebrewUnlocked}/${hebrewLetters.length + hebrewWords.length}`} detail="letras e palavras" />
              <StatCard label="Trilha Sânscrita" value={`${sanskritUnlocked}/${sanskritItems.length}`} detail="sons, mantras e estados" />
              <div className="mission-panel compact-panel home-seal-panel">
                <div className="seal-pair" aria-hidden="true">
                  <img src={visualAssets.sealD7} alt="" />
                  <img src={visualAssets.cycle} alt="" />
                </div>
                <h3>Missões diárias</h3>
                {missions.daily.map((mission) => <MissionRow key={mission.id} mission={mission} done={missionStatus(state, mission)} />)}
              </div>
            </div>
          </section>
        )}

        {activeView === 'jornada' && (
          <section className="content-section">
            <SectionTitle eyebrow="Mapa A1-D7" title="Jornada transcendental">A duração sobe por semana. Se um dia for esquecido, a jornada retorna para A1 e registra o Selo do Retorno.</SectionTitle>
            <div className="journey-board">
              {weeks.map((week, weekIndex) => {
                const portal = portals.find((item) => item.week === week.id)
                const complete = state.progress.completedDays.includes(`${week.id}7`)
                return (
                  <article key={week.id} className="week-card" style={{ '--week': week.color }}>
                    <div className="week-head"><span>Semana {week.id}</span><strong>{week.minutes} min</strong></div>
                    <div className="portal-seal">{portal.seal}</div>
                    <img className="week-portal-art" src={portalArtById[portal.id]} alt="" />
                    <h3>{week.name}</h3>
                    <p>{week.intent}</p>
                    <div className="day-grid">
                      {Array.from({ length: 7 }, (_, index) => {
                        const day = index + 1
                        const code = `${week.id}${day}`
                        const current = weekIndex === state.progress.weekIndex && day === state.progress.day
                        const done = state.progress.completedDays.includes(code)
                        return <span key={code} className={`${current ? 'current' : ''} ${done ? 'done' : ''}`}>{code}</span>
                      })}
                    </div>
                    <ProgressLine value={Array.from({ length: 7 }, (_, index) => `${week.id}${index + 1}`).filter((day) => state.progress.completedDays.includes(day)).length} max={7} label={`Progresso da semana ${week.id}`} />
                    <button type="button" className="mini-action" disabled={!complete || state.openedPortals.includes(portal.id)} onClick={() => setState((current) => openPortal(current, portal.id))}>
                      {state.openedPortals.includes(portal.id) ? 'Portal aberto' : complete ? 'Abrir portal' : 'Portal selado'}
                    </button>
                  </article>
                )
              })}
            </div>
            <div className="portal-grid">
              {portals.map((portal) => (
                <article key={portal.id} className={`portal-card ${state.openedPortals.includes(portal.id) ? 'open' : ''}`}>
                  <div className="portal-icon">{portal.seal}</div>
                  <img className="portal-card-art" src={portalArtById[portal.id]} alt="" />
                  <h3>{portal.name}</h3>
                  <p>{portal.phrase}</p>
                  <small>{portal.reward}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'pratica' && (
          <section className="practice-layout">
            <div className="timer-panel">
              <img className="practice-bg-art" src={visualAssets.practice} alt="" />
              <SectionTitle eyebrow={`${journeyCode} · modo Nada`} title="Fechar os olhos. Permanecer. Concluir.">{phrase}</SectionTitle>
              <div className="timer-orb" style={{ '--progress': `${timerProgress}%`, '--stage': stage.color }} role="timer" aria-live="polite" aria-label={`Tempo restante ${formatTime(remaining)}`}>
                <span>{formatTime(remaining)}</span>
                <small>{state.daily.practice ? 'prática de hoje concluída' : timerStatus === 'running' ? 'em prática' : timerStatus === 'complete' ? 'portal interno aberto' : 'aguardando entrada'}</small>
              </div>
              <div className="timer-controls">
                <button type="button" className="primary-action" onClick={() => setTimer({ journeyCode, remaining, status: 'running' })} disabled={state.daily.practice || timerStatus === 'running' || remaining === 0}>Iniciar</button>
                <button type="button" className="ghost-action" onClick={() => setTimer({ journeyCode, remaining, status: 'paused' })} disabled={timerStatus !== 'running'}>Pausar</button>
                <button type="button" className="ghost-action" onClick={() => setTimer({ journeyCode, remaining: totalSeconds, status: 'idle' })} disabled={state.daily.practice}>Reiniciar</button>
                <button type="button" className="complete-action" onClick={finishPractice} disabled={remaining > 0 || state.daily.practice}>{state.daily.practice ? 'Prática registrada' : 'Concluir prática'}</button>
              </div>
              {state.lastUnlocks.length > 0 && <div className="unlock-feed" aria-live="polite">{state.lastUnlocks.map((item) => <span key={item}>{item}</span>)}</div>}
            </div>
            <aside className="ritual-panel">
              <h3>Meta ritual</h3>
              <p>{stage.intent}</p>
              <div className="reward-preview">
                <span>Recompensa prevista</span>
                <strong>+{45 + stage.minutes * 20} XP</strong>
                <strong>+{4 + stage.minutes} Centelhas</strong>
              </div>
              <form className="word-form" onSubmit={submitWord}>
                <label htmlFor="word">Registrar palavra</label>
                <div>
                  <input id="word" value={word} onChange={(event) => setWord(event.target.value)} placeholder="ex: foco, luz, paz" />
                  <button type="submit" className="mini-action">Gravar</button>
                </div>
              </form>
            </aside>
          </section>
        )}

        {activeView === 'codice' && (
          <section className="content-section">
            <SectionTitle eyebrow="Biblioteca simbólica" title="Códice Dual D7">Hebraico e sânscrito aparecem como trilhas simbólicas distintas dentro do jogo, unidas por pontes lúdicas de presença.</SectionTitle>
            <div className="codex-visual-band">
              <img src={visualAssets.codex} alt="Símbolo central do Códice Dual D7" />
              <div className="featured-card-grid">
                {codexFeaturedCards.map((card) => (
                  <article key={card.id} className="featured-card-art">
                    <img src={card.image} alt={`Carta simbólica ${card.title}`} />
                    <span>{card.title}</span>
                  </article>
                ))}
              </div>
            </div>
            <div className="bridge-grid">
              {dualBridges.map((bridge) => <article key={bridge.id} className="bridge-card"><strong>{bridge.formula}</strong><h3>{bridge.title}</h3><p>{bridge.meaning}. {bridge.explanation}</p></article>)}
            </div>
            <div className="codex-layout">
              <div>
                <h3 className="subhead">Trilha Hebraica</h3>
                <div className="symbol-grid">{[...hebrewLetters, ...hebrewWords].map((card) => <SymbolCard key={card.id} card={card} unlocked={state.unlockedCards.includes(card.id)} studied={state.studiedCards.includes(card.id)} onStudy={study} />)}</div>
              </div>
              <div>
                <h3 className="subhead">Trilha Sânscrita</h3>
                <div className="symbol-grid">{sanskritItems.map((card) => <SymbolCard key={card.id} card={card} unlocked={state.unlockedCards.includes(card.id)} studied={state.studiedCards.includes(card.id)} onStudy={study} />)}</div>
              </div>
            </div>
            <div className="code-section">
              <SectionTitle eyebrow="Sala dos Códigos" title="Chaves e Selos" />
              <div className="code-grid">{codes.map((code) => <CodeCard key={code.id} code={code} unlocked={state.unlockedCodes.includes(code.id)} />)}</div>
            </div>
          </section>
        )}

        {activeView === 'ranking' && (
          <section className="content-section">
            <SectionTitle eyebrow="Ranking local" title="Ordem de presença">Score = XP + sequência * 50 + cartas * 25 + portais * 200 + códigos * 150.</SectionTitle>
            <img className="ranking-seal-art" src={visualAssets.ranking} alt="Selo visual do ranking D7" />
            <div className="ranking-list">
              {rank.map((player, index) => (
                <article key={player.name} className={player.current ? 'rank-row current-player' : 'rank-row'}>
                  <strong>#{index + 1}</strong>
                  <div><span>{player.name}</span><small>{player.title}</small></div>
                  <p>{player.score} score</p>
                  <small>{player.xp} XP · {player.streak} dias · {player.cards} cartas · {player.portals} portais · {player.codes} códigos</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'perfil' && (
          <section className="profile-grid">
            <div className="profile-card">
              <Sigil label={state.profile.avatar} tone="gold" />
              <div className="profile-seals" aria-hidden="true">
                <img src={visualAssets.sealD7} alt="" />
                <img src={visualAssets.cycle} alt="" />
              </div>
              <h2>{state.profile.name}</h2>
              <p>{state.profile.title}</p>
              <div className="profile-level">Nível {playerLevel(state.xp)}</div>
              <button type="button" className="ghost-action" onClick={resetMvp}>Resetar MVP local</button>
            </div>
            <div className="inventory-card">
              <SectionTitle eyebrow="Perfil do jogador" title="Progressão e Selos" />
              <div className="profile-stats">
                <StatCard label="Ciclo" value={journeyCode} detail={stage.name} />
                <StatCard label="Sequência" value={state.progress.streak} detail="dias ativos" />
                <StatCard label="Cartas" value={state.unlockedCards.length} detail={`${codexCards.length} totais`} />
                <StatCard label="Missões" value={state.completedMissions.length} detail="ativas concluídas" />
                <StatCard label="Portais" value={state.openedPortals.length} detail="4 possíveis" />
                <StatCard label="Códigos" value={state.unlockedCodes.length} detail="8 possíveis" />
              </div>
              <div className="track-progress">
                <p>Hebraico <strong>{hebrewUnlocked}</strong></p><ProgressLine value={hebrewUnlocked} max={hebrewLetters.length + hebrewWords.length} label="Progresso da trilha hebraica" />
                <p>Sânscrito <strong>{sanskritUnlocked}</strong></p><ProgressLine value={sanskritUnlocked} max={sanskritItems.length} label="Progresso da trilha sânscrita" />
              </div>
            </div>
          </section>
        )}

        {activeView === 'circulos' && (
          <section className="content-section">
            <SectionTitle eyebrow="Círculos" title="Salas rituais locais">Protótipo visual sem backend para grupos, biblioteca simbólica e preparação de portais sociais futuros.</SectionTitle>
            <div className="circle-grid">
              {state.circles.map((circle) => (
                <article key={circle.id} className="circle-card">
                  <div className="circle-seal">{circle.seal}</div>
                  <span>{circle.pulse}</span>
                  <h3>{circle.name}</h3>
                  <p>{circle.members} membros · foco em {circle.focus}</p>
                  <button type="button" className="ghost-action">Entrar na sala</button>
                </article>
              ))}
              <article className="circle-card invite-card">
                <div className="circle-seal">✺</div>
                <span>Em breve</span>
                <h3>Portal cooperativo</h3>
                <p>Espaço reservado para círculos reais quando houver backend.</p>
                <button type="button" className="ghost-action">Preparar convite</button>
              </article>
            </div>
          </section>
        )}

        <ClosingMantra />
      </main>
    </div>
  )
}

function MissionRow({ mission, done }) {
  return (
    <div className={`mission-row ${done ? 'done' : ''}`}>
      <span>{done ? '✓' : '○'}</span>
      <p>{mission.title}</p>
      <small>{mission.reward}</small>
    </div>
  )
}

export default App
