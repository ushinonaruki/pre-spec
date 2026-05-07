import type { AnswerFormatResult, Project, SkipReason } from '@/types'
import { insertUnderHeading } from '@/lib/markdown'
import { appendAnswerLog, appendSkipLog } from '@/lib/logBuilder'

export const DUMMY_QUESTION = 'このセクションについて考えていることを入力してください'

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
  const newLog = appendAnswerLog(project.log, {
    heading: params.sectionTitle,
    question: params.question,
    answer: params.answer,
  })
  return { ...project, spec: newSpec, log: newLog }
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
  const newLog = appendAnswerLog(project.log, {
    heading: params.sectionTitle,
    question: params.question,
    answer: params.answer,
    summary: params.formatResult.aggregationLogSummary,
  })
  return { ...project, spec: newSpec, log: newLog }
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
  const newLog = appendSkipLog(project.log, {
    heading: params.sectionTitle,
    question: params.question,
    reason: params.reason,
    detail: params.detail,
  })
  return { project: { ...project, spec: newSpec, log: newLog }, reflectedMarkdown: markerLine }
}
