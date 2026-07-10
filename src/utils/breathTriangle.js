export const BREATH_TRIANGLE_VERTICES = Object.freeze([
  Object.freeze({ x: 50, y: 6 }),
  Object.freeze({ x: 94, y: 88 }),
  Object.freeze({ x: 6, y: 88 }),
])

function distanceBetween(start, end) {
  return Math.hypot(end.x - start.x, end.y - start.y)
}

export const BREATH_TRIANGLE_SEGMENT_LENGTHS = Object.freeze(
  BREATH_TRIANGLE_VERTICES.map((start, index) => (
    distanceBetween(start, BREATH_TRIANGLE_VERTICES[(index + 1) % BREATH_TRIANGLE_VERTICES.length])
  )),
)

export const BREATH_TRIANGLE_PERIMETER = BREATH_TRIANGLE_SEGMENT_LENGTHS.reduce((sum, length) => sum + length, 0)

export function pointOnBreathTriangle(progress) {
  const normalized = ((Number(progress) % 1) + 1) % 1
  let distance = normalized * BREATH_TRIANGLE_PERIMETER

  for (let index = 0; index < BREATH_TRIANGLE_VERTICES.length; index += 1) {
    const segmentLength = BREATH_TRIANGLE_SEGMENT_LENGTHS[index]
    if (distance <= segmentLength) {
      const start = BREATH_TRIANGLE_VERTICES[index]
      const end = BREATH_TRIANGLE_VERTICES[(index + 1) % BREATH_TRIANGLE_VERTICES.length]
      const amount = segmentLength ? distance / segmentLength : 0
      return {
        x: start.x + ((end.x - start.x) * amount),
        y: start.y + ((end.y - start.y) * amount),
      }
    }
    distance -= segmentLength
  }

  return { ...BREATH_TRIANGLE_VERTICES[0] }
}

export function getBreathingState(elapsedMs, technique) {
  const steps = technique?.steps?.length ? technique.steps : []
  const durationsMs = steps.map((step) => Math.max(1, Number(step.seconds ?? 1)) * 1000)
  const cycleDurationMs = durationsMs.reduce((sum, duration) => sum + duration, 0) || 1000
  const safeElapsedMs = Math.max(0, Number(elapsedMs) || 0)
  const cycleElapsedMs = safeElapsedMs % cycleDurationMs
  let phaseStartMs = 0
  let phaseIndex = 0

  for (let index = 0; index < durationsMs.length; index += 1) {
    if (cycleElapsedMs < phaseStartMs + durationsMs[index]) {
      phaseIndex = index
      break
    }
    phaseStartMs += durationsMs[index]
  }

  const phase = steps[phaseIndex] ?? null
  const phaseDurationMs = durationsMs[phaseIndex] ?? cycleDurationMs
  const phaseElapsedMs = cycleElapsedMs - phaseStartMs
  const phaseRemainingMs = phaseDurationMs - phaseElapsedMs

  return {
    phaseIndex,
    phase,
    phaseType: phase?.id ?? 'inhale',
    phaseLabel: phase?.label ?? '',
    phaseElapsedMs,
    phaseRemainingMs,
    phaseProgress: phaseDurationMs ? phaseElapsedMs / phaseDurationMs : 0,
    cycleElapsedMs,
    cycleRemainingMs: cycleDurationMs - cycleElapsedMs,
    cycleProgress: cycleElapsedMs / cycleDurationMs,
    cycleDurationMs,
  }
}
