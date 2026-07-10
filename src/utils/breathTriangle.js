export const BREATH_TRIANGLE_VERTICES = Object.freeze([
  Object.freeze({ x: 50, y: 6 }),
  Object.freeze({ x: 94, y: 88 }),
  Object.freeze({ x: 6, y: 88 }),
])

export function pointOnBreathTriangle(progress) {
  const normalized = ((Number(progress) % 1) + 1) % 1
  const segmentPosition = normalized * BREATH_TRIANGLE_VERTICES.length
  const segmentIndex = Math.floor(segmentPosition) % BREATH_TRIANGLE_VERTICES.length
  const amount = segmentPosition - Math.floor(segmentPosition)
  const start = BREATH_TRIANGLE_VERTICES[segmentIndex]
  const end = BREATH_TRIANGLE_VERTICES[(segmentIndex + 1) % BREATH_TRIANGLE_VERTICES.length]

  return {
    x: start.x + ((end.x - start.x) * amount),
    y: start.y + ((end.y - start.y) * amount),
  }
}
