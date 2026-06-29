import { canAccessFeature, getPremiumMessage } from '../services/subscriptionLocal.js'

export default function PremiumGate({ userId, featureKey, children, compact = false }) {
  if (canAccessFeature(userId, featureKey)) return children
  const message = getPremiumMessage(featureKey)

  return (
    <section className={compact ? 'premium-gate compact' : 'premium-gate'} aria-label="Recurso Premium D7">
      <span className="overline">Círculo dos Guardiões</span>
      <h3>{message.title}</h3>
      <p>{message.subtitle}</p>
      <small>Plano local de teste. Assinaturas reais exigirão backend, pagamento seguro e validação server-side.</small>
    </section>
  )
}
