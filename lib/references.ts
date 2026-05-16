export type ImportedBlockParams = {
  name: string
  source: string
  note?: string
  checkedAt: string
  content: string
}

export function buildInitialRequirementMemoBlock(content: string, checkedAt: string, filename: string): string {
  return [
    '## Initial Requirement Memo',
    '',
    `source: ${filename}`,
    `checkedAt: ${checkedAt}`,
    'content:',
    '`````md',
    content,
    '`````',
  ].join('\n')
}

export function buildImportedBlock({ name, source, note, checkedAt, content }: ImportedBlockParams): string {
  const lines: string[] = [
    `## Imported: ${name}`,
    '',
    `source: ${source}`,
    `checkedAt: ${checkedAt}`,
  ]
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
