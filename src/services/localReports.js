import { getAllLocalSummaries } from './localProgress.js'

export function buildLocalReport() {
  const users = getAllLocalSummaries()
  return {
    generatedAt: new Date().toISOString(),
    scope: 'Relatório local deste navegador/dispositivo. Não é acompanhamento remoto.',
    totalLocalUsers: users.length,
    users,
  }
}

export function reportText(report = buildLocalReport()) {
  return JSON.stringify(report, null, 2)
}

export async function copyLocalReport() {
  const text = reportText()
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return { ok: true, message: 'Relatório local copiado.' }
  }
  return { ok: false, message: 'Clipboard indisponível neste navegador.' }
}

export function downloadLocalReport() {
  const text = reportText()
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `relatorio-d7-local-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  return { ok: true, message: 'Relatório JSON exportado.' }
}
