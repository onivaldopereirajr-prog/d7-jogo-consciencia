export const RADIO_TRACKS = [
  {
    id: 'd7-radio-prosperidade',
    title: 'Mantra da Prosperidade',
    subtitle: 'Foco, presença e prosperidade simbólica D7',
    artist: 'D7',
    src: '/assets/audio/radio/d7-radio-prosperidade.mp3',
    category: 'radio',
    mood: 'presença',
    durationLabel: 'faixa local',
  },
]

export const MANTRA_TRACKS = [
  {
    id: 'mantra-da-prosperidade',
    title: 'Mantra da Prosperidade',
    subtitle: 'Som ritual para foco, presença e prosperidade simbólica',
    artist: 'D7',
    src: '/assets/audio/mantras/mantra-da-prosperidade.mp3',
    category: 'mantra',
    recommendedFor: [1, 3, 7, 10, 21, 108],
    mood: 'presença',
  },
]

export const DEFAULT_MANTRA_TRACK_ID = MANTRA_TRACKS[0]?.id ?? null
export const DEFAULT_RADIO_TRACK_ID = RADIO_TRACKS[0]?.id ?? null
