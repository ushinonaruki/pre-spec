import type { Project, Question, SectionMarker, SkipReason, TimelineItem } from '@/types'

export function addSectionMarkerIfNeeded(project: Project): Project {
  const lastMarker = [...project.timeline]
    .reverse()
    .find((t): t is SectionMarker => t.type === 'section_marker')

  if (lastMarker?.sectionId === project.currentSectionId) return project

  const section = project.sections.find((s) => s.id === project.currentSectionId)
  if (!section) return project

  const marker: SectionMarker = {
    id: crypto.randomUUID(),
    type: 'section_marker',
    sectionId: section.id,
    sectionTitle: section.title,
    createdAt: new Date().toISOString(),
  }
  return { ...project, timeline: [...project.timeline, marker] }
}

export function addQuestionsToTimeline(project: Project, questions: Question[]): Project {
  return { ...project, timeline: [...project.timeline, ...questions] }
}

export function answerQuestion(
  project: Project,
  params: { questionId: string; answer: string },
): Project {
  const now = new Date().toISOString()
  const timeline = project.timeline.map((item): TimelineItem => {
    if (item.type === 'question' && item.id === params.questionId) {
      return { ...item, status: 'answered' as const, answer: params.answer, answeredAt: now }
    }
    return item
  })
  return { ...project, timeline }
}

export function skipQuestion(
  project: Project,
  params: {
    questionId: string
    skipReason: SkipReason
    skipDetail?: string
    reflectedMarkdown?: string
  },
): Project {
  const now = new Date().toISOString()
  const timeline = project.timeline.map((item): TimelineItem => {
    if (item.type === 'question' && item.id === params.questionId) {
      return {
        ...item,
        status: 'skipped' as const,
        skipReason: params.skipReason,
        skipDetail: params.skipDetail,
        skippedAt: now,
        reflectedToSpec: params.reflectedMarkdown !== undefined,
        reflectedMarkdown: params.reflectedMarkdown,
      }
    }
    return item
  })
  return { ...project, timeline }
}
