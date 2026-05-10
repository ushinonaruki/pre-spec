import type { Project, SectionMarker } from '@/types'
import { extractSections, mergeSections } from '@/lib/markdown'

export function replaceSpecMarkdownAndRefreshSections(project: Project, specMarkdown: string): Project {
  const freshSections = extractSections(specMarkdown)
  const merged = mergeSections(project.sections, freshSections)
  const currentStillExists = merged.some((s) => s.id === project.currentSectionId)
  return {
    ...project,
    spec: specMarkdown,
    sections: merged,
    currentSectionId: currentStillExists ? project.currentSectionId : (merged[0]?.id ?? null),
  }
}

export function advanceSection(project: Project): Project {
  const sections = project.sections
  if (sections.length === 0) return project

  const currentIdx = sections.findIndex((s) => s.id === project.currentSectionId)
  const nextIdx = currentIdx === -1 || currentIdx === sections.length - 1 ? 0 : currentIdx + 1
  const nextSection = sections[nextIdx]

  const now = new Date().toISOString()
  const marker: SectionMarker = {
    id: crypto.randomUUID(),
    type: 'section_marker',
    sectionId: nextSection.id,
    sectionTitle: nextSection.title,
    createdAt: now,
  }

  return {
    ...project,
    currentSectionId: nextSection.id,
    timeline: [...project.timeline, marker],
    updatedAt: now,
  }
}
