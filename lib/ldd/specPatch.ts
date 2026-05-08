import type { AnswerFormatResult, Project, SkipReason } from '@/types'
import { insertUnderHeading } from '@/lib/markdown'

function buildSkipMarkerLine(params: {
  question: string
  reason: SkipReason
  detail?: string
}): string {
  const content = params.detail
    ? `${params.question} — ${params.detail}`
    : params.question
  return `- [pre-spec:skip:${params.reason}] ${content}`
}

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
  params: { sectionTitle: string; question: string; reason: SkipReason; detail?: string },
): { project: Project; reflectedMarkdown: string } {
  const markerLine = buildSkipMarkerLine({
    question: params.question,
    reason: params.reason,
    detail: params.detail,
  })
  const newSpec = insertUnderHeading(project.spec, params.sectionTitle, markerLine)
  return { project: { ...project, spec: newSpec }, reflectedMarkdown: markerLine }
}
