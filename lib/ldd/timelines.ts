import type { Feature, ManualEdit, PhaseMarker, Question, SectionMarker, TimelineItem } from '@/types'

export function buildTimelineContext(timeline: TimelineItem[]): string {
  if (timeline.length === 0) return ''
  const lines: string[] = []
  for (const item of timeline) {
    if (item.type === 'phase_marker') {
      lines.push(`[${item.label}]`)
    } else if (item.type === 'section_marker') {
      lines.push(`[Section: ${item.sectionTitle}]`)
    } else if (item.type === 'manual_edit') {
      lines.push('[Manual Edit]')
    } else if (item.type === 'question') {
      const q = item as Question
      if (q.status === 'answered') {
        lines.push(`[${q.sectionTitle}] Q: ${q.text}`)
        lines.push(`  → ${q.answer}`)
        if (q.reflectedMarkdown) lines.push(`  反映: ${q.reflectedMarkdown}`)
      } else if (q.status === 'skipped') {
        const detail = q.skipCustomText ? ` (${q.skipCustomText})` : ''
        lines.push(`[${q.sectionTitle}] Q: ${q.text}`)
        lines.push(`  → skip:${q.skipReason ?? ''}${detail}`)
      } else if (q.status === 'failed') {
        lines.push(`[${q.sectionTitle}] Q: ${q.text}`)
        lines.push(`  → failed: ${q.failureReason ?? ''}`)
      } else {
        lines.push(`[${q.sectionTitle}] Q: ${q.text}`)
        lines.push('  → open')
      }
    }
  }
  return lines.join('\n')
}

export function addSectionMarkerIfNeeded(feature: Feature): Feature {
  const { timeline, currentSectionId } = feature

  let lastSectionMarkerIndex = -1
  let lastPhaseMarkerIndex = -1
  let lastManualEditIndex = -1
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].type === 'section_marker') lastSectionMarkerIndex = i
    if (timeline[i].type === 'phase_marker') lastPhaseMarkerIndex = i
    if (timeline[i].type === 'manual_edit') lastManualEditIndex = i
  }

  const lastSectionMarker =
    lastSectionMarkerIndex >= 0 ? (timeline[lastSectionMarkerIndex] as SectionMarker) : null

  const needsMarker =
    !lastSectionMarker ||
    lastSectionMarker.sectionId !== currentSectionId ||
    lastPhaseMarkerIndex > lastSectionMarkerIndex ||
    lastManualEditIndex > lastSectionMarkerIndex

  if (!needsMarker) return feature

  const section = feature.sections.find((s) => s.id === currentSectionId)
  if (!section) return feature

  const now = new Date().toISOString()
  const marker: SectionMarker = {
    id: crypto.randomUUID(),
    type: 'section_marker',
    sectionId: section.id,
    sectionTitle: section.title,
    createdAt: now,
    updatedAt: now,
  }
  return { ...feature, timeline: [...timeline, marker] }
}

export function addQuestionsToTimeline(feature: Feature, questions: Question[]): Feature {
  return { ...feature, timeline: [...feature.timeline, ...questions] }
}

export function answerQuestion(
  feature: Feature,
  params: { questionId: string; answer: string; reflectedMarkdown?: string },
): Feature {
  const now = new Date().toISOString()
  const timeline = feature.timeline.map((item): TimelineItem => {
    if (item.type === 'question' && item.id === params.questionId) {
      return {
        ...item,
        status: 'answered' as const,
        answer: params.answer,
        reflectedMarkdown: params.reflectedMarkdown,
        updatedAt: now,
      }
    }
    return item
  })
  return { ...feature, timeline }
}

export function addManualEdit(feature: Feature): Feature {
  const now = new Date().toISOString()
  const manualEdit: ManualEdit = {
    id: crypto.randomUUID(),
    type: 'manual_edit',
    createdAt: now,
    updatedAt: now,
  }
  return { ...feature, timeline: [...feature.timeline, manualEdit] }
}

export function addPhaseMarker(feature: Feature): Feature {
  const now = new Date().toISOString()
  const marker: PhaseMarker = {
    id: crypto.randomUUID(),
    type: 'phase_marker',
    label: 'Initial Setup',
    createdAt: now,
    updatedAt: now,
  }
  return { ...feature, timeline: [...feature.timeline, marker] }
}

export function retryQuestion(
  feature: Feature,
  params: { questionId: string; newQuestion: Question },
): Feature {
  const idx = feature.timeline.findIndex(
    (item) => item.type === 'question' && item.id === params.questionId,
  )
  if (idx === -1) return feature
  const timeline = [
    ...feature.timeline.slice(0, idx),
    params.newQuestion,
    ...feature.timeline.slice(idx + 1),
  ]
  return { ...feature, timeline }
}

export function failQuestion(
  feature: Feature,
  params: {
    questionId: string
    attemptedAnswer?: string
    attemptedSkip?: { reason: string; customText?: string }
  },
): Feature {
  const now = new Date().toISOString()
  const timeline = feature.timeline.map((item): TimelineItem => {
    if (item.type === 'question' && item.id === params.questionId) {
      return {
        id: item.id,
        type: item.type,
        questionType: item.questionType,
        sectionId: item.sectionId,
        sectionTitle: item.sectionTitle,
        text: item.text,
        kinds: item.kinds,
        priority: item.priority,
        aiGuess: item.aiGuess,
        proposedMarkdown: item.proposedMarkdown,
        status: 'failed' as const,
        failureReason: 'target_section_not_found' as const,
        attemptedAnswer: params.attemptedAnswer,
        attemptedSkip: params.attemptedSkip,
        createdAt: item.createdAt,
        updatedAt: now,
      }
    }
    return item
  })
  return { ...feature, timeline }
}

export function skipQuestion(
  feature: Feature,
  params: {
    questionId: string
    skipReason: string
    skipCustomText?: string
    reflectedMarkdown?: string
  },
): Feature {
  const now = new Date().toISOString()
  const timeline = feature.timeline.map((item): TimelineItem => {
    if (item.type === 'question' && item.id === params.questionId) {
      return {
        ...item,
        status: 'skipped' as const,
        skipReason: params.skipReason,
        skipCustomText: params.skipCustomText,
        reflectedMarkdown: params.reflectedMarkdown,
        updatedAt: now,
      }
    }
    return item
  })
  return { ...feature, timeline }
}
