export function extractOpenQuestions(spec: string): string {
  const lines = spec.split('\n')
  let inOQ = false
  const result: string[] = []

  for (const line of lines) {
    if (line.match(/^## Open Questions/)) {
      inOQ = true
      continue
    }
    if (inOQ) {
      if (line.match(/^## /)) break
      result.push(line)
    }
  }
  return result.join('\n').trim()
}

export function buildSkipEntry(params: {
  heading: string
  question: string
  reason: string
  detail?: string
}): string {
  return `- [${params.heading}] ${params.question}\n  - 理由: ${params.reason}${params.detail ? '\n  - メモ: ' + params.detail : ''}`
}
