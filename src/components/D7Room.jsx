import { useEffect, useState } from 'react'
import { getObserverMode, hasAdminSession } from '../services/adminLocal.js'
import { ensureParticipantPermission, moderateRoomPermission, sendRoomMessage, updateRoomPermission } from '../services/roomLocal.js'

function statusText(value) {
  return { none: 'ouvinte', requested: 'aguardando aprovação', approved: 'autorizado', revoked: 'revogado' }[value] ?? value
}

export default function D7Room({ user, t = (path) => path, onEvent }) {
  const [room, setRoom] = useState(() => ensureParticipantPermission(user))
  const [message, setMessage] = useState('')
  const [cameraPreview, setCameraPreview] = useState(false)
  const isAdmin = hasAdminSession()
  const observer = getObserverMode()
  const current = room.permissions[user.id] ?? { speech: 'none', camera: 'none', role: 'ouvinte' }

  useEffect(() => {
    onEvent?.('view_room')
  }, [onEvent])

  function submit(event) {
    event.preventDefault()
    const next = sendRoomMessage(user, message)
    setRoom(next)
    setMessage('')
  }

  function request(kind) {
    const next = updateRoomPermission(user, { [kind]: 'requested' })
    setRoom(next)
    onEvent?.(kind === 'speech' ? 'room_speech_requested' : 'room_camera_requested')
  }

  function moderate(userId, kind, value) {
    setRoom(moderateRoomPermission(userId, { [kind]: value }))
  }

  return (
    <section className="room-shell content-section" aria-labelledby="room-title">
      <div className="professional-notice">
        <span className="overline">Sala local MVP</span>
        <h2 id="room-title">{t('room.title')}</h2>
        <p>{t('room.notice')}</p>
        {observer && <p><strong>Moderação ativa.</strong> {t('room.moderation')}</p>}
      </div>

      <div className="room-grid">
        <section className="room-stage" aria-label="Palco principal">
          <span className="overline">Sala local MVP</span>
          <h3>Palco principal</h3>
          <p>Apresentador D7: foco, presença e diálogo com transparência. Nenhuma câmera ou microfone é ativado automaticamente.</p>
          <div className="camera-placeholder">
            {cameraPreview ? <strong>Preview local preparado</strong> : <strong>Câmera desativada</strong>}
            <span>{cameraPreview ? 'Placeholder local. Integração real exige clique, permissão e WebRTC futuro.' : 'Clique somente se quiser preparar um preview local.'}</span>
          </div>
          <div className="room-actions">
            <button type="button" className="primary-action" onClick={() => request('speech')} disabled={current.speech === 'requested' || current.speech === 'approved'}>Solicitar fala</button>
            <button type="button" className="ghost-action" onClick={() => request('camera')} disabled={current.camera === 'requested' || current.camera === 'approved'}>Solicitar câmera</button>
            <button type="button" className="ghost-action" onClick={() => setCameraPreview((value) => !value)}>{cameraPreview ? 'Desativar preview' : 'Ativar minha câmera'}</button>
          </div>
        </section>

        <aside className="room-participants" aria-label="Participantes">
          <h3>Participantes</h3>
          {Object.values(room.permissions).map((participant) => (
            <article key={participant.userId}>
              <strong>{participant.name}</strong>
              <span>{participant.role}</span>
              <small>Fala: {statusText(participant.speech)} · Câmera: {statusText(participant.camera)}</small>
            </article>
          ))}
        </aside>

        <section className="room-chat" aria-labelledby="room-chat-title">
          <h3 id="room-chat-title">Chat local</h3>
          <form onSubmit={submit}>
            <label htmlFor="room-message">Mensagem</label>
            <textarea id="room-message" value={message} onChange={(event) => setMessage(event.target.value)} rows="3" maxLength="500" />
            <button type="submit" className="primary-action">Enviar</button>
          </form>
          <div className="room-messages">
            {room.messages.length === 0 && <p>Nenhuma mensagem local ainda.</p>}
            {room.messages.map((item) => <article key={item.id}><strong>{item.author}</strong><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString('pt-BR')}</small></article>)}
          </div>
        </section>

        {isAdmin && (
          <section className="room-moderation" aria-labelledby="room-moderation-title">
            <h3 id="room-moderation-title">Moderação local</h3>
            {Object.values(room.permissions).map((participant) => (
              <article key={participant.userId}>
                <strong>{participant.name}</strong>
                <div>
                  <button type="button" className="mini-action" onClick={() => moderate(participant.userId, 'speech', 'approved')}>Aprovar fala</button>
                  <button type="button" className="mini-action" onClick={() => moderate(participant.userId, 'speech', 'revoked')}>Revogar fala</button>
                  <button type="button" className="mini-action" onClick={() => moderate(participant.userId, 'camera', 'approved')}>Aprovar câmera</button>
                  <button type="button" className="mini-action" onClick={() => moderate(participant.userId, 'camera', 'revoked')}>Revogar câmera</button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </section>
  )
}
