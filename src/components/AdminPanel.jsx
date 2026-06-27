import { useEffect, useRef, useState } from 'react'
import { createAdminLocal, endAdminSession, getObserverMode, hasAdminSession, loginAdminLocal, setObserverMode } from '../services/adminLocal.js'
import { summarizeLocalEvents } from '../services/analyticsLocal.js'

function formatDate(value) {
  if (!value) return 'sem registro'
  try { return new Date(value).toLocaleString('pt-BR') } catch { return value }
}

function AdminAccessForm({ hasAdmin, onDone }) {
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' })
  const [message, setMessage] = useState(null)
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(event) {
    event.preventDefault()
    const result = hasAdmin ? await loginAdminLocal(form) : await createAdminLocal(form)
    setMessage({ type: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) onDone()
  }

  return (
    <form className="admin-access-form" onSubmit={submit}>
      <h3>{hasAdmin ? 'Entrar no Painel Admin Local' : 'Criar acesso administrativo local'}</h3>
      <p>Controle local do MVP. Isto não é segurança real de produção; backend real será necessário para administração entre dispositivos.</p>
      {!hasAdmin && (
        <>
          <label htmlFor="admin-name">Nome do administrador</label>
          <input id="admin-name" value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" />
        </>
      )}
      <label htmlFor="admin-password">PIN ou senha admin</label>
      <input id="admin-password" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete="current-password" />
      {!hasAdmin && (
        <>
          <label htmlFor="admin-confirm">Confirmar PIN/senha</label>
          <input id="admin-confirm" type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} autoComplete="new-password" />
        </>
      )}
      <button type="submit" className="primary-action">{hasAdmin ? 'Entrar como admin local' : 'Criar admin local'}</button>
      {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}
    </form>
  )
}

export default function AdminPanel({ summaries, analytics, t = (path) => path, onRefresh, onAdminOpened }) {
  const [session, setSession] = useState(() => hasAdminSession())
  const [observer, setObserver] = useState(() => getObserverMode())
  const localAnalytics = analytics ?? summarizeLocalEvents(summaries)
  const openedRef = useRef(false)
  const hasAdmin = Boolean(localStorage.getItem('d7_admin_local'))

  useEffect(() => {
    if (openedRef.current) return
    openedRef.current = true
    onAdminOpened?.()
  }, [onAdminOpened])

  if (!session) {
    return (
      <section className="admin-shell content-section" aria-labelledby="admin-title">
        <div className="professional-notice">
          <span className="overline">Privacidade</span>
          <h2 id="admin-title">{t('admin.title')}</h2>
          <p>{t('admin.privacy')}</p>
        </div>
        <AdminAccessForm hasAdmin={hasAdmin} onDone={() => { setSession(true); onRefresh?.() }} />
      </section>
    )
  }

  function toggleObserver() {
    const next = setObserverMode(!observer)
    setObserver(next)
  }

  return (
    <section className="admin-shell content-section" aria-labelledby="admin-title">
      <div className="admin-head">
        <div>
          <span className="overline">{t('admin.localMvp')}</span>
          <h2 id="admin-title">{t('admin.title')}</h2>
          <p>Esta versão usa dados locais do navegador. Recursos reais de administração e sala ao vivo exigirão backend e consentimento dos usuários.</p>
        </div>
        <button type="button" className="ghost-action" onClick={() => { endAdminSession(); setSession(false) }}>Encerrar admin local</button>
      </div>

      <div className="admin-toggle-row">
        <label className="switch-row" htmlFor="observer-mode">
          <input id="observer-mode" type="checkbox" checked={observer} onChange={toggleObserver} />
          <span>Modo observador da sala</span>
        </label>
        <p>Quando ativo, a Sala D7 mostra aviso de moderação. Não grava, não espiona e não acessa câmera/microfone.</p>
      </div>

      <div className="admin-metrics-grid">
        <article><span>Total de acessos locais</span><strong>{localAnalytics.totalAccesses}</strong></article>
        <article><span>Último acesso</span><strong>{formatDate(localAnalytics.lastAccess)}</strong></article>
        <article><span>Práticas concluídas</span><strong>{localAnalytics.practicesCompleted}</strong></article>
        <article><span>Giros da Roda D7</span><strong>{localAnalytics.wheelSpins}</strong></article>
      </div>

      <div className="admin-columns">
        <section className="admin-card-list" aria-labelledby="admin-users-title">
          <h3 id="admin-users-title">Usuários locais neste navegador</h3>
          {summaries.map((summary) => (
            <article key={summary.user.id} className="admin-user-card">
              <div><strong>{summary.user.name}</strong><small>{summary.user.login}</small></div>
              <p>Criado: {formatDate(summary.user.createdAt)} · Último login: {formatDate(summary.user.lastLoginAt)}</p>
              <div className="admin-chip-grid">
                <span>{summary.currentStage}</span><span>{summary.xp} XP</span><span>{summary.sparks} centelhas</span><span>{summary.tokenBalance} D7T</span><span>{summary.score} score</span><span>{summary.completedPractices} práticas</span><span>{summary.ritualMinutesTotal} min</span><span>Marcos {summary.ritualMilestonesUnlocked?.join(' / ') || 'pendente'}</span><span>{summary.unlockedSeals.length} selos</span><span>{summary.libraryCardsStudied} cards</span><span>{summary.libraryTitle}</span>
              </div>
            </article>
          ))}
        </section>
        <section className="admin-card-list" aria-labelledby="admin-events-title">
          <h3 id="admin-events-title">Eventos recentes</h3>
          <div className="admin-top-views">
            {localAnalytics.topViews.map(([view, count]) => <span key={view}>{view}: {count}</span>)}
          </div>
          {localAnalytics.recentEvents.map((event) => (
            <article key={event.id} className="admin-event-row">
              <strong>{event.eventType}</strong>
              <span>{formatDate(event.createdAt)}</span>
            </article>
          ))}
        </section>
      </div>
    </section>
  )
}
