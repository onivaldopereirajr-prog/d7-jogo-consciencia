import { pointOnBreathTriangle } from '../src/utils/breathTriangle.js'

const cases = [
  [0, { x: 50, y: 6 }, 'A'],
  [1 / 6, { x: 72, y: 47 }, 'meio A→B'],
  [1 / 3, { x: 94, y: 88 }, 'B'],
  [1 / 2, { x: 50, y: 88 }, 'meio B→C'],
  [2 / 3, { x: 6, y: 88 }, 'C'],
  [5 / 6, { x: 28, y: 47 }, 'meio C→A'],
  [1, { x: 50, y: 6 }, 'A novamente'],
]

for (const [progress, expected, label] of cases) {
  const point = pointOnBreathTriangle(progress)
  const valid = Math.abs(point.x - expected.x) < 0.000001 && Math.abs(point.y - expected.y) < 0.000001
  if (!valid) throw new Error(`p=${progress}: esperado (${expected.x}, ${expected.y}), recebido (${point.x}, ${point.y})`)
  console.log(`p=${progress.toFixed(3)} → ${label}: (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`)
}
