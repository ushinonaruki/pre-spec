import type { Project, SectionMarker } from '@/types'
import { SPEC_TEMPLATE, extractSections } from '@/lib/markdown'
import { generateProjectSlug } from '@/lib/ldd/slug'
import { buildInitialRequirementMemoBlock, buildImportedBlock } from '@/lib/references'
import { relatedSourceToBlockParams } from '@/lib/relatedSources'

export type CreateProjectInputs = {
  projectName: string
  requirementMemo: string
  baseSpecMarkdown?: string
  relatedMarkdown?: string
  relatedFilename?: string
}

export function createProjectFromInputs({
  projectName,
  requirementMemo,
  baseSpecMarkdown,
  relatedMarkdown,
  relatedFilename,
}: CreateProjectInputs): Project {
  const now = new Date().toISOString()
  const slug = generateProjectSlug(projectName)
  const spec = baseSpecMarkdown ?? SPEC_TEMPLATE
  const sections = extractSections(spec)
  const firstSection = sections[0] ?? null

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
  if (relatedMarkdown) {
    memoParts.push('', buildImportedBlock(relatedSourceToBlockParams({
      kind: relatedFilename ? 'file' : 'text',
      name: relatedFilename ?? 'related-note',
      content: relatedMarkdown,
    }, now)))
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
    sections,
    currentSectionId: firstSection?.id ?? null,
    timeline: initialMarker ? [initialMarker] : [],
  }
}
