import type { Project, QuestionTimeline, SkipReason } from '@/types'

function replaceTimeline(project: Project, timeline: QuestionTimeline): Project {
  return {
    ...project,
    questionTimelines: { ...project.questionTimelines, [timeline.headingId]: timeline },
  }
}

export function setTimeline(project: Project, timeline: QuestionTimeline): Project {
  const existing = project.questionTimelines[timeline.headingId]
  if (!existing) return replaceTimeline(project, timeline)
  return replaceTimeline(project, {
    headingId: existing.headingId,
    generatedAt: existing.generatedAt,
    questions: [...existing.questions, ...timeline.questions],
  })
}

export function answerQuestion(
  project: Project,
  params: { headingId: string; questionId: string; answer: string },
): Project {
  const timeline = project.questionTimelines[params.headingId]
  if (!timeline) return project
  const now = new Date().toISOString()
  const questions = timeline.questions.map((q) =>
    q.id === params.questionId
      ? { ...q, status: 'answered' as const, answer: params.answer, answeredAt: now }
      : q,
  )
  return replaceTimeline(project, { ...timeline, questions })
}

export function skipQuestion(
  project: Project,
  params: { headingId: string; questionId: string; skipReason: SkipReason; skipDetail?: string },
): Project {
  const timeline = project.questionTimelines[params.headingId]
  if (!timeline) return project
  const questions = timeline.questions.map((q) =>
    q.id === params.questionId
      ? { ...q, status: 'skipped' as const, skipReason: params.skipReason, skipDetail: params.skipDetail }
      : q,
  )
  return replaceTimeline(project, { ...timeline, questions })
}
