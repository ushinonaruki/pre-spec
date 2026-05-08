import type { Project, RelatedSource, SectionMarker } from '@/types'
import { SPEC_TEMPLATE, extractSections } from '@/lib/markdown'
import { generateProjectSlug } from '@/lib/ldd/slug'
import { buildInitialRequirementMemoBlock, buildImportedBlock } from '@/lib/references'

export type InitialRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

export type CreateProjectInputs = {
  projectName: string
  requirementMemo: string
  baseSpecMarkdown?: string
  relatedSources?: InitialRelatedSource[]
}

export function createProjectFromInputs({
  projectName,
  requirementMemo,
  baseSpecMarkdown,
}: CreateProjectInputs): Project {
  const now = new Date().toISOString()
  const slug = generateProjectSlug(projectName)
  const spec = baseSpecMarkdown ?? SPEC_TEMPLATE
  const sections = extractSections(spec)
  const firstSection = sections[0] ?? null

  const relatedSources: RelatedSource[] = []
  const memoParts: string[] = [
    '# References',
    '',
    buildInitialRequirementMemoBlock(requirementMemo, now),
  ]

  if (baseSpecMarkdown) {
    memoParts.push('', buildImportedBlock({
      name: 'initial-base-spec',
      source: 'user provided base spec',
      kind: 'file',
      checkedAt: now,
      content: baseSpecMarkdown,
    }))
  }

  memoParts.push('')
  const memo = memoParts.join('\n')

  const initialMarker: SectionMarker | null = firstSection
    ? {
        id: crypto.randomUUID(),
        type: 'section_marker',
        sectionId: firstSection.id,
        sectionTitle: firstSection.title,
        createdAt: now,
      }
    : null

  return {
    id: crypto.randomUUID(),
    slug,
    createdAt: now,
    updatedAt: now,
    initialPrompt: requirementMemo,
    spec,
    memo,
    relatedSources,
    sections,
    currentSectionId: firstSection?.id ?? null,
    timeline: initialMarker ? [initialMarker] : [],
  }
}
