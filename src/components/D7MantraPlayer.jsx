import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { d7MantraTracks } from '../data/d7MantraTracks.js'
import { getMantraSettings, getRecommendedMantraTrackId, saveMantraSettings } from '../services/mantraAudioService.js'

const D7MantraPlayer = forwardRef(function D7MantraPlayer({ t = (path) => path, selectedDurationMinutes, isPracticeRunning, isPracticePaused, isPracticeCompleted }, ref) {
  const initialSettings = useMemo(() => getMantraSettings(), [])
  const [enabled, setEnabled] = useState(initialSettings.enabled)
  const [volume, setVolume] = useState(initialSettings.volume)
  const [muted, setMuted] = useState(initialSettings.muted)
  const [loop, setLoop] = useState(initialSettings.loop)
  const [selectedTrackId, setSelectedTrackId] = useState(initialSettings.selectedTrackId ?? getRecommendedMantraTrackId(selectedDurationMinutes))
  const [status, setStatus] = useState(t('mantra.ready'))
  const [audioError, setAudioError] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const audioRef = useRef(null)
  const fadeRef = useRef(null)
  const targetVolumeRef = useRef(volume)
  const selectedTrack = d7MantraTracks.find((track) => track.id === selectedTrackId) ?? d7MantraTracks[0]

  function clearFade() {
    if (fadeRef.current) window.clearInterval(fadeRef.current)
    fadeRef.current = null
  }

  function setAudioVolume(nextVolume) {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : Math.min(1, Math.max(0, nextVolume))
  }

  function fadeTo(target, duration = 1400, onDone) {
    const audio = audioRef.current
    if (!audio) return
    clearFade()
    const start = audio.volume
    const steps = 20
    let step = 0
    fadeRef.current = window.setInterval(() => {
      step += 1
      const progress = step / steps
      audio.volume = start + (target - start) * progress
      if (step >= steps) {
        clearFade()
        audio.volume = target
        onDone?.()
      }
    }, duration / steps)
  }

  async function playFromUserGesture() {
    const audio = audioRef.current
    if (!audio || !enabled || !selectedTrack) return { ok: false, reason: 'disabled' }
    try {
      clearFade()
      setAudioVolume(0)
      setAudioError(false)
      await audio.play()
      fadeTo(muted ? 0 : targetVolumeRef.current, 1400)
      setIsAudioPlaying(true)
      setStatus(t('mantra.playing'))
      return { ok: true }
    } catch {
      const hasAudioError = Boolean(audio.error)
      setAudioError(hasAudioError)
      setIsAudioPlaying(false)
      setStatus(hasAudioError ? t('mantra.fileMissing') : t('mantra.blocked'))
      return { ok: false, reason: hasAudioError ? 'missing-file' : 'blocked' }
    }
  }

  function pauseAudio() {
    const audio = audioRef.current
    if (!audio) return
    clearFade()
    audio.pause()
    setAudioVolume(targetVolumeRef.current)
    setIsAudioPlaying(false)
    setStatus(t('mantra.paused'))
  }

  function stopAudio({ reset = false } = {}) {
    const audio = audioRef.current
    if (!audio) return
    clearFade()
    audio.pause()
    if (reset) audio.currentTime = 0
    setAudioVolume(targetVolumeRef.current)
    setIsAudioPlaying(false)
    setStatus(t('mantra.ready'))
  }

  function fadeOutAndStop() {
    const audio = audioRef.current
    if (!audio || audio.paused) return
    fadeTo(0, 2800, () => {
      audio.pause()
      audio.currentTime = 0
      setAudioVolume(targetVolumeRef.current)
      setIsAudioPlaying(false)
      setStatus(t('mantra.completed'))
    })
  }

  useImperativeHandle(ref, () => ({
    start: playFromUserGesture,
    pause: pauseAudio,
    stop: stopAudio,
    fadeOutAndStop,
  }))

  useEffect(() => {
    targetVolumeRef.current = volume
    const audio = audioRef.current
    if (audio) audio.volume = muted ? 0 : Math.min(1, Math.max(0, volume))
    saveMantraSettings({ enabled, volume, muted, loop, selectedTrackId })
  }, [enabled, loop, muted, selectedTrackId, volume])

  useEffect(() => () => clearFade(), [])

  function handleTrackChange(trackId) {
    const wasPlaying = isAudioPlaying
    stopAudio({ reset: true })
    setSelectedTrackId(trackId)
    setAudioError(false)
    setStatus(wasPlaying ? t('mantra.touchToResume') : t('mantra.ready'))
  }

  function handleVolume(value) {
    const next = Math.min(1, Math.max(0, Number(value) / 100))
    setVolume(next)
    if (next > 0 && muted) setMuted(false)
  }

  function handleAudioError() {
    setAudioError(true)
    setIsAudioPlaying(false)
    setStatus(t('mantra.fileMissing'))
  }

  return (
    <section className={`mantra-player ${isAudioPlaying ? 'is-playing' : ''}`} aria-labelledby="mantra-player-title">
      <div className="mantra-player__head">
        <div>
          <span className="overline">{t('mantra.optional')}</span>
          <h3 id="mantra-player-title">{t('mantra.title')}</h3>
          <p>{t('mantra.subtitle')}</p>
        </div>
        <label className="switch-row" htmlFor="mantra-enabled">
          <input id="mantra-enabled" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          <span>{t('mantra.useAudio')}</span>
        </label>
      </div>

      <div className="mantra-track-card">
        <div className="mantra-wave" aria-hidden="true"><span /><span /><span /><span /></div>
        <div>
          <span>{selectedTrack?.mood ?? 'D7'}</span>
          <strong>{selectedTrack?.title ?? t('mantra.title')}</strong>
          <p>{selectedTrack?.subtitle ?? t('mantra.fileMissing')}</p>
        </div>
      </div>

      <audio ref={audioRef} src={selectedTrack?.src} preload="none" loop={loop} muted={muted} onPlay={() => setIsAudioPlaying(true)} onPause={() => setIsAudioPlaying(false)} onError={handleAudioError} />

      <div className="mantra-controls">
        <label htmlFor="mantra-track">{t('mantra.choose')}</label>
        <select id="mantra-track" value={selectedTrackId ?? ''} onChange={(event) => handleTrackChange(event.target.value)} disabled={!enabled || isPracticeRunning}>
          {d7MantraTracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
        </select>
        <button type="button" className="mini-action" onClick={isAudioPlaying ? pauseAudio : playFromUserGesture} disabled={!enabled} aria-label={isAudioPlaying ? t('mantra.pause') : t('mantra.play')}>
          {isAudioPlaying ? t('mantra.pause') : t('mantra.play')}
        </button>
        <button type="button" className={muted ? 'mini-action active' : 'mini-action'} onClick={() => setMuted((value) => !value)} disabled={!enabled} aria-pressed={muted} aria-label={t('mantra.mute')}>
          {muted ? t('mantra.muted') : t('mantra.sound')}
        </button>
        <label className="mantra-volume" htmlFor="mantra-volume">
          <span>{t('mantra.volume')}</span>
          <input id="mantra-volume" type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={(event) => handleVolume(event.target.value)} disabled={!enabled} />
          <strong>{Math.round(volume * 100)}%</strong>
        </label>
        <label className="switch-row" htmlFor="mantra-loop">
          <input id="mantra-loop" type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} disabled={!enabled} />
          <span>{t('mantra.loop')}</span>
        </label>
      </div>

      <div className="mantra-status" role="status" aria-live="polite">
        <span>{audioError ? t('mantra.fileMissing') : status}</span>
        {isPracticePaused && <small>{t('mantra.pausedWithTimer')}</small>}
        {isPracticeCompleted && <small>{t('mantra.completed')}</small>}
      </div>
    </section>
  )
})

export default D7MantraPlayer
