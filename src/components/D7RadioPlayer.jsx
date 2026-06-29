import { useEffect, useMemo, useRef, useState } from 'react'
import { d7RadioTracks } from '../data/d7RadioTracks.js'
import { getNextTrackIndex, getPreviousTrackIndex, getRadioSettings, getTrackIndex, saveRadioSettings } from '../services/radioService.js'

export default function D7RadioPlayer({ t = (path) => path, compact = false }) {
  const initialSettings = useMemo(() => getRadioSettings(), [])
  const [trackIndex, setTrackIndex] = useState(() => getTrackIndex(initialSettings.lastTrackId))
  const [volume, setVolume] = useState(initialSettings.volume)
  const [muted, setMuted] = useState(initialSettings.muted)
  const [repeat, setRepeat] = useState(initialSettings.repeat)
  const [shuffle, setShuffle] = useState(initialSettings.shuffle)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState(t('radio.touchNotice'))
  const [trackError, setTrackError] = useState(false)
  const audioRef = useRef(null)
  const tracks = d7RadioTracks
  const currentTrack = tracks[trackIndex] ?? null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
    saveRadioSettings({ volume, muted, repeat, shuffle, lastTrackId: currentTrack?.id ?? null })
  }, [currentTrack?.id, muted, repeat, shuffle, volume])

  async function playRadio() {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    try {
      setIsLoading(true)
      setTrackError(false)
      await audio.play()
      setIsPlaying(true)
      setStatus(t('radio.nowPlaying'))
    } catch {
      setIsPlaying(false)
      setStatus(t('radio.playBlocked'))
    } finally {
      setIsLoading(false)
    }
  }

  function pauseRadio() {
    audioRef.current?.pause()
    setIsPlaying(false)
    setStatus(t('radio.paused'))
  }

  function togglePlay() {
    if (isPlaying) pauseRadio()
    else playRadio()
  }

  function changeTrack(nextIndex, shouldPlay = isPlaying) {
    setTrackIndex(nextIndex)
    setTrackError(false)
    setStatus(t('radio.trackChanged'))
    if (!shouldPlay) return
    window.setTimeout(() => {
      playRadio()
    }, 80)
  }

  function nextTrack(shouldPlay = isPlaying) {
    changeTrack(getNextTrackIndex(trackIndex, shuffle), shouldPlay)
  }

  function previousTrack() {
    changeTrack(getPreviousTrackIndex(trackIndex), isPlaying)
  }

  function handleEnded() {
    if (repeat || shuffle) {
      nextTrack(true)
      return
    }
    setIsPlaying(false)
    setStatus(t('radio.paused'))
  }

  function handleAudioError() {
    setIsLoading(false)
    setIsPlaying(false)
    setTrackError(true)
    setStatus(t('radio.noMusic'))
  }

  function handleWaiting() {
    setIsLoading(true)
    setStatus('Carregando áudio local...')
  }

  function handleCanPlay() {
    setIsLoading(false)
    if (!trackError && !isPlaying) setStatus(t('radio.touchNotice'))
  }

  function handleVolumeChange(value) {
    const next = Number(value) / 100
    setVolume(Math.min(1, Math.max(0, next)))
    if (next > 0 && muted) setMuted(false)
  }

  if (!tracks.length || !currentTrack) {
    return (
      <section className="d7-radio" aria-labelledby="d7-radio-title">
        <div className="d7-radio-card">
          <span className="overline">{t('radio.localLive')}</span>
          <h2 id="d7-radio-title">{t('radio.title')}</h2>
          <p>{t('radio.noMusic')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className={["d7-radio", compact ? "d7-radio--compact" : "", isPlaying ? "is-playing" : "", isLoading ? "is-loading" : ""].filter(Boolean).join(" ")} aria-labelledby="d7-radio-title">
      <div className="d7-radio-card">
        <div className="d7-radio-head">
          <div>
            <span className="overline">{t('radio.localLive')}</span>
            <h2 id="d7-radio-title" className="d7-radio-title">{t('radio.title')}</h2>
            <p>{t('radio.subtitle')}</p>
          </div>
          <div className="d7-radio-badges" aria-label="Status da Rádio D7">
            <span>{t('radio.localLive')}</span>
            <span>{t('radio.presenceMode')}</span>
            <span>MVP</span>
          </div>
        </div>

        <div className="d7-radio-wave" aria-hidden="true">
          <span /><span /><span /><span />
        </div>

        <div className="d7-radio-track">
          <span>{currentTrack.mood}</span>
          <strong>{currentTrack.title}</strong>
          <p>{currentTrack.subtitle}</p>
          <small>{trackError ? t('radio.noMusic') : currentTrack.durationLabel}</small>
        </div>

        <div className="d7-radio-playlist" aria-label="Músicas disponíveis na Rádio D7">
          {tracks.map((track, index) => (
            <button key={track.id} type="button" className={index === trackIndex ? 'mini-action active' : 'mini-action'} onClick={() => changeTrack(index, isPlaying)}>
              {track.title}
            </button>
          ))}
        </div>

        <audio
          ref={audioRef}
          src={currentTrack.src}
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onEnded={handleEnded}
          onError={handleAudioError}
        />

        <div className="d7-radio-controls" aria-label="Controles da Rádio D7">
          <button type="button" className="ghost-action" onClick={previousTrack} aria-label={t('radio.previous')}>‹</button>
          <button type="button" className="primary-action" onClick={togglePlay} aria-label={isPlaying ? t('radio.pause') : t('radio.play')}>
            {isPlaying ? t('radio.pause') : t('radio.play')}
          </button>
          <button type="button" className="ghost-action" onClick={() => nextTrack()} aria-label={t('radio.next')}>›</button>
          <button type="button" className={repeat ? 'mini-action active' : 'mini-action'} onClick={() => setRepeat((value) => !value)} aria-pressed={repeat} aria-label={t('radio.repeat')}>↻</button>
          <button type="button" className={shuffle ? 'mini-action active' : 'mini-action'} onClick={() => setShuffle((value) => !value)} aria-pressed={shuffle} aria-label={t('radio.shuffle')}>⤨</button>
          <button type="button" className={muted ? 'mini-action active' : 'mini-action'} onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? t('radio.unmute') : t('radio.mute')}>{muted ? t('radio.muted') : t('radio.sound')}</button>
        </div>

        <label className="d7-radio-volume" htmlFor="d7-radio-volume">
          <span>{t('radio.volume')}</span>
          <input id="d7-radio-volume" type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={(event) => handleVolumeChange(event.target.value)} />
          <strong>{Math.round(volume * 100)}%</strong>
        </label>

        <div className="d7-radio-status" role="status" aria-live="polite">
          <div className="d7-radio-equalizer" aria-hidden="true"><span /><span /><span /></div>
          <p>{trackError ? 'Arquivo de áudio não encontrado. Confira os MP3 autorizados em public/assets/audio/radio/.' : status}</p>
        </div>
      </div>
    </section>
  )
}
