type ReferenceBlockParams = {
  importId: string
  source: string
  note?: string
  content: string
}

export function buildReferenceBlock({ importId, source, note, content }: ReferenceBlockParams): string {
  const lines: string[] = [`### ${importId}`, '', `source: ${source}`]
  if (note?.trim()) {
    const noteLines = note.split('\n').map((l) => l.trim()).filter(Boolean)
    lines.push('note:')
    for (const line of noteLines) {
      lines.push(`  - ${line}`)
    }
  }
  lines.push('content:')
  lines.push('`````md')
  lines.push(content)
  lines.push('`````')
  return lines.join('\n')
}

export function extractImportIds(referencesMarkdown: string): string[] {
  return [...referencesMarkdown.matchAll(/^### (\d{14}-\d+)$/gm)].map((m) => m[1])
}
