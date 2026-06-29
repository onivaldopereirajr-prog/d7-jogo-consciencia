import { useEffect, useMemo, useState } from 'react'
import { getObserverMode, hasAdminSession } from '../services/adminLocal.js'
import { createPlayerRoom, ensureParticipantPermission, getPlayerRoomsState, moderateRoomPermission, sendPlayerRoomMessage, sendRoomMessage, setActivePlayerRoom, updateRoomPermission } from '../services/roomLocal.js'
import { sanitizeMessage } from '../utils/sanitizeText.js'

function statusText(value) {
  return { none: 'ouvinte', requested: 'aguardando aprovação', approved: 'autorizado', revoked: 'revogado' }[value] ?? value
}

export default function D7Room({ user, progress, t = (path) => path, onEvent }) {
  const [room, setRoom] = useState(() => ensureParticipantPermission(user, progress))
  const [playerRoomsState, setPlayerRoomsState] = useState(() => getPlayerRoomsState())
  const [message, setMessage] = useState('')
  const [localRoomMessage, setLocalRoomMessage] = useState('')
  const [roomNotice, setRoomNotice] = useState(null)
  const [cameraPreview, setCameraPreview] = useState(false)
  const [roomForm, setRoomForm] = useState({ name: '', description: '', theme: '', icon: 'D7', playerName: user?.name ?? '', playerAvatar: progress?.avatarGlyph ?? 'D7' })
  const isAdmin = hasAdminSession()
  const observer = getObserverMode()
  const current = room.permissions[user.id] ?? { speech: 'none', camera: 'none', role: 'ouvinte' }
  const activePlayerRoom = useMemo(() => playerRoomsState.rooms.find((item) => item.id === playerRoomsState.activeRoomId) ?? null, [playerRoomsState])

  useEffect(() => {
    onEvent?.('view_room')
  }, [onEvent])

  function submit(event) {
    event.preventDefault()
    if (!sanitizeMessage(message)) {
      setRoomNotice('Mensagem vazia ou inválida.')
      return
    }
    const next = sendRoomMessage(user, message, progress)
    setRoom(next)
    onEvent?.('room_message_sent', { length: sanitizeMessage(message).length, roomType: 'main' })
    setRoomNotice(null)
    setMessage('')
  }

  function submitCreateRoom(event) {
    event.preventDefault()
    const next = createPlayerRoom(user, roomForm, progress)
    setPlayerRoomsState(next)
    onEvent?.('room_created_local', { name: roomForm.name, theme: roomForm.theme })
    setRoomForm((currentForm) => ({ ...currentForm, name: '', description: '', theme: '', icon: 'D7' }))
  }

  function submitLocalRoomMessage(event) {
    event.preventDefault()
    if (!activePlayerRoom) return
    if (!sanitizeMessage(localRoomMessage)) {
      setRoomNotice('Mensagem vazia ou inválida.')
      return
    }
    const next = sendPlayerRoomMessage(activePlayerRoom.id, user, localRoomMessage, roomForm, progress)
    setPlayerRoomsState(next)
    onEvent?.('room_message_sent', { length: sanitizeMessage(localRoomMessage).length, roomType: 'player', roomId: activePlayerRoom.id })
    setRoomNotice(null)
    setLocalRoomMessage('')
  }

  function request(kind) {
    const next = updateRoomPermission(user, { [kind]: 'requested' }, progress)
    setRoom(next)
    onEvent?.(kind === 'speech' ? 'room_speech_requested' : 'room_camera_requested', { permission: kind })
  }

  function moderate(userId, kind, value) {
    setRoom(moderateRoomPermission(userId, { [kind]: value }))
    onEvent?.('room_permission_changed', { targetUserId: userId, permission: kind, value })
  }

  function togglePreview() {
    setCameraPreview((value) => {
      onEvent?.('room_preview_toggled', { enabled: !value })
      return !value
    })
  }

  function selectPlayerRoom(roomId) {
    setPlayerRoomsState(setActivePlayerRoom(roomId))
  }

  return (
    <section className="room-shell content-section" aria-labelledby="room-title">
      <div className="professional-notice">
        <span className="overline">Sala local MVP</span>
        <h2 id="room-title">{t('room.title')}</h2>
        <p>{t('room.notice')}</p>
        <p>Protótipo local: salas e mensagens ficam salvas apenas neste navegador até existir backend.</p>
        {observer && <p><strong>Moderação ativa.</strong> {t('room.moderation')}</p>}
        {roomNotice && <div className="auth-message error" role="status">{roomNotice}</div>}
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
            <button type="button" className="ghost-action" onClick={togglePreview}>{cameraPreview ? 'Desativar preview' : 'Ativar minha câmera'}</button>
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

        <section className="room-player-rooms" aria-labelledby="player-rooms-title">
          <div className="control-panel-head">
            <div>
              <span className="overline">Salas D7</span>
              <h3 id="player-rooms-title">Salas criadas por jogadores</h3>
            </div>
          </div>
          <p className="control-note">Protótipo local: nomes, avatares, salas e mensagens são sanitizados e salvos apenas neste navegador.</p>

          <form className="room-create-form" onSubmit={submitCreateRoom}>
            <label>Nome da sala<input value={roomForm.name} onChange={(event) => setRoomForm((value) => ({ ...value, name: event.target.value }))} maxLength="50" /></label>
            <label>Descrição curta<input value={roomForm.description} onChange={(event) => setRoomForm((value) => ({ ...value, description: event.target.value }))} maxLength="160" /></label>
            <label>Tema simbólico<input value={roomForm.theme} onChange={(event) => setRoomForm((value) => ({ ...value, theme: event.target.value }))} maxLength="50" /></label>
            <label>Ícone da sala<input value={roomForm.icon} onChange={(event) => setRoomForm((value) => ({ ...value, icon: event.target.value }))} maxLength="8" /></label>
            <label>Nome personalizado<input value={roomForm.playerName} onChange={(event) => setRoomForm((value) => ({ ...value, playerName: event.target.value }))} maxLength="40" /></label>
            <label>Avatar local<input value={roomForm.playerAvatar} onChange={(event) => setRoomForm((value) => ({ ...value, playerAvatar: event.target.value }))} maxLength="8" /></label>
            <button type="submit" className="primary-action">Criar sala local</button>
          </form>

          <div className="player-room-list">
            {playerRoomsState.rooms.map((item) => (
              <button key={item.id} type="button" className={item.id === playerRoomsState.activeRoomId ? 'player-room-card active' : 'player-room-card'} onClick={() => selectPlayerRoom(item.id)}>
                <strong>{item.icon} {item.name}</strong>
                <span>{item.theme} · {item.messages?.length ?? 0} mensagem(ns)</span>
              </button>
            ))}
            {playerRoomsState.rooms.length === 0 && <p className="d7-empty-state">Nenhuma sala local criada ainda.</p>}
          </div>

          {activePlayerRoom && (
            <div className="player-room-chat">
              <h4>{activePlayerRoom.icon} {activePlayerRoom.name}</h4>
              <p>{activePlayerRoom.description}</p>
              <form onSubmit={submitLocalRoomMessage}>
                <label htmlFor="player-room-message">Mensagem na sala local</label>
                <textarea id="player-room-message" value={localRoomMessage} onChange={(event) => setLocalRoomMessage(event.target.value)} rows="3" maxLength="500" />
                <button type="submit" className="primary-action">Enviar na sala</button>
              </form>
              <div className="room-messages">
                {(activePlayerRoom.messages ?? []).length === 0 && <p>Nenhuma mensagem nesta sala.</p>}
                {(activePlayerRoom.messages ?? []).map((item) => (
                  <article key={item.id} className="d7-message" aria-label={`Mensagem de ${item.nickname}`}>
                    <span className="d7-avatar sm" aria-hidden="true"><strong>{item.avatarGlyph ?? 'D7'}</strong></span>
                    <div><header><strong>{item.nickname}</strong><small>{new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></header><p>{item.text}</p></div>
                  </article>
                ))}
              </div>
            </div>
          )}
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
