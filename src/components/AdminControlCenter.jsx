import { useMemo, useState } from 'react'
import AdminPresencePanel from './AdminPresencePanel.jsx'
import AdminUserActivityCard from './AdminUserActivityCard.jsx'
import AdminEventTimeline from './AdminEventTimeline.jsx'
import AdminUserManagement from './AdminUserManagement.jsx'
import { buildAdminReport, resolveSecurityAlert, summarizeAdminAnalytics } from '../services/adminAnalyticsService.js'
import { getEventsByUser } from '../services/analyticsLocal.js'
import { getPresenceList } from '../services/presenceService.js'
import { getPlayerRoomsState, getRoomState } from '../services/roomLocal.js'
import { getWheelEventsByUser } from '../services/wheelService.js'
import { clearAuditEvents, createAuditEvent, exportAuditEvents, listAuditEvents } from '../services/auditLogLocal.js'

function formatSeconds(seconds = 0) {
  const min = Math.round(Number(seconds || 0) / 60)
  return `${min} min`
}

function isToday(value) {
  return Boolean(value && String(value).slice(0, 10) === new Date().toISOString().slice(0, 10))
}

function formatDate(value) {
  if (!value) return 'sem registro'
  try { return new Date(value).toLocaleString('pt-BR') } catch { return value }
}

function latestEvent(events, type) {
  return events.filter((event) => event.eventType === type).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
}

function summarizeGrowth({ summaries, presence, analytics, roomState, localEventsByUser, wheelEventsByUser }) {
  const allLocalEvents = Object.values(localEventsByUser).flatMap((events) => (Array.isArray(events) ? events : []))
  const allWheelEvents = Object.values(wheelEventsByUser).flatMap((events) => (Array.isArray(events) ? events : []))
  const todayLocalEvents = allLocalEvents.filter((event) => isToday(event.createdAt))
  const todayAuditEvents = analytics.events.filter((event) => isToday(event.createdAt))
  const activeTodayIds = new Set([...todayLocalEvents.map((event) => event.userId), ...todayAuditEvents.map((event) => event.userId)].filter(Boolean))

  return {
    totalUsers: summaries.length,
    newUsersToday: summaries.filter((summary) => isToday(summary.user.createdAt)).length,
    activeUsersToday: activeTodayIds.size,
    onlineLocal: presence.filter((item) => item.status === 'online').length,
    sessionsToday: analytics.sessionsToday,
    practicesToday: todayLocalEvents.filter((event) => event.eventType === 'practice_completed').length + todayAuditEvents.filter((event) => event.eventType === 'practice_completed').length,
    cardsStudiedToday: todayLocalEvents.filter((event) => event.eventType === 'study_card_completed').length + todayAuditEvents.filter((event) => event.eventType === 'study_card_completed').length,
    postsToday: todayAuditEvents.filter((event) => event.eventType === 'social_post_created').length,
    roomMessages: roomState.messages?.length ?? 0,
    wheelSpins: allWheelEvents.length,
    d7tGenerated: summaries.reduce((sum, summary) => sum + Number(summary.totalTokenEarned ?? 0), 0),
    d7tSpent: allWheelEvents.reduce((sum, event) => sum + Number(event.costD7T ?? 0), 0),
    pendingAlerts: analytics.alerts.filter((alert) => !alert.resolved).length,
  }
}

function accessRows(summaries, presence, localEventsByUser, auditEvents) {
  return summaries.map((summary) => {
    const localEvents = Array.isArray(localEventsByUser[summary.user.id]) ? localEventsByUser[summary.user.id] : []
    const adminEvents = auditEvents.filter((event) => event.userId === summary.user.id)
    const events = [...localEvents, ...adminEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const currentPresence = presence.find((item) => item.userId === summary.user.id)
    return {
      summary,
      presence: currentPresence,
      lastLogin: latestEvent(events, 'login')?.createdAt ?? latestEvent(events, 'user_login')?.createdAt ?? summary.user.lastLoginAt,
      lastLogout: latestEvent(events, 'logout')?.createdAt ?? latestEvent(events, 'user_logout')?.createdAt ?? null,
      lastActivity: events[0]?.createdAt ?? currentPresence?.lastActivityAt ?? summary.updatedAt ?? summary.user.lastLoginAt,
      currentView: currentPresence?.currentView ?? 'sem sessão local',
      estimatedSessionSeconds: currentPresence?.estimatedSessionSeconds ?? 0,
      sessions: events.filter((event) => event.eventType === 'login' || event.eventType === 'user_login' || event.eventType === 'session_started').length,
      eventsCount: events.length,
    }
  }).sort((a, b) => new Date(b.lastActivity ?? 0) - new Date(a.lastActivity ?? 0))
}

export default function AdminControlCenter({ summaries, onResolvedAlert }) {
  const [filter, setFilter] = useState('todos')
  const [message, setMessage] = useState(null)
  const [auditEvents, setAuditEvents] = useState(() => listAuditEvents())
  const [auditClearConfirm, setAuditClearConfirm] = useState('')
  const presence = useMemo(() => getPresenceList(summaries), [summaries])
  const roomState = getRoomState()
  const playerRoomsState = getPlayerRoomsState()
  const localEventsByUser = getEventsByUser()
  const wheelEventsByUser = getWheelEventsByUser()
  const analytics = summarizeAdminAnalytics(summaries, presence, roomState)
  const growth = summarizeGrowth({ summaries, presence, analytics, roomState, localEventsByUser, wheelEventsByUser })
  const accesses = accessRows(summaries, presence, localEventsByUser, analytics.events)
  const report = {
    ...buildAdminReport({ summaries, presence, analytics, roomState }),
    title: 'Administrador Pleno D7 - relatório local',
    growth,
    access: accesses.map((row) => ({
      userId: row.summary.user.id,
      nickname: row.summary.user.name,
      login: row.summary.user.login,
      lastLogin: row.lastLogin,
      lastLogout: row.lastLogout,
      lastActivity: row.lastActivity,
      currentView: row.currentView,
      estimatedSessionSeconds: row.estimatedSessionSeconds,
      sessions: row.sessions,
      eventsCount: row.eventsCount,
    })),
    wheel: Object.values(wheelEventsByUser).flatMap((events) => (Array.isArray(events) ? events : [])).slice(0, 80),
    playerRooms: playerRoomsState.rooms.map((room) => ({ id: room.id, name: room.name, theme: room.theme, ownerId: room.ownerId, createdAt: room.createdAt, messagesCount: room.messages?.length ?? 0 })),
  }

  function downloadReport() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `d7-admin-pleno-local-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage({ type: 'success', text: 'Relatório local exportado sem senha, hash ou salt.' })
  }

  async function copySummary() {
    const text = `Administrador Pleno D7\nUsuários locais: ${growth.totalUsers}\nNovos hoje: ${growth.newUsersToday}\nAtivos hoje: ${growth.activeUsersToday}\nOnline local: ${growth.onlineLocal}\nSessões hoje: ${growth.sessionsToday}\nPráticas hoje: ${growth.practicesToday}\nCards estudados hoje: ${growth.cardsStudiedToday}\nGiros Roda D7: ${growth.wheelSpins}\nD7T gerado: ${growth.d7tGenerated}\nD7T gasto: ${growth.d7tSpent}\nAlertas pendentes: ${growth.pendingAlerts}`
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ type: 'success', text: 'Resumo administrativo copiado.' })
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível copiar agora.' })
    }
  }

  function resolveAlert(alertId) {
    resolveSecurityAlert(alertId)
    onResolvedAlert?.()
  }

  function refreshAuditEvents() {
    setAuditEvents(listAuditEvents())
  }

  function downloadAuditLogs() {
    createAuditEvent('backup_exported', {
      actorRole: 'owner-local-admin',
      actorSafeId: 'local-admin',
      status: 'success',
      metadata: { backupType: 'd7_local_audit_logs' },
    })
    const backup = exportAuditEvents()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `d7-auditoria-local-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    refreshAuditEvents()
    setMessage({ type: 'success', text: 'Logs locais exportados sem senha, PIN, hash, salt ou segredo.' })
  }

  function submitClearAuditLogs() {
    if (auditClearConfirm !== 'LIMPAR LOGS D7') {
      setMessage({ type: 'error', text: 'Digite LIMPAR LOGS D7 para confirmar.' })
      return
    }
    clearAuditEvents({ actorSafeId: 'local-admin', actorRole: 'owner-local-admin' })
    setAuditClearConfirm('')
    refreshAuditEvents()
    setMessage({ type: 'success', text: 'Logs locais limpos neste navegador.' })
  }

  return (
    <div className="control-center admin-owner-center">
      <div className="professional-notice">
        <span className="overline">Administrador Pleno D7</span>
        <h2>Centro de Controle e Crescimento Local</h2>
        <p>Essas métricas representam apenas este navegador nesta versão local. Para crescimento real entre dispositivos, será necessário backend com autenticação, banco de dados, sessões, presença, eventos, segurança e política de privacidade.</p>
      </div>

      <div className="admin-actions-row">
        <button type="button" className="primary-action" onClick={downloadReport}>Exportar relatório JSON</button>
        <button type="button" className="ghost-action" onClick={copySummary}>Copiar resumo administrativo</button>
      </div>
      {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}

      <div className="control-metrics-grid owner-metrics-grid">
        <article><span>Total de usuários locais</span><strong>{growth.totalUsers}</strong></article>
        <article><span>Novos usuários hoje</span><strong>{growth.newUsersToday}</strong></article>
        <article><span>Usuários ativos hoje</span><strong>{growth.activeUsersToday}</strong></article>
        <article><span>Online localmente</span><strong>{growth.onlineLocal}</strong></article>
        <article><span>Sessões hoje</span><strong>{growth.sessionsToday}</strong></article>
        <article><span>Práticas hoje</span><strong>{growth.practicesToday}</strong></article>
        <article><span>Cards estudados hoje</span><strong>{growth.cardsStudiedToday}</strong></article>
        <article><span>Posts criados hoje</span><strong>{growth.postsToday}</strong></article>
        <article><span>Mensagens Sala D7</span><strong>{growth.roomMessages}</strong></article>
        <article><span>Giros Roda D7</span><strong>{growth.wheelSpins}</strong></article>
        <article><span>D7T total gerado</span><strong>{growth.d7tGenerated}</strong></article>
        <article><span>D7T total gasto</span><strong>{growth.d7tSpent}</strong></article>
        <article><span>Alertas pendentes</span><strong>{growth.pendingAlerts}</strong></article>
        <article><span>Sessão média</span><strong>{formatSeconds(analytics.averageSessionSeconds)}</strong></article>
      </div>

      <AdminPresencePanel presence={presence} />

      <section className="control-panel" aria-labelledby="access-title">
        <div className="control-panel-head"><div><span className="overline">Acessos locais</span><h3 id="access-title">Quem acessou</h3></div></div>
        <div className="access-grid">
          {accesses.map((row) => (
            <article key={row.summary.user.id} className="access-card">
              <strong>{row.summary.user.name}</strong>
              <small>{row.summary.user.login} · {row.presence?.status ?? 'offline'}</small>
              <span>Última entrada: {formatDate(row.lastLogin)}</span>
              <span>Última saída: {formatDate(row.lastLogout)}</span>
              <span>Última atividade: {formatDate(row.lastActivity)}</span>
              <span>Tela atual: {row.currentView}</span>
              <span>Sessão estimada: {formatSeconds(row.estimatedSessionSeconds)}</span>
              <span>Sessões locais: {row.sessions} · Eventos: {row.eventsCount}</span>
            </article>
          ))}
          {accesses.length === 0 && <p className="d7-empty-state">Nenhum acesso local registrado.</p>}
        </div>
      </section>

      <section className="control-panel" aria-labelledby="users-title">
        <div className="control-panel-head"><div><span className="overline">Usuários cadastrados localmente</span><h3 id="users-title">Usuários cadastrados localmente</h3></div></div>
        <div className="control-user-grid">
          {summaries.map((summary) => (
            <AdminUserActivityCard
              key={summary.user.id}
              summary={summary}
              presence={presence.find((item) => item.userId === summary.user.id)}
              localEvents={localEventsByUser[summary.user.id] ?? []}
              wheelEvents={wheelEventsByUser[summary.user.id] ?? []}
            />
          ))}
        </div>
      </section>

      <AdminUserManagement summaries={summaries} presence={presence} onChanged={onResolvedAlert} />

      <section className="control-panel" aria-labelledby="audit-local-title">
        <div className="control-panel-head"><div><span className="overline">Segurança local</span><h3 id="audit-local-title">Auditoria Local</h3></div></div>
        <p className="control-note">Logs locais ficam apenas neste navegador. Auditoria real multiusuário exigirá backend.</p>
        <div className="admin-actions-row">
          <button type="button" className="ghost-action" onClick={downloadAuditLogs}>Exportar logs locais</button>
        </div>
        <div className="access-grid">
          {auditEvents.slice(0, 30).map((event) => (
            <article key={event.id} className="access-card">
              <strong>{event.action}</strong>
              <small>{formatDate(event.timestamp)} · {event.status}</small>
              <span>Ator: {event.actorSafeId ?? event.actorName ?? 'local-admin'}</span>
              {event.targetSafeId && <span>Alvo: {event.targetSafeId}</span>}
              <span>Role: {event.actorRole ?? 'local-admin'}</span>
            </article>
          ))}
          {auditEvents.length === 0 && <p className="d7-empty-state">Nenhum log local registrado neste navegador.</p>}
        </div>
        <div className="admin-inline-form danger-zone">
          <label>
            Digite LIMPAR LOGS D7 para limpar os logs locais
            <input type="text" value={auditClearConfirm} onChange={(event) => setAuditClearConfirm(event.target.value)} />
          </label>
          <button type="button" className="danger-action" onClick={submitClearAuditLogs}>Limpar logs locais</button>
        </div>
      </section>

      <AdminEventTimeline events={analytics.events} filter={filter} onFilterChange={setFilter} summaries={summaries} />

      <section className="control-panel" aria-labelledby="room-admin-title">
        <div className="control-panel-head"><div><span className="overline">Sala e Círculos</span><h3 id="room-admin-title">Sala D7 e comunidade local</h3></div></div>
        <p className="control-note">Admin vê apenas estado local da Sala D7 neste navegador: participantes, solicitações e metadados de mensagens recentes. O conteúdo privado futuro deve exigir regras de acesso no backend.</p>
        <div className="room-admin-grid">
          {Object.values(roomState.permissions ?? {}).map((participant) => <article key={participant.userId}><strong>{participant.nickname}</strong><small>Fala: {participant.speech} · Câmera: {participant.camera} · Papel: {participant.role}</small></article>)}
          {(roomState.messages ?? []).slice(0, 5).map((msg) => <article key={msg.id}><strong>{msg.nickname}</strong><small>Mensagem local em {new Date(msg.createdAt).toLocaleString('pt-BR')}</small></article>)}
          {playerRoomsState.rooms.map((localRoom) => <article key={localRoom.id}><strong>{localRoom.icon} {localRoom.name}</strong><small>Sala local · {localRoom.theme} · {localRoom.messages?.length ?? 0} mensagem(ns)</small></article>)}
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
