import type { Project, RelatedSource, SectionMarker } from '@/types'
import { SPEC_TEMPLATE, extractSections } from '@/lib/markdown'
import { generateProjectSlug } from '@/lib/ldd/slug'
import { buildInitialRequirementMemoBlock } from '@/lib/references'

export type InitialRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

export type CreateProjectInputs = {
  projectName: string
  requirementMemo: string
  requirementMemoFilename?: string
  relatedSources?: InitialRelatedSource[]
}

export function createProjectFromInputs({
  projectName,
  requirementMemo,
  requirementMemoFilename,
}: CreateProjectInputs): Project {
  const now = new Date().toISOString()
  const slug = generateProjectSlug(projectName)
  const spec = SPEC_TEMPLATE
  const sections = extractSections(spec)
  const firstSection = sections[0] ?? null

  const relatedSources: RelatedSource[] = []
  const memoParts: string[] = [
    '# References',
    '',
    buildInitialRequirementMemoBlock(requirementMemo, now, requirementMemoFilename ?? 'initial.md'),
  ]

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
    requirementMemo,
    spec,
    memo,
    relatedSources,
    sections,
    currentSectionId: firstSection?.id ?? null,
    timeline: initialMarker ? [initialMarker] : [],
  }
}
