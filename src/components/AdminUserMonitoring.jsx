import { useState } from 'react'
import { blockLocalUser, getMonitoringCounters, searchUserMonitoringSummaries, unblockLocalUser } from '../services/adminUserMonitoring.js'

function formatDate(value) {
  if (!value) return 'sem registro'
  try { return new Date(value).toLocaleString('pt-BR') } catch { return value }
}

function formatDuration(seconds = 0) {
  const total = Math.max(0, Math.round(Number(seconds || 0)))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
}

function screenLabel(view) {
  const labels = {
    home: 'Home',
    jornada: 'Jornada',
    pratica: 'Prática',
    codice: 'Códice',
    perfil: 'Perfil',
    biblioteca: 'Biblioteca',
    sala: 'Sala D7',
    roda: 'Roda D7',
    admin: 'Admin',
    ranking: 'Ranking',
    acompanhamento: 'Acompanhamento',
  }
  return labels[view] ?? view
}

export default function AdminUserMonitoring({ onChanged }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [trainingFilter, setTrainingFilter] = useState('todos')
  const [sort, setSort] = useState('ultimo_acesso')
  const [activeBlockId, setActiveBlockId] = useState(null)
  const [blockReason, setBlockReason] = useState('')
  const [blockConfirm, setBlockConfirm] = useState('')
  const [message, setMessage] = useState(null)
  const [, setRefreshKey] = useState(0)

  const counters = getMonitoringCounters()
  const users = searchUserMonitoringSummaries(query, { status: statusFilter, training: trainingFilter, sort })

  function refresh(result) {
    setMessage({ type: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      setRefreshKey((value) => value + 1)
      onChanged?.()
    }
  }

  function submitBlock(user) {
    const result = blockLocalUser(user.safeId, blockReason, blockConfirm)
    refresh(result)
    if (result.ok) {
      setActiveBlockId(null)
      setBlockReason('')
      setBlockConfirm('')
    }
  }

  function submitUnblock(user) {
    refresh(unblockLocalUser(user.safeId))
  }

  return (
    <section className="control-panel admin-user-management" aria-labelledby="user-monitoring-title">
      <div className="control-panel-head">
        <div>
          <span className="overline">Administração local</span>
          <h3 id="user-monitoring-title">Usuários & Acompanhamento</h3>
        </div>
      </div>
      <p className="control-note">Tempo de uso local mede apenas a atividade dentro deste navegador e deste app. Não usa câmera, microfone, localização nem envia dados para fora.</p>
      {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}

      <div className="control-metrics-grid owner-metrics-grid">
        <article><span>Total de usuários locais</span><strong>{counters.total}</strong></article>
        <article><span>Ativos</span><strong>{counters.active}</strong></article>
        <article><span>Bloqueados</span><strong>{counters.blocked}</strong></article>
        <article><span>Sem progresso</span><strong>{counters.noProgress}</strong></article>
        <article><span>Seguindo trilha</span><strong>{counters.following}</strong></article>
      </div>

      <div className="admin-inline-form">
        <label>
          Buscar usuário
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, apelido ou id seguro" />
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="todos">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
            <option value="bloqueados">Bloqueados/banidos localmente</option>
            <option value="seguindo_trilha">Seguindo a trilha</option>
            <option value="trilha_atrasada">Trilha atrasada</option>
            <option value="sem_progresso">Sem progresso</option>
          </select>
        </label>
        <label>
          Trilha/progresso
          <select value={trainingFilter} onChange={(event) => setTrainingFilter(event.target.value)}>
            <option value="todos">Todos</option>
            <option value="seguindo">Seguindo a trilha</option>
            <option value="atrasada">Trilha atrasada</option>
            <option value="sem_progresso">Sem progresso</option>
          </select>
        </label>
        <label>
          Ordenar por
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="ultimo_acesso">Último acesso</option>
            <option value="maior_progresso">Maior progresso</option>
            <option value="menor_progresso">Menor progresso</option>
            <option value="maior_tempo">Maior tempo de uso local</option>
          </select>
        </label>
      </div>

      <div className="admin-management-grid">
        {users.map((user) => {
          const expected = user.role?.toLowerCase().includes('admin') || user.role?.toLowerCase().includes('owner') ? 'BLOQUEAR ADMIN' : 'BLOQUEAR'
          const topViews = Object.entries(user.screenTime.byView ?? {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5)
          return (
            <article key={user.safeId} className="admin-management-card">
              <header>
                <div className="user-mini-avatar" aria-hidden="true">{user.name?.slice(0, 2)?.toUpperCase() || 'D7'}</div>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.alias} · {user.localStatus}</small>
                </div>
              </header>

              <div className="admin-management-stats">
                <span>Role: {user.role}</span>
                <span>Ciclo atual: {user.currentCycle ?? 'sem registro'}</span>
                <span>Nível {user.level} · XP {user.xp} · Score {user.score} · Centelhas {user.sparks}</span>
                <span>Último acesso: {formatDate(user.lastLoginAt)}</span>
                <span>Práticas concluídas: {user.completedPractices}</span>
                <span>Tempo local total: {formatDuration(user.screenTime.totalSeconds)}</span>
                <span>Sessão atual estimada: {formatDuration(user.screenTime.currentSessionSeconds)}</span>
                <span>Trilha: {user.training.label} · {user.training.percent}% de 28 dias</span>
                <span>Última prática: {user.lastPracticeDate ?? 'sem registro'}</span>
              </div>

              <div className="admin-chip-grid">
                {topViews.map(([view, seconds]) => <span key={view}>{screenLabel(view)}: {formatDuration(seconds)}</span>)}
                {topViews.length === 0 && <span>Sem tempo por tela registrado.</span>}
              </div>

              {user.status === 'blocked' && <p className="control-note">Motivo local: {user.blockedReason || 'sem motivo informado'} · Bloqueado em {formatDate(user.blockedAt)}</p>}

              <div className="admin-management-actions" aria-label={`Ações locais para ${user.name}`}>
                {user.status === 'blocked' ? (
                  <button type="button" className="ghost-action" onClick={() => submitUnblock(user)}>Desbloquear usuário local</button>
                ) : (
                  <button type="button" className="danger-action" onClick={() => { setActiveBlockId(activeBlockId === user.safeId ? null : user.safeId); setBlockReason(''); setBlockConfirm('') }}>Bloquear usuário local</button>
                )}
              </div>

              {activeBlockId === user.safeId && user.status !== 'blocked' && (
                <div className="admin-inline-form danger-zone">
                  <label>
                    Motivo local do bloqueio
                    <input type="text" maxLength="160" value={blockReason} onChange={(event) => setBlockReason(event.target.value.slice(0, 160))} />
                  </label>
                  <label>
                    Digite {expected} para confirmar
                    <input type="text" value={blockConfirm} onChange={(event) => setBlockConfirm(event.target.value)} />
                  </label>
                  <button type="button" className="danger-action" onClick={() => submitBlock(user)}>Confirmar bloqueio local</button>
                </div>
              )}
            </article>
          )
        })}
        {users.length === 0 && <p className="d7-empty-state">Nenhum usuário encontrado com os filtros atuais.</p>}
      </div>
    </section>
  )
}
