import { useEffect, useRef, useState } from 'react'
import { createAdminLocal, endAdminSession, getAdminLocal, getObserverMode, hasAdminSession, loginAdminLocal, setObserverMode } from '../services/adminLocal.js'
import AdminControlCenter from './AdminControlCenter.jsx'
import { createSecurityAlert, trackAdminEvent } from '../services/adminAnalyticsService.js'

function AdminAccessForm({ hasAdmin, onDone }) {
  const [form, setForm] = useState({ name: '', alias: '', password: '', confirmPassword: '', rememberDevice: false })
  const [message, setMessage] = useState(null)
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(event) {
    event.preventDefault()
    const result = hasAdmin ? await loginAdminLocal(form) : await createAdminLocal(form)
    setMessage({ type: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      trackAdminEvent('local-admin', hasAdmin ? 'admin_login' : 'admin_created', { admin: true, alias: form.alias })
      onDone()
    } else if (hasAdmin) {
      createSecurityAlert({ severity: 'warning', message: 'Tentativa de acessar admin pleno local sem credenciais válidas.', metadata: { alias: form.alias } })
      trackAdminEvent('anonymous', 'admin_login_failed', { alias: form.alias })
    }
  }

  return (
    <form className="admin-access-form" onSubmit={submit}>
      <h3>{hasAdmin ? 'Entrar como Administrador Pleno D7' : 'Criar Administrador Pleno Local'}</h3>
      <p>Acesso administrativo local deste navegador. Não é visão remota real; backend será necessário para administração entre dispositivos.</p>
      {!hasAdmin && (
        <>
          <label htmlFor="admin-name">Nome do administrador</label>
          <input id="admin-name" value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" />
        </>
      )}
      <label htmlFor="admin-alias">Apelido administrativo</label>
      <input id="admin-alias" value={form.alias} onChange={(event) => update('alias', event.target.value)} autoComplete="username" />
      <label htmlFor="admin-password">PIN ou senha admin</label>
      <input id="admin-password" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete="current-password" />
      {!hasAdmin && (
        <>
          <label htmlFor="admin-confirm">Confirmar PIN/senha</label>
          <input id="admin-confirm" type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} autoComplete="new-password" />
        </>
      )}
      <label className="switch-row" htmlFor="admin-remember-device">
        <input id="admin-remember-device" type="checkbox" checked={form.rememberDevice} onChange={(event) => update('rememberDevice', event.target.checked)} />
        <span>Lembrar este dispositivo por 7 dias</span>
      </label>
      <small>Sem esta opção, a sessão admin local expira em 8 horas neste navegador.</small>
      <button type="submit" className="primary-action">{hasAdmin ? 'Entrar como admin pleno' : 'Criar administrador pleno'}</button>
      {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}
    </form>
  )
}

export default function AdminPanel({ summaries, t = (path) => path, onRefresh, onAdminOpened }) {
  const [session, setSession] = useState(() => hasAdminSession())
  const [observer, setObserver] = useState(() => getObserverMode())
  const openedRef = useRef(false)
  const hasAdmin = Boolean(getAdminLocal())

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
          <h2 id="admin-title">Administrador Pleno D7</h2>
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
          <h2 id="admin-title">Administrador Pleno D7</h2>
          <p>Esta versão usa dados locais do navegador. Recursos reais de administração e sala ao vivo exigirão backend e consentimento dos usuários.</p>
        </div>
        <button type="button" className="ghost-action" onClick={() => { trackAdminEvent('local-admin', 'admin_logout', { admin: true }); endAdminSession(); setSession(false) }}>Sair do admin pleno</button>
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
