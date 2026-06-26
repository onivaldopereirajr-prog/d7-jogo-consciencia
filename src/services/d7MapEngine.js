import { hebrewSymbolicLetters } from '../data/hebrewSymbolicMap.js'
import { sanskritSymbolicSounds } from '../data/sanskritSymbolicMap.js'
import { d7Archetypes, symbolicSefirot } from '../data/d7AstralArchetypes.js'

const hebrewByLetter = Object.fromEntries(hebrewSymbolicLetters.map((item) => [item.letter, item]))
const sanskritBySound = Object.fromEntries(sanskritSymbolicSounds.map((item) => [item.sound, item]))

export function normalizeName(input) {
  const original = String(input ?? '').replace(/\s+/g, ' ').trim()
  const normalized = original.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
  return { original, normalized }
}

export function reduceToD7(number) {
  const clean = Math.abs(Number(number) || 0)
  if (clean === 0) return 1
  return ((clean - 1) % 7) + 1
}

function sumDigits(value) {
  return String(value).replace(/\D/g, '').split('').reduce((sum, digit) => sum + Number(digit), 0)
}

function hebrewForChar(char, index) {
  if ('aeiou'.includes(char)) return index % 4 === 0 ? 'א' : index % 4 === 1 ? 'ה' : index % 4 === 2 ? 'ו' : 'י'
  if ('bp'.includes(char)) return 'ב'
  if (char === 'f') return 'פ'
  if (char === 'g') return 'ג'
  if (char === 'd') return 'ד'
  if (char === 't') return 'ת'
  if (char === 'l') return 'ל'
  if (char === 'm') return 'מ'
  if (char === 'n') return 'נ'
  if (char === 'r') return 'ר'
  if (char === 's') return 'ש'
  if (char === 'z') return 'ז'
  if (char === 'k' || char === 'c') return 'כ'
  if (char === 'q') return 'ק'
  if (char === 'h') return 'ה'
  if (char === 'x') return 'ס'
  return 'א'
}

export function nameToHebrewSymbolic(name) {
  const { original, normalized } = normalizeName(name)
  const chars = normalized.replace(/\s/g, '').split('')
  const lettersUsed = chars.map((char, index) => {
    const letter = hebrewForChar(char, index)
    return hebrewByLetter[letter]
  }).filter(Boolean)
  const gematriaTotal = lettersUsed.reduce((sum, item) => sum + item.value, 0)
  return {
    original,
    hebrewApprox: lettersUsed.map((item) => item.letter).join(''),
    lettersUsed,
    gematriaTotal,
    reducedNumber: reduceToD7(gematriaTotal),
    explanation: 'Aproximação fonética lúdica: não é transliteração hebraica perfeita nem leitura religiosa definitiva.',
  }
}

function matchSanskritAt(text, index) {
  const patterns = ['shanti', 'mantra', 'prana', 'dhya', 'atma', 'sha', 'pra', 'om', 'ra', 'ma', 'aa', 'a']
  return patterns.find((pattern) => text.startsWith(pattern, index))
}

export function nameToSanskritSymbolic(name) {
  const { normalized } = normalizeName(name)
  const compact = normalized.replace(/\s/g, '')
  const soundsUsed = []
  let index = 0
  while (index < compact.length) {
    const match = matchSanskritAt(compact, index)
    if (match && sanskritBySound[match]) {
      soundsUsed.push(sanskritBySound[match])
      index += match.length
    } else {
      const char = compact[index]
      const fallback = sanskritBySound[char === 'm' ? 'ma' : char === 'r' ? 'ra' : 'a']
      soundsUsed.push(fallback)
      index += 1
    }
  }
  const soundScore = soundsUsed.reduce((sum, item) => sum + item.valueD7, 0)
  return {
    devanagariApprox: soundsUsed.map((item) => item.devanagari).join(''),
    soundsUsed,
    soundScore,
    reducedNumber: reduceToD7(soundScore),
    explanation: 'Fonética simbólica do D7 inspirada no universo sânscrito; não é numerologia tradicional absoluta.',
  }
}

export function calculateBirthDateNumber(date) {
  return reduceToD7(sumDigits(date))
}

export function calculateBirthTimeNumber(time = '00:00') {
  return reduceToD7(sumDigits(time || '00:00'))
}

export function calculateD7Core({ nameScore, hebrewScore, sanskritScore, birthDateScore, birthTimeScore }) {
  const raw = nameScore * 3 + hebrewScore * 5 + sanskritScore * 5 + birthDateScore * 7 + birthTimeScore * 2
  return {
    raw,
    d7Core: reduceToD7(raw),
    d7Axis: reduceToD7(hebrewScore + sanskritScore + birthDateScore),
    d7Gate: reduceToD7(nameScore + birthTimeScore + reduceToD7(raw)),
  }
}

export function mapToSefirah(d7Core, hebrewReduced, birthDateReduced) {
  const index = (d7Core + hebrewReduced + birthDateReduced - 1) % symbolicSefirot.length
  return symbolicSefirot[index]
}

export function buildSymbolicMap(input) {
  const normalized = normalizeName(input.name)
  if (!normalized.normalized) return { ok: false, message: 'Informe um nome válido para o mapa.' }
  if (!input.birthDate) return { ok: false, message: 'Informe a data de nascimento.' }
  const birthTime = input.birthTime || '00:00'
  const hebrew = nameToHebrewSymbolic(input.name)
  const sanskrit = nameToSanskritSymbolic(input.name)
  const birthDateScore = calculateBirthDateNumber(input.birthDate)
  const birthTimeScore = calculateBirthTimeNumber(birthTime)
  const nameScore = reduceToD7(sumDigits(hebrew.gematriaTotal + sanskrit.soundScore + normalized.normalized.length))
  const core = calculateD7Core({ nameScore, hebrewScore: hebrew.reducedNumber, sanskritScore: sanskrit.reducedNumber, birthDateScore, birthTimeScore })
  const archetype = d7Archetypes[core.d7Core - 1]
  const sefirah = mapToSefirah(core.d7Core, hebrew.reducedNumber, birthDateScore)
  const dominantSound = sanskrit.soundsUsed[(core.d7Axis - 1) % Math.max(1, sanskrit.soundsUsed.length)] ?? sanskritSymbolicSounds[0]
  const result = {
    id: `map-${Date.now()}`,
    createdAt: new Date().toISOString(),
    input: { name: normalized.original, birthDate: input.birthDate, birthTime, place: input.place?.trim() ?? '', language: input.language?.trim() ?? '' },
    hebrew,
    sanskrit,
    nameScore,
    birthDateScore,
    birthTimeScore,
    ...core,
    sefirah,
    dominantSound,
    archetype,
    recommendedCard: archetype.card,
    recommendedSeal: archetype.seal,
    recommendedChallenge: archetype.practice,
    suggestedReward: archetype.reward,
    narrative: `Esta leitura é simbólica e faz parte da experiência narrativa do D7. O nome ${normalized.original} foi convertido por aproximações fonéticas lúdicas para criar uma ponte entre letras, sons e ciclos. O núcleo D7 ${core.d7Core} aponta para o arquétipo ${archetype.name}, cuja virtude é ${archetype.virtue} e cuja sombra simbólica é ${archetype.shadow}. A sefirá simbólica dominante, ${sefirah.name}, aparece aqui como linguagem de estudo do jogo, não como afirmação cabalística definitiva. O som ${dominantSound.roman} sugere uma prática de ${dominantSound.keyword} dentro do Códice.`,
    disclaimer: 'Leitura lúdica de autoconhecimento dentro do universo ficcional do D7; não é mapa astral profissional, previsão científica, diagnóstico espiritual ou verdade absoluta.',
  }
  return { ok: true, result, usedDefaultTime: !input.birthTime }
}
