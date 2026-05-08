import type { Project, SectionMarker } from '@/types'
import { SPEC_TEMPLATE, extractSections } from '@/lib/markdown'
import { generateProjectSlug } from '@/lib/ldd/slug'

export type CreateProjectInputs = {
  projectName: string
  requirementMemo: string
  baseSpecMarkdown?: string
  relatedMarkdown?: string
}

export function createProjectFromInputs({
  projectName,
  requirementMemo,
  baseSpecMarkdown,
  relatedMarkdown,
}: CreateProjectInputs): Project {
  const now = new Date().toISOString()
  const slug = generateProjectSlug(projectName)
  const spec = baseSpecMarkdown ?? SPEC_TEMPLATE
  const sections = extractSections(spec)
  const firstSection = sections[0] ?? null

  const memoParts: string[] = [
    '# References',
    '',
    '## Initial Requirement Memo',
    '',
    'source: user input',
    `checkedAt: ${now}`,
    '',
    requirementMemo,
  ]
  if (baseSpecMarkdown) {
    memoParts.push('', '## Initial Base Spec', '', 'source: user provided base spec', `checkedAt: ${now}`, '', baseSpecMarkdown)
  }
  if (relatedMarkdown) {
    memoParts.push('', '## Imported: related-note', '', 'source: user input', `checkedAt: ${now}`, '', relatedMarkdown)
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
