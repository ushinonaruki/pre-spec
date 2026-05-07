import type { AnswerFormatResult, Project, SkipReason } from '@/types'
import { insertUnderHeading } from '@/lib/markdown'
import { appendAnswerLog, appendSkipLog } from '@/lib/logBuilder'
import { buildSkipEntry } from '@/lib/openQuestions'

export const DUMMY_QUESTION = 'このセクションについて考えていることを入力してください'

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
  let newSpec = insertUnderHeading(
    project.spec,
    params.sectionTitle,
    params.formatResult.specInsertionMarkdown,
  )
  for (const oq of params.formatResult.openQuestionInsertions) {
    newSpec = insertUnderHeading(newSpec, 'Open Questions', `- ${oq}`)
  }
  const newLog = appendAnswerLog(project.log, {
    heading: params.sectionTitle,
    question: params.question,
    answer: params.answer,
    summary: params.formatResult.aggregationLogSummary,
  })
  return { ...project, spec: newSpec, log: newLog }
}

export function applySkip(
  project: Project,
  params: { sectionTitle: string; question: string; reason: SkipReason; detail?: string },
): Project {
  const entry = buildSkipEntry({
    heading: params.sectionTitle,
    question: params.question,
    reason: params.reason,
    detail: params.detail,
  })
  const newSpec = insertUnderHeading(project.spec, 'Open Questions', entry)
  const newLog = appendSkipLog(project.log, {
    heading: params.sectionTitle,
    question: params.question,
    reason: params.reason,
    detail: params.detail,
  })
  return { ...project, spec: newSpec, log: newLog }
}
