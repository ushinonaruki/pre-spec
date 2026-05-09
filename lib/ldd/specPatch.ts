import type { AnswerFormatResult, Project } from '@/types'
import { insertUnderHeading } from '@/lib/markdown'

export function applyAnswer(
  project: Project,
  params: { sectionTitle: string; question: string; answer: string },
): Project {
  const newSpec = insertUnderHeading(project.spec, params.sectionTitle, `- ${params.answer}`)
  return { ...project, spec: newSpec }
}

export function applyFormattedAnswer(
  project: Project,
  params: { sectionTitle: string; question: string; answer: string; formatResult: AnswerFormatResult },
): Project {
  const newSpec = insertUnderHeading(
    project.spec,
    params.sectionTitle,
    params.formatResult.specInsertionMarkdown,
  )
  return { ...project, spec: newSpec }
}

export function applyProposedMarkdown(
  project: Project,
  params: { sectionTitle: string; markdown: string },
): Project {
  const newSpec = insertUnderHeading(project.spec, params.sectionTitle, params.markdown)
  return { ...project, spec: newSpec, updatedAt: new Date().toISOString() }
}

export function applySkip(
  project: Project,
  params: { sectionTitle: string; markerBody: string; reason: string },
): { project: Project; reflectedMarkdown: string } {
  const markerLine = `- [pre-spec:skip:${params.reason}] ${params.markerBody}`
  const newSpec = insertUnderHeading(project.spec, params.sectionTitle, markerLine)
  return { project: { ...project, spec: newSpec }, reflectedMarkdown: markerLine }
}
