import type { Feature, SectionMarker } from '@/src/types'
import { extractSections } from './markdown'
import { v4 as uuidv4 } from 'uuid'

export function replaceSpecMarkdownAndRefreshSections(feature: Feature, specMarkdown: string): Feature {
  const freshSections = extractSections(specMarkdown)
  const currentStillExists = freshSections.some((s) => s.id === feature.currentSectionId)
  return {
    ...feature,
    spec: specMarkdown,
    sections: freshSections,
    currentSectionId: currentStillExists ? feature.currentSectionId : freshSections[0]?.id,
  }
}

export function advanceCurrentSection(feature: Feature): Feature {
  const sections = feature.sections
  if (sections.length === 0) return feature

  const currentIdx = sections.findIndex((s) => s.id === feature.currentSectionId)
  const nextIdx = currentIdx === -1 || currentIdx === sections.length - 1 ? 0 : currentIdx + 1
  const nextSection = sections[nextIdx]

  const now = new Date().toISOString()
  const marker: SectionMarker = {
    id: uuidv4(),
    type: 'section_marker',
    sectionId: nextSection.id,
    sectionTitle: nextSection.title,
    createdAt: now,
    updatedAt: now,
  }

  return {
    ...feature,
    currentSectionId: nextSection.id,
    timeline: [...feature.timeline, marker],
  }
}
