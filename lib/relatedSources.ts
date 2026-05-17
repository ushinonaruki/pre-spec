import { buildImportedBlock } from '@/lib/references'

export const URL_SOURCE_NAME = 'url-source'

export function extractImportedNames(referencesMarkdown: string): string[] {
  return [...referencesMarkdown.matchAll(/^## Imported: (.+)$/gm)].map((m) => m[1].trim())
}

type RelatedSourceInput = {
  name: string
  source: string
  content: string
  note?: string
}

export function buildRelatedSourceBlock(input: RelatedSourceInput, checkedAt: string): string {
  return buildImportedBlock({
    name: input.name,
    source: input.source,
    note: input.note,
    checkedAt,
    content: input.content,
  })
}

export function resolveSourceName(existingNames: string[], baseName: string): string {
  if (!existingNames.includes(baseName)) return baseName
  let i = 2
  while (existingNames.includes(`${baseName}-${i}`)) i++
  return `${baseName}-${i}`
}
