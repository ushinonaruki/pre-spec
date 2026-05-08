export type ImportedBlockParams = {
  name: string
  source: string
  kind: string
  note?: string
  checkedAt: string
  content: string
}

export function buildInitialRequirementMemoBlock(content: string, checkedAt: string): string {
  return [
    '## Initial Requirement Memo',
    '',
    'source: user input',
    `checkedAt: ${checkedAt}`,
    '',
    content,
  ].join('\n')
}

export function buildImportedBlock({ name, source, kind, note, checkedAt, content }: ImportedBlockParams): string {
  const lines: string[] = [
    `## Imported: ${name}`,
    '',
    `source: ${source}`,
    `kind: ${kind}`,
    `checkedAt: ${checkedAt}`,
  ]
  if (note !== undefined) lines.push(`note: ${note}`)
  lines.push('', content)
  return lines.join('\n')
}
