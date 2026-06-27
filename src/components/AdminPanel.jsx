import { useEffect, useRef, useState } from 'react'
import { createAdminLocal, endAdminSession, getObserverMode, hasAdminSession, loginAdminLocal, setObserverMode } from '../services/adminLocal.js'
import AdminControlCenter from './AdminControlCenter.jsx'
import { trackAdminEvent } from '../services/adminAnalyticsService.js'

function AdminAccessForm({ hasAdmin, onDone }) {
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' })
  const [message, setMessage] = useState(null)
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(event) {
    event.preventDefault()
    const result = hasAdmin ? await loginAdminLocal(form) : await createAdminLocal(form)
    setMessage({ type: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      trackAdminEvent('local-admin', hasAdmin ? 'admin_login' : 'admin_created', { admin: true })
      onDone()
    }
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

export default function AdminPanel({ summaries, t = (path) => path, onRefresh, onAdminOpened }) {
  const [session, setSession] = useState(() => hasAdminSession())
  const [observer, setObserver] = useState(() => getObserverMode())
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

      <AdminControlCenter summaries={summaries} onResolvedAlert={onRefresh} />
    </section>
  )
}
