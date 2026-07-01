export const weeks = [
  { id: 'A', name: 'Iniciante', week: 1, minutes: 1, color: '#20d3ee', seal: '△', intent: 'Início suave: construa o hábito de fechar os olhos diariamente, sem pressa.' },
  { id: 'B', name: 'Consolidação', week: 2, minutes: 2, color: '#d4af37', seal: '◈', intent: 'Evolução: aumente o tempo para aprofundar o foco.' },
  { id: 'C', name: 'Avanço', week: 3, minutes: 3, color: '#a78bfa', seal: '⬡', intent: 'Intensificação: sinta o compromisso se solidificar.' },
  { id: 'D', name: 'Maestria', week: 4, minutes: 4, color: '#48d388', seal: '✺', intent: 'Desafio: teste sua resiliência em sessões mais longas.' },
  { id: 'E', name: 'Culminação', week: 5, minutes: 5, color: '#ffcf5a', seal: '✦', intent: 'Grande Final: culmine com maestria e receba a Medalha de Honra em E7.' },
]

export const OFFICIAL_JOURNEY_DAYS = weeks.length * 7
export const HONOR_MEDAL_ID = 'honor-first-phase'
export const HONOR_MEDAL_NAME = 'Medalha de Honra da Primeira Fase'

export const navItems = [
  { id: 'home', label: 'Home', icon: '◇' },
  { id: 'jornada', label: 'Jornada', icon: '◆' },
  { id: 'pratica', label: 'Prática', icon: '◉' },
  { id: 'codice', label: 'Códice', icon: '✦' },
  { id: 'ranking', label: 'Ranking', icon: '▲' },
  { id: 'perfil', label: 'Perfil', icon: '☉' },
  { id: 'circulos', label: 'Círculos', icon: '◎' },
]

export const missions = {
  daily: [
    { id: 'daily-practice', title: 'Concluir a prática do dia', reward: '+55 XP', type: 'practice' },
    { id: 'daily-word', title: 'Registrar uma palavra', reward: '+2 Centelhas', type: 'word' },
    { id: 'daily-study', title: 'Estudar 1 carta do Códice', reward: '+1 carta', type: 'study' },
    { id: 'daily-journey', title: 'Abrir a Jornada', reward: '+10 XP', type: 'visit', view: 'jornada' },
    { id: 'daily-ranking', title: 'Visitar o Ranking', reward: '+10 XP', type: 'visit', view: 'ranking' },
  ],
  weekly: [
    { id: 'weekly-a7', title: 'Completar o sétimo nível de uma categoria', reward: 'Selo de semana' },
    { id: 'weekly-hebrew-3', title: 'Desbloquear 3 cartas hebraicas', reward: 'Fragmento hebraico' },
    { id: 'weekly-sanskrit-3', title: 'Desbloquear 3 cartas sânscritas', reward: 'Fragmento sânscrito' },
    { id: 'weekly-code', title: 'Resolver 1 código', reward: 'Chave simbólica' },
    { id: 'weekly-portal', title: 'Abrir 1 portal', reward: 'Carta rara' },
  ],
}

export const portals = [
  { id: 'portal-a', week: 'A', name: 'Portal A: Iniciante', seal: '△', phrase: 'Toda jornada começa quando o ruído perde autoridade.', reward: '+120 XP · Carta rara Alef-Om', rareCard: 'Alef-Om' },
  { id: 'portal-b', week: 'B', name: 'Portal B: Consolidação', seal: '◈', phrase: 'Permanecer é vencer a negociação invisível.', reward: '+160 XP · Carta rara Or-Śānti', rareCard: 'Or-Śānti' },
  { id: 'portal-c', week: 'C', name: 'Portal C: Avanço', seal: '⬡', phrase: 'O observador não precisa empurrar o mundo.', reward: '+200 XP · Carta rara Ruach-Prāṇa', rareCard: 'Ruach-Prāṇa' },
  { id: 'portal-d', week: 'D', name: 'Portal D: Maestria', seal: '✺', phrase: 'Quando o ciclo fecha, a presença deixa uma assinatura.', reward: '+280 XP · Carta rara Selo D7', rareCard: 'Selo D7' },
  { id: 'portal-e', week: 'E', name: 'Portal E: Culminação', seal: '✦', phrase: '35 dias. 5 categorias. Um compromisso cumprido.', reward: 'Medalha de Honra da Primeira Fase', rareCard: 'Medalha de Honra' },
]

export const codes = [
  { id: 'code-alef-om', name: 'Código Alef-Om', glyph: 'אॐ', unlock: 'Desbloqueie Alef e Om.', bridge: 'bridge-alef-om' },
  { id: 'code-or-shanti', name: 'Código Or-Śānti', glyph: 'אורशान्ति', unlock: 'Desbloqueie Or e Śānti.', bridge: 'bridge-or-shanti' },
  { id: 'code-ruach-prana', name: 'Código Ruach-Prāṇa', glyph: 'רוחप्राण', unlock: 'Desbloqueie Ruach e Prāṇa.', bridge: 'bridge-ruach-prana' },
  { id: 'code-emet-dhyana', name: 'Código Emet-Dhyāna', glyph: 'אמתध्यान', unlock: 'Desbloqueie Emet e Dhyāna.', bridge: 'bridge-emet-dhyana' },
  { id: 'seal-d7', name: 'Selo D7', glyph: 'D7', unlock: 'Complete D7.', bridge: 'bridge-d7' },
  { id: 'seal-return', name: 'Selo do Retorno', glyph: '↺', unlock: 'Retorne conscientemente após quebra de sequência.' },
  { id: 'seal-stay', name: 'Selo da Permanência', glyph: '◉', unlock: 'Mantenha 3 dias de sequência.' },
  { id: 'seal-cycle', name: 'Selo do Ciclo Completo', glyph: '◎', unlock: 'Abra os portais da jornada.' },
  { id: HONOR_MEDAL_ID, name: HONOR_MEDAL_NAME, glyph: '✦', unlock: 'Complete E7 na Primeira Fase.' },
]

export const mockPlayers = [
  { name: 'Maya Voss', title: 'Oráculo Urbano', xp: 1120, streak: 9, cards: 18, portals: 3, codes: 4 },
  { name: 'Caio Nox', title: 'Sentinela do Nada', xp: 980, streak: 7, cards: 15, portals: 2, codes: 3 },
  { name: 'Lia Kairós', title: 'Cartógrafa Dual', xp: 760, streak: 5, cards: 12, portals: 1, codes: 2 },
  { name: 'Ivo Rune', title: 'Guardião A7', xp: 520, streak: 4, cards: 8, portals: 1, codes: 1 },
  { name: 'Nara Void', title: 'Observadora', xp: 340, streak: 2, cards: 5, portals: 0, codes: 1 },
]

export const dayPhrases = [
  'O Nada não pede performance. Ele pede presença.',
  'Feche os olhos, abandone a disputa e permaneça.',
  'A mente se move. O jogador observa.',
  'Um minuto inteiro pode abrir uma porta real.',
  'A constância transforma silêncio em território.',
  'Nada a provar. Tudo a perceber.',
  'O ciclo avança quando você retorna ao centro.',
]
