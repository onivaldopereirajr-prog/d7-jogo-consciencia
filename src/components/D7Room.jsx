import { useEffect, useState } from 'react'
import { getObserverMode, hasAdminSession } from '../services/adminLocal.js'
import { ensureParticipantPermission, moderateRoomPermission, sendRoomMessage, updateRoomPermission } from '../services/roomLocal.js'

function statusText(value) {
  return { none: 'ouvinte', requested: 'aguardando aprovação', approved: 'autorizado', revoked: 'revogado' }[value] ?? value
}

export default function D7Room({ user, progress, t = (path) => path, onEvent }) {
  const [room, setRoom] = useState(() => ensureParticipantPermission(user, progress))
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
    const next = sendRoomMessage(user, message, progress)
    setRoom(next)
    setMessage('')
  }

  function request(kind) {
    const next = updateRoomPermission(user, { [kind]: 'requested' }, progress)
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
          <span className="overline">Sala local MVP · encontro guiado</span>
          <h3>Palco principal</h3>
          <p><strong>Tema:</strong> presença, estudo simbólico e conversa consciente. Nenhuma câmera ou microfone é ativado automaticamente.</p>
          <div className="room-status-strip"><span>Moderação: {observer ? 'ativa' : 'transparente quando habilitada'}</span><span>Seu estado: fala {statusText(current.speech)} · câmera {statusText(current.camera)}</span></div>
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
            <article key={participant.userId} className="room-participant-card">
              <span className="d7-avatar sm" style={{ '--avatar-color': participant.avatarColor ?? '#20d3ee' }} aria-hidden="true"><strong>{participant.avatarGlyph ?? 'D7'}</strong></span>
              <div><strong>{participant.nickname ?? participant.name}</strong><span>{participant.role}</span><small>Fala: {statusText(participant.speech)} · Câmera: {statusText(participant.camera)}</small></div>
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
            {room.messages.map((item) => (
              <article key={item.id} className="d7-message" aria-label={`Mensagem de ${item.nickname ?? item.author}`}>
                <span className="d7-avatar sm" style={{ '--avatar-color': item.avatarColor ?? '#20d3ee' }} aria-hidden="true"><strong>{item.avatarGlyph ?? 'D7'}</strong></span>
                <div>
                  <header><strong>{item.nickname ?? item.author}</strong><small>{item.role ? `${item.role} · ` : ''}{new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></header>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {isAdmin && (
          <section className="room-moderation" aria-labelledby="room-moderation-title">
            <h3 id="room-moderation-title">Moderação local</h3>
            {Object.values(room.permissions).map((participant) => (
              <article key={participant.userId}>
                <strong>{participant.nickname ?? participant.name}</strong>
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
