import { useRef, useState } from 'react'

const entranceAssets = {
  video: '/assets/d7/entrance/d7-bg-loop.mp4',
  poster: '/assets/d7/entrance/d7-bg-poster.jpg',
  logo: '/assets/d7/entrance/logo-d7.svg',
}

const entranceSymbols = ['A1', 'A7', 'B7', 'C7', 'D7']

function D7CinematicEntrance({ onComplete, onSkip }) {
  const videoRef = useRef(null)
  const [callVisible, setCallVisible] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundMessage, setSoundMessage] = useState('')
  const [mediaFailed, setMediaFailed] = useState(false)

  function completeEntrance(delay = 950) {
    window.setTimeout(() => onComplete?.(), delay)
  }

  function handleCall() {
    setCallVisible(true)
    completeEntrance()
  }

  function handleSkip() {
    onSkip?.()
  }

  async function handleSoundToggle() {
    const video = videoRef.current
    if (!video) return

    if (soundEnabled) {
      video.muted = true
      setSoundEnabled(false)
      setSoundMessage('')
      return
    }

    try {
      video.volume = 0.5
      video.muted = false
      await video.play()
      setSoundEnabled(true)
      setSoundMessage('')
    } catch {
      video.muted = true
      setSoundEnabled(false)
      setSoundMessage('Toque novamente para ativar o som.')
    }
  }

  return (
    <main className="d7-entrance" aria-label="Entrada cinematográfica do D7">
      <video
        ref={videoRef}
        className="d7-entrance-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={entranceAssets.poster}
        aria-hidden="true"
        onError={() => setMediaFailed(true)}
      >
        <source src={entranceAssets.video} type="video/mp4" />
      </video>

      <div className="d7-entrance-fallback" aria-hidden="true" />
      <div className="d7-entrance-overlay" aria-hidden="true" />
      <div className="d7-entrance-particles" aria-hidden="true" />

      <button
        type="button"
        className="d7-entrance-sound"
        onClick={handleSoundToggle}
        aria-label={soundEnabled ? 'Silenciar vídeo de entrada' : 'Ativar som do vídeo de entrada'}
      >
        {soundEnabled ? 'Silenciar' : 'Ativar som'}
      </button>

      <div className="d7-entrance-symbols" aria-hidden="true">
        {entranceSymbols.map((symbol) => <span key={symbol} className={`d7-entrance-symbol symbol-${symbol.toLowerCase()}`}>{symbol}</span>)}
      </div>

      <section className="d7-entrance-content" aria-labelledby="d7-entrance-title">
        <div className="d7-entrance-portal" aria-hidden="true" />
        <img className="d7-entrance-logo" src={entranceAssets.logo} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
        <span className="overline">28 dias de presença</span>
        <h1 id="d7-entrance-title">D7: O Jogo da Consciência</h1>
        <p className="d7-entrance-subtitle">Domine sua realidade interior.</p>
        <p className="d7-entrance-manifesto">O desafio não é fazer. O desafio é não ignorar.</p>
        <p className="d7-entrance-support">28 dias. 4 semanas. Um ciclo de presença.</p>

        <div className="d7-entrance-actions" aria-label="Ações da entrada D7">
          <button type="button" className="d7-entrance-primary" onClick={handleCall}>Responder ao Chamado</button>
          <button type="button" className="d7-entrance-secondary" onClick={handleSkip}>Entrar no D7</button>
        </div>

        {(mediaFailed || soundMessage) && (
          <p className="d7-entrance-note" role="status">
            {soundMessage || 'Vídeo indisponível agora. A entrada continua com fundo visual seguro.'}
          </p>
        )}
      </section>

      <aside className={callVisible ? 'd7-entrance-call is-visible' : 'd7-entrance-call'} role="status" aria-live="polite" aria-hidden={!callVisible}>
        <p>Feche os olhos. O jogo começou.</p>
      </aside>
    </main>
  )
}

export default D7CinematicEntrance
