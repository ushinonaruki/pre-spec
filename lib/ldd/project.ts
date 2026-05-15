import type { Project, SectionMarker } from '@/types'
import { SPEC_TEMPLATE, extractSections } from '@/lib/markdown'
import { buildInitialRequirementMemoBlock } from '@/lib/references'

export type InitialRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

export type CreateProjectInputs = {
  projectFileBase: string
  requirementMemo: string
  requirementMemoFilename?: string
}

export type CreateProjectRequest = CreateProjectInputs & {
  relatedSources?: InitialRelatedSource[]
}

export function createProjectFromInputs({
  projectFileBase,
  requirementMemo,
  requirementMemoFilename,
}: CreateProjectInputs): Project {
  const now = new Date().toISOString()
  const spec = SPEC_TEMPLATE
  const sections = extractSections(spec)
  const firstSection = sections[0] ?? null

  const memoParts: string[] = [
    '# References',
    '',
    buildInitialRequirementMemoBlock(requirementMemo, now, requirementMemoFilename ?? 'initial.md'),
  ]

  memoParts.push('')
  const referencesMarkdown = memoParts.join('\n')

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
    fileBase: projectFileBase,
    createdAt: now,
    updatedAt: now,
    requirementMemo,
    spec,
    referencesMarkdown,
    sections,
    currentSectionId: firstSection?.id ?? null,
    timeline: initialMarker ? [initialMarker] : [],
  }
}
