import { useMemo, useState } from 'react'
import {
  buildFullLocalBackup,
  changeLocalUserPlanFromAdmin,
  buildUserBackup,
  clearStalePresence,
  deleteLocalUserFromAdmin,
  downloadJsonBackup,
  isProtectedLocalUser,
  resetLocalD7Environment,
  resetUserPasswordFromAdmin,
} from '../services/adminUserManagement.js'
import { PLAN_IDS, getLocalPlan, getPlanDefinition, listPlanDefinitions } from '../services/subscriptionLocal.js'

function formatDate(value) {
  if (!value) return 'sem registro'
  try { return new Date(value).toLocaleString('pt-BR') } catch { return value }
}

function statusLabel(status) {
  if (status === 'online') return 'online local'
  if (status === 'away') return 'ausente'
  return 'offline local'
}

function summarizeUser(summary) {
  return {
    nickname: summary.user.name,
    alias: summary.user.login,
    role: summary.user.role ?? 'player',
    createdAt: summary.user.createdAt,
    lastLoginAt: summary.user.lastLoginAt,
    plan: getPlanDefinition(getLocalPlan(summary.user.id)).publicName,
    level: summary.level,
    xp: summary.xp,
    sparks: summary.sparks,
    d7t: summary.tokenBalance,
    rankingScore: summary.score,
    stage: summary.currentStage,
    practices: summary.completedPractices,
    ritualMinutesTotal: summary.ritualMinutesTotal,
    libraryCardsStudied: summary.libraryCardsStudied,
    unlockedSeals: summary.unlockedSeals?.length ?? 0,
  }
}

export default function AdminUserManagement({ summaries = [], presence = [], onChanged }) {
  const [activeResetId, setActiveResetId] = useState(null)
  const [activeDeleteId, setActiveDeleteId] = useState(null)
  const [expandedSummaryId, setExpandedSummaryId] = useState(null)
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' })
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [message, setMessage] = useState(null)

  const presenceByUser = useMemo(() => Object.fromEntries(presence.map((item) => [item.userId, item])), [presence])
  const planOptions = useMemo(() => listPlanDefinitions(), [])

  function notify(result) {
    setMessage({ type: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) onChanged?.()
  }

  function submitPlanChange(userId, planId) {
    notify(changeLocalUserPlanFromAdmin({ userId, planId }))
  }

  async function submitReset(userId) {
    const result = await resetUserPasswordFromAdmin({ userId, ...resetForm })
    notify(result)
    if (result.ok) {
      setActiveResetId(null)
      setResetForm({ password: '', confirmPassword: '' })
    }
  }

  function exportUser(summary) {
    downloadJsonBackup(buildUserBackup(summary.user.id, 'manual_user_export'), `d7-usuario-local-${summary.user.login}`)
    setMessage({ type: 'success', text: `Backup local de ${summary.user.name} exportado sem senha, hash ou salt.` })
  }

  function submitDelete(summary) {
    const protectedUser = isProtectedLocalUser(summary.user)
    const expected = protectedUser ? 'EXCLUIR ADMIN' : 'EXCLUIR'
    if (deleteConfirm !== expected) {
      setMessage({ type: 'error', text: `Digite ${expected} para confirmar a exclusão.` })
      return
    }
    const result = deleteLocalUserFromAdmin({ userId: summary.user.id, confirmation: deleteConfirm })
    if (result.ok && result.backup) {
      downloadJsonBackup(result.backup, `d7-backup-antes-excluir-${summary.user.login}`)
    }
    notify(result)
    if (result.ok) {
      setActiveDeleteId(null)
      setDeleteConfirm('')
    }
  }

  function submitClearPresence() {
    notify(clearStalePresence(10))
  }

  function exportFullBackup() {
    downloadJsonBackup(buildFullLocalBackup('manual_full_admin_backup'), 'd7-backup-local-completo')
    setMessage({ type: 'success', text: 'Backup local completo exportado sem senha, hash ou salt.' })
  }

  function submitResetEnvironment() {
    if (resetConfirm !== 'RESETAR D7 LOCAL') {
      setMessage({ type: 'error', text: 'Digite RESETAR D7 LOCAL para confirmar.' })
      return
    }
    const result = resetLocalD7Environment()
    if (result.backup) downloadJsonBackup(result.backup, 'd7-backup-antes-reset-local')
    window.setTimeout(() => window.location.reload(), 250)
  }

  return (
    <section className="control-panel admin-user-management" aria-labelledby="manage-users-title">
      <div className="control-panel-head">
        <div>
          <span className="overline">Administrador Pleno</span>
          <h3 id="manage-users-title">Gerenciar usuários locais</h3>
        </div>
        <button type="button" className="ghost-action" onClick={exportFullBackup}>Exportar backup JSON</button>
      </div>

      <p className="control-note">Ações administrativas valem apenas para este navegador. Senhas, hashes, salts e segredos de recuperação nunca são exibidos no painel nem nos backups exportados.</p>
      {message && <div className={`auth-message ${message.type}`} role="status">{message.text}</div>}

      <div className="admin-management-grid">
        {summaries.map((summary) => {
          const userPresence = presenceByUser[summary.user.id]
          const protectedUser = isProtectedLocalUser(summary.user)
          const requiredDeleteText = protectedUser ? 'EXCLUIR ADMIN' : 'EXCLUIR'
          const userSummary = summarizeUser(summary)
          const currentPlan = getPlanDefinition(getLocalPlan(summary.user.id))

          return (
            <article key={summary.user.id} className="admin-management-card">
              <header>
                <div className="user-mini-avatar" aria-hidden="true">{summary.avatarSymbol?.slice(0, 2)?.toUpperCase() ?? 'D7'}</div>
                <div>
                  <strong>{summary.user.name}</strong>
                  <small>{summary.user.login} · {statusLabel(userPresence?.status)}</small>
                </div>
              </header>

              <div className="admin-management-stats">
                <span>Role: {summary.user.role ?? 'player'}</span>
                <span>Plano: {currentPlan.publicName}</span>
                <span>Criado em: {formatDate(summary.user.createdAt)}</span>
                <span>Último acesso: {formatDate(summary.user.lastLoginAt)}</span>
                <span>D7T: {summary.tokenBalance ?? 0}</span>
                <span>Etapa: {summary.currentStage}</span>
                <span>XP: {summary.xp} · Nível {summary.level}</span>
              </div>

              <div className="admin-management-actions" aria-label={`Ações administrativas para ${summary.user.name}`}>
                <button type="button" className="mini-action" onClick={() => setExpandedSummaryId(expandedSummaryId === summary.user.id ? null : summary.user.id)}>Ver resumo local</button>
                <button type="button" className="ghost-action" onClick={() => exportUser(summary)}>Exportar dados deste usuário</button>
                <button type="button" className="ghost-action" onClick={() => { setActiveResetId(activeResetId === summary.user.id ? null : summary.user.id); setResetForm({ password: '', confirmPassword: '' }) }}>Redefinir PIN/Senha</button>
                <button type="button" className="danger-action" onClick={() => { setActiveDeleteId(activeDeleteId === summary.user.id ? null : summary.user.id); setDeleteConfirm('') }}>Excluir usuário local</button>
              </div>

              <div className="admin-inline-form">
                <label>
                  Alterar plano local
                  <select value={currentPlan.id} onChange={(event) => submitPlanChange(summary.user.id, event.target.value)}>
                    {planOptions.map((plan) => <option key={plan.id} value={plan.id}>{plan.publicName}{plan.id === PLAN_IDS.FOUNDER ? ' - opção administrativa' : ''}</option>)}
                  </select>
                </label>
                <p className="control-note">Mudança de plano é local neste navegador. Assinatura real exigirá backend e pagamento seguro.</p>
              </div>

              {expandedSummaryId === summary.user.id && (
                <pre className="admin-user-summary" aria-label={`Resumo seguro de ${summary.user.name}`}>{JSON.stringify(userSummary, null, 2)}</pre>
              )}

              {activeResetId === summary.user.id && (
                <div className="admin-inline-form">
                  <label>
                    Novo PIN/senha
                    <input type="password" value={resetForm.password} onChange={(event) => setResetForm((current) => ({ ...current, password: event.target.value }))} autoComplete="new-password" />
                  </label>
                  <label>
                    Confirmar novo PIN/senha
                    <input type="password" value={resetForm.confirmPassword} onChange={(event) => setResetForm((current) => ({ ...current, confirmPassword: event.target.value }))} autoComplete="new-password" />
                  </label>
                  <button type="button" className="primary-action" onClick={() => submitReset(summary.user.id)}>Salvar novo PIN/Senha</button>
                </div>
              )}

              {activeDeleteId === summary.user.id && (
                <div className="admin-inline-form danger-zone">
                  {protectedUser && <p className="control-note">Você está tentando excluir o administrador atual ou um usuário vinculado ao apelido administrativo. Essa ação pode remover seu acesso administrativo local.</p>}
                  <label>
                    Digite {requiredDeleteText} para confirmar
                    <input type="text" value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
                  </label>
                  <button type="button" className="danger-action" onClick={() => submitDelete(summary)}>Exportar backup e excluir</button>
                </div>
              )}
            </article>
          )
        })}

        {summaries.length === 0 && <p className="d7-empty-state">Nenhum usuário local cadastrado neste navegador.</p>}
      </div>

      <div className="admin-dev-tools">
        <div>
          <span className="overline">Ferramentas de desenvolvimento local</span>
          <h4>Manutenção deste navegador</h4>
          <p className="control-note">Use apenas para testes locais. Essas ações não afetam usuários em outros dispositivos porque ainda não existe backend real.</p>
        </div>
        <div className="admin-actions-row">
          <button type="button" className="ghost-action" onClick={submitClearPresence}>Limpar presença local antiga</button>
          <button type="button" className="ghost-action" onClick={exportFullBackup}>Exportar backup JSON</button>
        </div>
        <div className="admin-inline-form danger-zone">
          <label>
            Digite RESETAR D7 LOCAL para apagar os dados D7 deste navegador
            <input type="text" value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} />
          </label>
          <button type="button" className="danger-action" onClick={submitResetEnvironment}>Resetar D7 Local</button>
        </div>
      </div>
    </section>
  )
}
