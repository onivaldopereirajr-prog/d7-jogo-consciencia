import { safeGetStorage, safeSetStorage } from '../utils/storageSafe.js'

export const USER_PLANS_KEY = 'd7_user_plans'

export const PLAN_IDS = {
  FREE: 'free',
  PREMIUM: 'premium',
  FOUNDER: 'founder',
}

const FREE_FEATURES = [
  'jornada_basica',
  'pratica_diaria',
  'timer_ritual',
  'mantra_padrao',
  'radio_basica',
  'codice_inicial',
  'perfil_simples',
  'uma_sala_local',
  'avatar_basico',
  'progresso_local',
]

const PREMIUM_FEATURES = [
  ...FREE_FEATURES,
  'mantras_especiais',
  'trilhas_avancadas',
  'codice_avancado',
  'selos_raros',
  'rituais_semanais',
  'estatisticas_detalhadas',
  'salas_tematicas',
  'avatares_simbolicos',
  'ranking_premium',
  'desafios_de_grupo',
  'historico_ampliado',
]

const FOUNDER_FEATURES = [
  ...PREMIUM_FEATURES,
  'painel_admin',
  'usuarios_acompanhamento',
  'auditoria_local',
  'bloquear_usuarios',
  'exportar_backups',
  'resetar_ambiente_local',
  'preparar_conteudos_premium',
]

export const PLAN_DEFINITIONS = [
  {
    id: PLAN_IDS.FREE,
    publicName: 'Caminhante D7',
    message: 'Você entrou no caminho. O primeiro chamado é permanecer.',
    badge: 'Livre local',
    features: FREE_FEATURES,
  },
  {
    id: PLAN_IDS.PREMIUM,
    publicName: 'Guardião D7',
    message: 'Você não está apenas praticando. Você está guardando o fogo da presença.',
    badge: 'Premium local',
    features: PREMIUM_FEATURES,
  },
  {
    id: PLAN_IDS.FOUNDER,
    publicName: 'Administrador Pleno D7',
    message: 'Somente o guardião do sistema local pode administrar este ambiente.',
    badge: 'Founder local',
    features: FOUNDER_FEATURES,
  },
]

const PLAN_BY_ID = Object.fromEntries(PLAN_DEFINITIONS.map((plan) => [plan.id, plan]))
const VALID_PLAN_IDS = new Set(PLAN_DEFINITIONS.map((plan) => plan.id))

function normalizePlanId(planId) {
  return VALID_PLAN_IDS.has(planId) ? planId : PLAN_IDS.FREE
}

function readUserPlans() {
  const plans = safeGetStorage(USER_PLANS_KEY, {})
  return plans && typeof plans === 'object' && !Array.isArray(plans) ? plans : {}
}

export function getLocalPlan(userId) {
  if (!userId) return PLAN_IDS.FREE
  return normalizePlanId(readUserPlans()[userId])
}

export function setLocalPlan(userId, planId) {
  if (!userId) return { ok: false, message: 'Usuário local ausente.' }
  const normalizedPlanId = normalizePlanId(planId)
  const plans = readUserPlans()
  safeSetStorage(USER_PLANS_KEY, { ...plans, [userId]: normalizedPlanId })
  return { ok: true, planId: normalizedPlanId, plan: getPlanDefinition(normalizedPlanId) }
}

export function getPlanDefinition(planId) {
  return PLAN_BY_ID[normalizePlanId(planId)] ?? PLAN_BY_ID[PLAN_IDS.FREE]
}

export function listPlanDefinitions() {
  return PLAN_DEFINITIONS.map((plan) => ({ ...plan, features: [...plan.features] }))
}

export function canAccessFeature(userId, featureKey) {
  const plan = getPlanDefinition(getLocalPlan(userId))
  return plan.features.includes(featureKey)
}

export function getFeatureAccessMap(userId) {
  const currentPlan = getPlanDefinition(getLocalPlan(userId))
  const allFeatures = new Set(PLAN_DEFINITIONS.flatMap((plan) => plan.features))
  return Object.fromEntries([...allFeatures].map((feature) => [feature, currentPlan.features.includes(feature)]))
}

export function isPremiumUser(userId) {
  return [PLAN_IDS.PREMIUM, PLAN_IDS.FOUNDER].includes(getLocalPlan(userId))
}

export function isFounderUser(userId) {
  return getLocalPlan(userId) === PLAN_IDS.FOUNDER
}

export function getPremiumMessage(featureKey) {
  return {
    featureKey,
    title: 'Este recurso pertence ao Círculo dos Guardiões D7.',
    subtitle: 'Continue sua jornada como Caminhante ou ative a prévia local Premium para testar este recurso.',
  }
}
