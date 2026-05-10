import type { ManualEdit, PhaseMarker, Project, Question, SectionMarker, TimelineItem } from '@/types'

export function buildRecentLogFromTimeline(timeline: TimelineItem[], maxChars: number): string {
  const items = timeline.filter(
    (item): item is Question => item.type === 'question' && item.status !== 'open',
  )
  const lines: string[] = []
  for (const q of items) {
    if (q.status === 'answered') {
      lines.push(`[${q.sectionTitle}] Q: ${q.text}`)
      lines.push(`  → ${q.answer ?? ''}`)
      if (q.reflectedMarkdown) lines.push(`  反映: ${q.reflectedMarkdown}`)
    } else if (q.status === 'skipped') {
      const detail = q.skipCustomText ? ` (${q.skipCustomText})` : ''
      lines.push(`[${q.sectionTitle}] Q: ${q.text}`)
      lines.push(`  → skip:${q.skipReason ?? ''}${detail}`)
    } else if (q.status === 'failed') {
      lines.push(`[${q.sectionTitle}] Q: ${q.text}`)
      lines.push(`  → failed: ${q.failureReason ?? ''}`)
    }
  }
  const text = lines.join('\n')
  return text.length <= maxChars ? text : text.slice(-maxChars)
}

export function addSectionMarkerIfNeeded(project: Project): Project {
  const { timeline, currentSectionId } = project

  let lastSectionMarkerIndex = -1
  let lastPhaseMarkerIndex = -1
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].type === 'section_marker') lastSectionMarkerIndex = i
    if (timeline[i].type === 'phase_marker') lastPhaseMarkerIndex = i
  }

  const lastSectionMarker =
    lastSectionMarkerIndex >= 0 ? (timeline[lastSectionMarkerIndex] as SectionMarker) : null

  const needsMarker =
    !lastSectionMarker ||
    lastSectionMarker.sectionId !== currentSectionId ||
    lastPhaseMarkerIndex > lastSectionMarkerIndex

  if (!needsMarker) return project

  const section = project.sections.find((s) => s.id === currentSectionId)
  if (!section) return project

  const marker: SectionMarker = {
    id: crypto.randomUUID(),
    type: 'section_marker',
    sectionId: section.id,
    sectionTitle: section.title,
    createdAt: new Date().toISOString(),
  }
  return { ...project, timeline: [...timeline, marker] }
}

export function addQuestionsToTimeline(project: Project, questions: Question[]): Project {
  return { ...project, timeline: [...project.timeline, ...questions] }
}

export function answerQuestion(
  project: Project,
  params: { questionId: string; answer: string; reflectedMarkdown?: string },
): Project {
  const now = new Date().toISOString()
  const timeline = project.timeline.map((item): TimelineItem => {
    if (item.type === 'question' && item.id === params.questionId) {
      return {
        ...item,
        status: 'answered' as const,
        answer: params.answer,
        answeredAt: now,
        reflectedToSpec: true,
        reflectedMarkdown: params.reflectedMarkdown,
      }
    }
    return item
  })
  return { ...project, timeline, updatedAt: now }
}

function simpleHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function extractSectionContents(markdown: string): Record<string, string> {
  const lines = markdown.split('\n')
  const result: Record<string, string> = {}
  let currentId: string | null = null
  const buffer: string[] = []
  const occurrenceCount: Record<string, number> = {}

  const flush = () => {
    if (currentId !== null) result[currentId] = buffer.join('\n')
  }

  for (const line of lines) {
    const match = line.match(/^## (.+)$/)
    if (match) {
      flush()
      const title = match[1].trim()
      const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const occ = occurrenceCount[slug] ?? 0
      occurrenceCount[slug] = occ + 1
      currentId = `s-${slug}-${occ}`
      buffer.length = 0
    } else if (currentId !== null) {
      buffer.push(line)
    }
  }
  flush()
  return result
}

function estimateAffectedSections(beforeMarkdown: string, afterMarkdown: string): string[] {
  const before = extractSectionContents(beforeMarkdown)
  const after = extractSectionContents(afterMarkdown)
  const allIds = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...allIds].filter((id) => before[id] !== after[id])
}

export function addManualEdit(
  project: Project,
  params: { beforeMarkdown: string; afterMarkdown: string; memo?: string },
): Project {
  const manualEdit: ManualEdit = {
    id: crypto.randomUUID(),
    type: 'manual_edit',
    createdAt: new Date().toISOString(),
    memo: params.memo,
    beforeHash: simpleHash(params.beforeMarkdown),
    afterHash: simpleHash(params.afterMarkdown),
    affectedSectionIds: estimateAffectedSections(params.beforeMarkdown, params.afterMarkdown),
  }
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    timeline: [...project.timeline, manualEdit],
  }
}

export function addPhaseMarker(project: Project): Project {
  const marker: PhaseMarker = {
    id: crypto.randomUUID(),
    type: 'phase_marker',
    label: 'Initial Setup',
    createdAt: new Date().toISOString(),
  }
  return { ...project, timeline: [...project.timeline, marker] }
}

export function answerInitialConfirmation(
  project: Project,
  params: { questionId: string; answerMarkdown: string; reflectedMarkdown: string },
): Project {
  const now = new Date().toISOString()
  const timeline = project.timeline.map((item): TimelineItem => {
    if (item.type === 'question' && item.id === params.questionId) {
      return {
        ...item,
        status: 'answered' as const,
        answer: params.answerMarkdown,
        answeredAt: now,
        reflectedToSpec: true,
        reflectedMarkdown: params.reflectedMarkdown,
      }
    }
    return item
  })
  return { ...project, timeline, updatedAt: now }
}

export function retryQuestion(
  project: Project,
  params: { questionId: string; newQuestion: Question },
): Project {
  const idx = project.timeline.findIndex(
    (item) => item.type === 'question' && item.id === params.questionId,
  )
  if (idx === -1) return project
  const timeline = [
    ...project.timeline.slice(0, idx),
    params.newQuestion,
    ...project.timeline.slice(idx + 1),
  ]
  return { ...project, timeline }
}

export function failQuestion(
  project: Project,
  params: {
    questionId: string
    attemptedAnswer?: string
    attemptedSkip?: { reason: string; customText?: string }
  },
): Project {
  const now = new Date().toISOString()
  const timeline = project.timeline.map((item): TimelineItem => {
    if (item.type === 'question' && item.id === params.questionId) {
      return {
        ...item,
        status: 'failed' as const,
        failedAt: now,
        failureReason: 'target_section_not_found' as const,
        attemptedAnswer: params.attemptedAnswer,
        attemptedSkip: params.attemptedSkip,
      }
    }
    return item
  })
  return { ...project, timeline, updatedAt: now }
}

export function skipQuestion(
  project: Project,
  params: {
    questionId: string
    skipReason: string
    skipCustomText?: string
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
        skipCustomText: params.skipCustomText,
        skippedAt: now,
        reflectedToSpec: params.reflectedMarkdown !== undefined,
        reflectedMarkdown: params.reflectedMarkdown,
      }
    }
    return item
  })
  return { ...project, timeline }
}
