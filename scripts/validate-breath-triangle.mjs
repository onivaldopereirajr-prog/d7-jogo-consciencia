import { breathingTechniques, fallbackBreathingTechnique } from '../src/data/breathingTechniques.js'
import {
  BREATH_TRIANGLE_PERIMETER,
  BREATH_TRIANGLE_SEGMENT_LENGTHS,
  BREATH_TRIANGLE_VERTICES,
  getBreathingState,
  pointOnBreathTriangle,
} from '../src/utils/breathTriangle.js'

const techniques = [fallbackBreathingTechnique, ...breathingTechniques]
const TOLERANCE = 1e-9
const SAMPLE_MS = 10

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function segmentIndex(progress) {
  const distanceOnPath = progress * BREATH_TRIANGLE_PERIMETER
  if (distanceOnPath < BREATH_TRIANGLE_SEGMENT_LENGTHS[0]) return 0
  if (distanceOnPath < BREATH_TRIANGLE_SEGMENT_LENGTHS[0] + BREATH_TRIANGLE_SEGMENT_LENGTHS[1]) return 1
  return 2
}

console.log('Vértices:', BREATH_TRIANGLE_VERTICES)
console.log('Lados:', BREATH_TRIANGLE_SEGMENT_LENGTHS.map((value) => value.toFixed(9)).join(', '))
console.log('Perímetro:', BREATH_TRIANGLE_PERIMETER.toFixed(9))

for (const technique of techniques) {
  const totalSeconds = technique.steps.reduce((sum, step) => sum + step.seconds, 0)
  const totalMs = totalSeconds * 1000
  const boundaries = []
  let cumulativeMs = 0
  technique.steps.forEach((step, index) => {
    boundaries.push(cumulativeMs)
    assert(getBreathingState(cumulativeMs, technique).phaseIndex === index, `${technique.name}: fase incorreta em ${cumulativeMs}ms`)
    if (cumulativeMs > 0) {
      assert(getBreathingState(cumulativeMs - 0.001, technique).phaseIndex === index - 1, `${technique.name}: fase anterior incorreta antes de ${cumulativeMs}ms`)
    }
    cumulativeMs += step.seconds * 1000
  })
  boundaries.push(cumulativeMs)
  assert(cumulativeMs === totalMs, `${technique.name}: soma de durações incorreta`)
  assert(getBreathingState(totalMs, technique).phaseIndex === 0, `${technique.name}: ciclo não reinicia na fase zero`)

  const start = pointOnBreathTriangle(0)
  const end = pointOnBreathTriangle(1)
  assert(distance(start, end) < TOLERANCE, `${technique.name}: ciclo geométrico não fecha`)

  const speeds = []
  const expectedSpeed = BREATH_TRIANGLE_PERIMETER / totalSeconds
  let previousTime = 0
  let previousState = getBreathingState(0, technique)
  let previousPoint = pointOnBreathTriangle(previousState.cycleProgress)

  for (let elapsedMs = SAMPLE_MS; elapsedMs <= totalMs; elapsedMs += SAMPLE_MS) {
    const state = getBreathingState(elapsedMs, technique)
    const point = pointOnBreathTriangle(state.cycleProgress)
    assert(state.cycleProgress >= 0 && state.cycleProgress < 1, `${technique.name}: progresso fora de [0,1)`)
    assert(Number.isFinite(point.x) && Number.isFinite(point.y), `${technique.name}: posição não finita`)
    const previousSegment = segmentIndex(previousState.cycleProgress)
    const currentSegment = segmentIndex(state.cycleProgress)
    if (previousSegment === currentSegment && state.cycleProgress > previousState.cycleProgress) {
      speeds.push(distance(previousPoint, point) / ((elapsedMs - previousTime) / 1000))
    }
    assert(distance(previousPoint, point) <= (expectedSpeed * SAMPLE_MS / 1000 * 1.001), `${technique.name}: salto detectado em ${elapsedMs}ms`)
    previousTime = elapsedMs
    previousState = state
    previousPoint = point
  }

  const meanSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
  const variance = speeds.reduce((sum, speed) => sum + ((speed - meanSpeed) ** 2), 0) / speeds.length
  const stdDev = Math.sqrt(variance)
  const maxRelativeDeviation = Math.max(...speeds.map((speed) => Math.abs(speed - expectedSpeed) / expectedSpeed))
  assert(Math.abs(meanSpeed - expectedSpeed) / expectedSpeed < TOLERANCE, `${technique.name}: velocidade média incorreta`)
  assert(maxRelativeDeviation < 1e-8, `${technique.name}: velocidade não constante`)

  console.log(
    `${technique.name}: ${technique.steps.map((step) => `${step.label} ${step.seconds}s`).join(' → ')} | ` +
    `T=${totalSeconds}s | limites=${boundaries.map((value) => value / 1000).join('/')}s | ` +
    `v=${meanSpeed.toFixed(9)} | desvioMáx=${maxRelativeDeviation.toExponential(3)} | σ=${stdDev.toExponential(3)}`,
  )
}

const technique478 = breathingTechniques.find((technique) => technique.id === '4-7-8')
const checks478 = [[0, 0], [3999, 0], [4000, 1], [10999, 1], [11000, 2], [18999, 2], [19000, 0]]
checks478.forEach(([elapsedMs, phaseIndex]) => {
  const state = getBreathingState(elapsedMs, technique478)
  assert(state.phaseIndex === phaseIndex, `4-7-8: fase incorreta em ${elapsedMs}ms`)
})
assert(Math.abs(getBreathingState(4000, technique478).cycleProgress - (4 / 19)) < TOLERANCE, '4-7-8: progresso incorreto em 4s')
assert(Math.abs(getBreathingState(11000, technique478).cycleProgress - (11 / 19)) < TOLERANCE, '4-7-8: progresso incorreto em 11s')
assert(getBreathingState(19000, technique478).cycleProgress === 0, '4-7-8: progresso não reinicia em 19s')

console.log('Validação 4-7-8 e todas as técnicas concluída sem drift incremental.')
