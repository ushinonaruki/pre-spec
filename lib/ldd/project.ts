import type { Project, SectionMarker } from '@/types'
import { SPEC_TEMPLATE, extractSections } from '@/lib/markdown'
import { appendStartLog } from '@/lib/logBuilder'

export function createProjectWithSpec(prompt: string, spec: string): Project {
  const now = new Date().toISOString()
  const sections = extractSections(spec)
  const firstSection = sections[0] ?? null
  const log = appendStartLog('', { prompt })

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
    createdAt: now,
    updatedAt: now,
    initialPrompt: prompt,
    spec,
    log,
    memo: '',
    sections,
    currentSectionId: firstSection?.id ?? null,
    timeline: initialMarker ? [initialMarker] : [],
  }
}

export function createProject(prompt: string): Project {
  return createProjectWithSpec(prompt, SPEC_TEMPLATE)
}
