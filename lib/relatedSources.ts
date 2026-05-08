import type { RelatedSourceKind } from '@/types'
import { buildImportedBlock, type ImportedBlockParams } from '@/lib/references'

export type RelatedSourceInput = {
  kind: RelatedSourceKind
  name: string
  content: string
  note?: string
}

function sourceLabel(kind: RelatedSourceKind): string {
  return kind === 'file' ? 'user upload' : 'user input'
}

export function relatedSourceToBlockParams(input: RelatedSourceInput, checkedAt: string): ImportedBlockParams {
  return {
    name: input.name,
    source: sourceLabel(input.kind),
    kind: input.kind,
    note: input.note,
    checkedAt,
    content: input.content,
  }
}

export function buildRelatedSourceBlock(input: RelatedSourceInput, checkedAt: string): string {
  return buildImportedBlock(relatedSourceToBlockParams(input, checkedAt))
}

export function resolveSourceName(existingNames: string[], baseName: string): string {
  if (!existingNames.includes(baseName)) return baseName
  let i = 2
  while (existingNames.includes(`${baseName}-${i}`)) i++
  return `${baseName}-${i}`
}
