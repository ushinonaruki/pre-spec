import type { Project, SkipReason } from '@/types'
import { insertUnderHeading } from '@/lib/markdown'
import { appendAnswerLog, appendSkipLog } from '@/lib/logBuilder'
import { buildSkipEntry } from '@/lib/openQuestions'

export const DUMMY_QUESTION = 'このセクションについて考えていることを入力してください'

export function applyAnswer(
  project: Project,
  params: { question: string; answer: string },
): Project {
  const heading = project.headings.find((h) => h.id === project.currentHeadingId)
  if (!heading) return project

  const newSpec = insertUnderHeading(project.spec, heading.title, `- ${params.answer}`)
  const newLog = appendAnswerLog(project.log, {
    heading: heading.title,
    question: params.question,
    answer: params.answer,
  })
  return { ...project, spec: newSpec, log: newLog }
}

export function applySkip(
  project: Project,
  params: { question: string; reason: SkipReason; detail?: string },
): Project {
  const heading = project.headings.find((h) => h.id === project.currentHeadingId)
  if (!heading) return project

  const entry = buildSkipEntry({
    heading: heading.title,
    question: params.question,
    reason: params.reason,
    detail: params.detail,
  })
  const newSpec = insertUnderHeading(project.spec, 'Open Questions', entry)
  const newLog = appendSkipLog(project.log, {
    heading: heading.title,
    question: params.question,
    reason: params.reason,
    detail: params.detail,
  })
  return { ...project, spec: newSpec, log: newLog }
}
