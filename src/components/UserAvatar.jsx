import { getUserAvatarProfile } from '../services/avatarService.js'
import { playerLevel } from '../utils/gameState.js'

export default function UserAvatar({ user, progress, size = 'md', showMeta = false, role = null }) {
  const avatar = getUserAvatarProfile(user, progress)
  const name = progress?.profile?.name ?? user?.name ?? 'Visitante D7'
  const login = user?.login ?? 'visitante'
  const level = playerLevel(progress?.xp ?? 0)
  return (
    <div className={`d7-avatar-wrap ${showMeta ? 'with-meta' : ''}`} aria-label={`Avatar D7 de ${name}: ${avatar.label}`}>
      <span className={`d7-avatar ${size}`} style={{ '--avatar-color': avatar.color }} aria-hidden="true">
        <strong>{avatar.glyph}</strong>
      </span>
      {showMeta && (
        <span className="d7-avatar-meta">
          <strong>{name}</strong>
          <small>{role ? `${role} · ` : ''}{login} · Nv. {level}</small>
        </span>
      )}
    </div>
  )
}
