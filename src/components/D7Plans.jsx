import { useMemo, useState } from 'react'
import { PLAN_IDS, getLocalPlan, getPlanDefinition, listPlanDefinitions, setLocalPlan } from '../services/subscriptionLocal.js'

const FEATURE_LABELS = {
  jornada_basica: 'Jornada básica',
  pratica_diaria: 'Prática diária',
  timer_ritual: 'Timer ritual',
  mantra_padrao: 'Mantra padrão',
  radio_basica: 'Rádio básica',
  codice_inicial: 'Códice inicial',
  perfil_simples: 'Perfil simples',
  uma_sala_local: 'Uma sala local',
  avatar_basico: 'Avatar básico',
  progresso_local: 'Progresso local',
  mantras_especiais: 'Mantras especiais',
  trilhas_avancadas: 'Trilhas avançadas',
  codice_avancado: 'Códice avançado',
  selos_raros: 'Selos raros',
  rituais_semanais: 'Rituais semanais',
  estatisticas_detalhadas: 'Estatísticas detalhadas',
  salas_tematicas: 'Salas temáticas',
  avatares_simbolicos: 'Avatares simbólicos',
  ranking_premium: 'Ranking premium',
  desafios_de_grupo: 'Desafios de grupo',
  historico_ampliado: 'Histórico ampliado',
  painel_admin: 'Painel admin',
  usuarios_acompanhamento: 'Usuários e acompanhamento',
  auditoria_local: 'Auditoria local',
  bloquear_usuarios: 'Bloquear usuários',
  exportar_backups: 'Exportar backups',
  resetar_ambiente_local: 'Resetar ambiente local',
  preparar_conteudos_premium: 'Preparar conteúdos premium',
}

function labelFeature(featureKey) {
  return FEATURE_LABELS[featureKey] ?? featureKey
}

function featuredItems(plan) {
  if (plan.id === PLAN_IDS.FREE) return ['jornada_basica', 'pratica_diaria', 'timer_ritual', 'progresso_local']
  if (plan.id === PLAN_IDS.PREMIUM) return ['mantras_especiais', 'trilhas_avancadas', 'salas_tematicas', 'ranking_premium']
  return ['painel_admin', 'auditoria_local', 'exportar_backups', 'preparar_conteudos_premium']
}

export default function D7Plans({ userId, onPlanChanged }) {
  const plans = useMemo(() => listPlanDefinitions(), [])
  const [currentPlanId, setCurrentPlanId] = useState(() => getLocalPlan(userId))
  const [feedback, setFeedback] = useState(null)
  const currentPlan = getPlanDefinition(currentPlanId)

  function activatePremiumPreview() {
    const result = setLocalPlan(userId, PLAN_IDS.PREMIUM)
    if (!result.ok) {
      setFeedback({ type: 'error', text: result.message })
      return
    }
    setCurrentPlanId(result.planId)
    setFeedback({ type: 'success', text: 'Prévia local Premium ativada neste navegador.' })
    onPlanChanged?.(result.planId)
  }

  return (
    <section className="content-section d7-plans-section" aria-labelledby="d7-plans-title">
      <div className="section-title">
        <span>Prévia local Premium</span>
        <h2 id="d7-plans-title">Planos Maiindy</h2>
        <p>Plano local de teste para validar a experiência. Assinaturas reais exigirão backend, pagamento seguro e validação server-side.</p>
      </div>

      <div className="current-plan-banner">
        <span className="overline">Status atual</span>
        <strong>{currentPlan.publicName}</strong>
        <small>{currentPlan.message}</small>
        <span className="local-plan-note">Este status vale apenas neste navegador.</span>
      </div>

      {feedback && <div className={`auth-message ${feedback.type}`} role="status">{feedback.text}</div>}

      <div className="d7-plan-grid">
        {plans.map((plan) => {
          const active = plan.id === currentPlanId
          const isPremium = plan.id === PLAN_IDS.PREMIUM
          const isFounder = plan.id === PLAN_IDS.FOUNDER

          return (
            <article key={plan.id} className={active ? 'd7-plan-card active' : 'd7-plan-card'}>
              <div className="d7-plan-head">
                <span className="plan-badge">{plan.badge}</span>
                <strong>{plan.publicName}</strong>
              </div>
              <p>{plan.message}</p>
              <ul>
                {featuredItems(plan).map((feature) => <li key={feature}>{labelFeature(feature)}</li>)}
              </ul>
              <small className="plan-status-line">Status: {active ? 'Plano atual deste usuário' : 'Disponível para prévia local'}</small>
              {isPremium && (
                <button type="button" className="primary-action" onClick={activatePremiumPreview} disabled={active}>
                  {active ? 'Premium local ativo' : 'Ativar Premium local de teste'}
                </button>
              )}
              {isFounder && <small className="local-plan-note">Opção administrativa local. Não aparece como assinatura pública e só deve ser definida pelo admin/owner autenticado neste navegador.</small>}
            </article>
          )
        })}
      </div>
    </section>
  )
}
