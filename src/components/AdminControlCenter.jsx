import { useMemo, useState } from 'react'
import AdminPresencePanel from './AdminPresencePanel.jsx'
import AdminUserActivityCard from './AdminUserActivityCard.jsx'
import AdminEventTimeline from './AdminEventTimeline.jsx'
import { buildAdminReport, resolveSecurityAlert, summarizeAdminAnalytics } from '../services/adminAnalyticsService.js'
import { getPresenceList } from '../services/presenceService.js'
import { getRoomState } from '../services/roomLocal.js'

function formatSeconds(seconds = 0) {
  const min = Math.round(Number(seconds || 0) / 60)
  return `${min} min`
}

export default function AdminControlCenter({ summaries, onResolvedAlert }) {
  const [filter, setFilter] = useState('todos')
  const [message, setMessage] = useState(null)
  const presence = useMemo(() => getPresenceList(summaries), [summaries])
  const roomState = useMemo(() => getRoomState(), [])
  const analytics = summarizeAdminAnalytics(summaries, presence, roomState)
  const report = buildAdminReport({ summaries, presence, analytics, roomState })

  function downloadReport() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `d7-admin-local-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage({ type: 'success', text: 'Relatório local exportado sem senha, hash ou salt.' })
  }

  async function copySummary() {
    const text = `Centro de Controle D7\nUsuários: ${analytics.usersCount}\nAtivos locais: ${analytics.activeNow}\nSessões hoje: ${analytics.sessionsToday}\nEventos recentes: ${analytics.events.length}\nAlertas pendentes: ${analytics.securityEvents}`
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ type: 'success', text: 'Resumo admin copiado.' })
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível copiar agora.' })
    }
  }

  function resolveAlert(alertId) {
    resolveSecurityAlert(alertId)
    onResolvedAlert?.()
  }

  return (
    <div className="control-center">
      <div className="professional-notice">
        <span className="overline">Centro de Controle D7</span>
        <h2>Centro de Controle D7</h2>
        <p>Esta versão registra atividade local para organização e segurança do MVP. Os dados ficam neste navegador. Monitoramento real entre dispositivos exigirá backend, autenticação real e política de privacidade.</p>
      </div>

      <div className="admin-actions-row">
        <button type="button" className="primary-action" onClick={downloadReport}>Exportar relatório local JSON</button>
        <button type="button" className="ghost-action" onClick={copySummary}>Copiar resumo admin</button>
      </div>
      {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}

      <div className="control-metrics-grid">
        <article><span>Usuários locais</span><strong>{analytics.usersCount}</strong></article>
        <article><span>Ativos agora</span><strong>{analytics.activeNow}</strong></article>
        <article><span>Sessões hoje</span><strong>{analytics.sessionsToday}</strong></article>
        <article><span>Práticas hoje</span><strong>{analytics.practicesToday}</strong></article>
        <article><span>Posts criados</span><strong>{analytics.postsCreated}</strong></article>
        <article><span>Mensagens Sala</span><strong>{analytics.roomMessages}</strong></article>
        <article><span>D7T ganhos</span><strong>{analytics.d7tEarned}</strong></article>
        <article><span>D7T gastos</span><strong>{analytics.d7tSpent}</strong></article>
        <article><span>Denúncias</span><strong>{analytics.pendingReports}</strong></article>
        <article><span>Alertas</span><strong>{analytics.securityEvents}</strong></article>
        <article><span>Sessão média</span><strong>{formatSeconds(analytics.averageSessionSeconds)}</strong></article>
      </div>

      <AdminPresencePanel presence={presence} />

      <section className="control-panel" aria-labelledby="users-title">
        <div className="control-panel-head"><div><span className="overline">Perfis locais</span><h3 id="users-title">Usuários locais</h3></div></div>
        <div className="control-user-grid">
          {summaries.map((summary) => <AdminUserActivityCard key={summary.user.id} summary={summary} presence={presence.find((item) => item.userId === summary.user.id)} />)}
        </div>
      </section>

      <AdminEventTimeline events={analytics.events} filter={filter} onFilterChange={setFilter} summaries={summaries} />

      <section className="control-panel" aria-labelledby="room-admin-title">
        <div className="control-panel-head"><div><span className="overline">Sala e Círculos</span><h3 id="room-admin-title">Sala D7 e comunidade local</h3></div></div>
        <p className="control-note">Admin vê apenas estado local da Sala D7 neste navegador: participantes, solicitações e metadados de mensagens recentes. O conteúdo privado futuro deve exigir regras de acesso no backend.</p>
        <div className="room-admin-grid">
          {Object.values(roomState.permissions ?? {}).map((participant) => <article key={participant.userId}><strong>{participant.nickname}</strong><small>Fala: {participant.speech} · Câmera: {participant.camera} · Papel: {participant.role}</small></article>)}
          {(roomState.messages ?? []).slice(0, 5).map((msg) => <article key={msg.id}><strong>{msg.nickname}</strong><small>Mensagem local em {new Date(msg.createdAt).toLocaleString('pt-BR')}</small></article>)}
        </div>
      </section>

      <section className="control-panel" aria-labelledby="security-title">
        <div className="control-panel-head"><div><span className="overline">Segurança</span><h3 id="security-title">Alertas de segurança local</h3></div></div>
        <div className="security-alert-list">
          {analytics.alerts.map((alert) => (
            <article key={alert.id} className={`security-alert ${alert.severity} ${alert.resolved ? 'resolved' : ''}`}>
              <div><strong>{alert.severity}</strong><p>{alert.message}</p><small>{new Date(alert.createdAt).toLocaleString('pt-BR')}</small></div>
              {!alert.resolved && <button type="button" className="mini-action" onClick={() => resolveAlert(alert.id)}>Marcar resolvido</button>}
            </article>
          ))}
          {analytics.alerts.length === 0 && <p className="d7-empty-state">Nenhum alerta local registrado.</p>}
        </div>
      </section>
    </div>
  )
}
