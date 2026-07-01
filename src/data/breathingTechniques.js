export const DEFAULT_BREATHING_TECHNIQUE_ID = 'triangular-default'

export const fallbackBreathingTechnique = {
  id: DEFAULT_BREATHING_TECHNIQUE_ID,
  name: 'Triangular Maiindy',
  shortName: 'Triangular',
  use: 'Preparação simples para entrar na sessão oficial com presença.',
  steps: [
    { id: 'inhale', label: 'Inspirar', seconds: 4, detail: 'Prepare-se. Sente-se ou deite-se.' },
    { id: 'hold', label: 'Segurar', seconds: 4, detail: 'Feche os olhos quando iniciar o timer.' },
    { id: 'exhale', label: 'Expirar', seconds: 4, detail: 'A prática principal é cumprir o tempo oficial.' },
  ],
}

export const breathingTechniques = [
  {
    id: '4-7-8',
    name: '4-7-8',
    shortName: '4-7-8',
    use: 'Pode ajudar a relaxar antes de dormir ou acalmar a mente.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 4 },
      { id: 'hold', label: 'Segurar', seconds: 7 },
      { id: 'exhale', label: 'Expirar', seconds: 8 },
    ],
  },
  {
    id: 'box-4',
    name: 'Respiração Quadrada 4-4-4-4',
    shortName: 'Quadrada 4-4-4-4',
    use: 'Pode apoiar foco, estabilidade e controle do estresse.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 4 },
      { id: 'hold', label: 'Segurar', seconds: 4 },
      { id: 'exhale', label: 'Expirar', seconds: 4 },
      { id: 'hold-empty', label: 'Segurar', seconds: 4 },
    ],
  },
  {
    id: '5-5',
    name: '5-5',
    shortName: '5-5',
    use: 'Pode apoiar equilíbrio do sistema nervoso e calma.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 5 },
      { id: 'exhale', label: 'Expirar', seconds: 5 },
    ],
  },
  {
    id: '5-5-5-5',
    name: '5-5-5-5',
    shortName: '5-5-5-5',
    use: 'Versão mais lenta da respiração quadrada.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 5 },
      { id: 'hold', label: 'Segurar', seconds: 5 },
      { id: 'exhale', label: 'Expirar', seconds: 5 },
      { id: 'hold-empty', label: 'Segurar', seconds: 5 },
    ],
  },
  {
    id: '6-3-6-3',
    name: '6-3-6-3',
    shortName: '6-3-6-3',
    use: 'Pode apoiar equilíbrio entre relaxamento e controle.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 6 },
      { id: 'hold', label: 'Segurar', seconds: 3 },
      { id: 'exhale', label: 'Expirar', seconds: 6 },
      { id: 'hold-empty', label: 'Segurar', seconds: 3 },
    ],
  },
  {
    id: '6-6',
    name: '6-6',
    shortName: '6-6',
    use: 'Pode apoiar relaxamento profundo e redução do ritmo corporal percebido.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 6 },
      { id: 'exhale', label: 'Expirar', seconds: 6 },
    ],
  },
  {
    id: '3-3-6',
    name: '3-3-6',
    shortName: '3-3-6',
    use: 'Expiração mais longa que pode ajudar a acalmar rapidamente.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 3 },
      { id: 'hold', label: 'Segurar', seconds: 3 },
      { id: 'exhale', label: 'Expirar', seconds: 6 },
    ],
  },
  {
    id: '4-6',
    name: '4-6',
    shortName: '4-6',
    use: 'Simples e eficaz como apoio para acalmar.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 4 },
      { id: 'exhale', label: 'Expirar', seconds: 6 },
    ],
  },
  {
    id: '7-11',
    name: '7-11',
    shortName: '7-11',
    use: 'Técnica forte de relaxamento para preparação lenta.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 7 },
      { id: 'exhale', label: 'Expirar', seconds: 11 },
    ],
  },
  {
    id: '2-4',
    name: '2-4',
    shortName: '2-4',
    use: 'Método calmante para iniciantes.',
    steps: [
      { id: 'inhale', label: 'Inspirar', seconds: 2 },
      { id: 'exhale', label: 'Expirar', seconds: 4 },
    ],
  },
]

export function getBreathingTechnique(id) {
  return breathingTechniques.find((technique) => technique.id === id) ?? fallbackBreathingTechnique
}
