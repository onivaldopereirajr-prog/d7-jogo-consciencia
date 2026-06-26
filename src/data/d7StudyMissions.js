export const d7StudyPhases = [
  {
    id: 'phase-a',
    title: 'Fase A',
    subtitle: 'Letras e Sons',
    summary: 'Entrar pela porta do alfabeto, do som e da primeira palavra.',
    requiredCards: ['lib-intro', 'he-alef', 'sa-om', 'sa-a', 'he-bet'],
    reward: { xp: 12, sparks: 2, d7t: 3, rankingPoints: 20 },
    titleReward: 'Leitor de Alef',
  },
  {
    id: 'phase-b',
    title: 'Fase B',
    subtitle: 'Palavra e Presença',
    summary: 'Conectar luz, paz, sopro e presença com prática curta.',
    requiredCards: ['hw-or', 'sa-shanti', 'hw-ruach', 'sa-prana'],
    reward: { xp: 16, sparks: 2, d7t: 4, rankingPoints: 28 },
    titleReward: 'Guardião do Om',
  },
  {
    id: 'phase-c',
    title: 'Fase C',
    subtitle: 'Árvore e Respiração',
    summary: 'Estudar sefirot, colunas e uma visualização simbólica.',
    requiredCards: ['kb-keter', 'kb-chesed', 'kb-tiferet', 'kb-three-pillars', 'kb-tree'],
    reward: { xp: 24, sparks: 3, d7t: 7, rankingPoints: 40 },
    titleReward: 'Peregrino da Árvore',
  },
  {
    id: 'phase-d',
    title: 'Fase D',
    subtitle: 'Integração e Ciclo',
    summary: 'Unir letras, sons, sefirot, mapa simbólico e síntese final.',
    requiredCards: ['he-tav', 'sa-dhyana', 'kb-malkhut', 'kb-ritual', 'kb-visualization', 'kb-dream'],
    reward: { xp: 35, sparks: 4, d7t: 10, rankingPoints: 60 },
    titleReward: 'Portador do Código D7',
  },
]

export const d7StudyChallengeTemplates = [
  {
    id: 'study-alef',
    title: 'Card Alef',
    prompt: 'Escreva uma palavra que represente começo.',
    reward: { xp: 3, sparks: 0, d7t: 1, rankingPoints: 2 },
  },
  {
    id: 'study-om',
    title: 'Card Om',
    prompt: 'Permaneça 1 minuto em silêncio.',
    reward: { xp: 3, sparks: 0, d7t: 1, rankingPoints: 2 },
  },
  {
    id: 'study-or',
    title: 'Card Or',
    prompt: 'Registre onde você percebeu luz hoje.',
    reward: { xp: 3, sparks: 0, d7t: 1, rankingPoints: 2 },
  },
  {
    id: 'study-shanti',
    title: 'Card Śānti',
    prompt: 'Escreva uma frase de paz interior.',
    reward: { xp: 3, sparks: 0, d7t: 1, rankingPoints: 2 },
  },
  {
    id: 'study-keter',
    title: 'Card Keter',
    prompt: 'Defina uma intenção superior para sua jornada.',
    reward: { xp: 4, sparks: 0, d7t: 1, rankingPoints: 3 },
  },
  {
    id: 'study-yesod',
    title: 'Card Yesod',
    prompt: 'Escolha uma ação prática para firmar sua presença.',
    reward: { xp: 4, sparks: 0, d7t: 1, rankingPoints: 3 },
  },
]
