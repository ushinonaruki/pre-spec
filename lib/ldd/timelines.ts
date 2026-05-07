import type { Project, QuestionTimeline } from '@/types'

export function setTimeline(project: Project, timeline: QuestionTimeline): Project {
  return {
    ...project,
    questionTimelines: { ...project.questionTimelines, [timeline.headingId]: timeline },
  }
}

export function answerQuestion(
  project: Project,
  params: { headingId: string; questionId: string; answer: string },
): Project {
  const timeline = project.questionTimelines[params.headingId]
  if (!timeline) return project
  const questions = timeline.questions.map((q) =>
    q.id === params.questionId
      ? { ...q, status: 'answered' as const, answer: params.answer }
      : q,
  )
  return setTimeline(project, { ...timeline, questions })
}

export function skipQuestion(
  project: Project,
  params: { headingId: string; questionId: string },
): Project {
  const timeline = project.questionTimelines[params.headingId]
  if (!timeline) return project
  const questions = timeline.questions.map((q) =>
    q.id === params.questionId ? { ...q, status: 'skipped' as const } : q,
  )
  return setTimeline(project, { ...timeline, questions })
}
