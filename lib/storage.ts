import type { AppState, Project, Question, QuestionKind, QuestionPriority, SectionMarker, SkipReason, TimelineItem } from '@/types'
import { extractSections } from '@/lib/markdown'

const KEY = 'pre-spec-v1'

const DEFAULT_STATE: AppState = {
  apiKey: null,
  project: null,
  uiState: {
    activeTab: 'spec',
  },
}

function migrateProject(raw: Record<string, unknown>): Project {
  // Already new format
  if (Array.isArray(raw.sections) && Array.isArray(raw.timeline)) {
    return raw as unknown as Project
  }

  const spec = (raw.spec as string) ?? ''
  const sections = extractSections(spec)

  // Build heading-id → section-id map (h-slug-n → s-slug-n)
  const headingToSectionId = new Map<string, string>()
  const oldHeadings = (raw.headings as Array<{ id: string; title: string }>) ?? []
  for (const h of oldHeadings) {
    const newId = h.id.replace(/^h-/, 's-')
    headingToSectionId.set(h.id, newId)
  }

  // currentSectionId from old currentHeadingId
  const oldCurrentId = raw.currentHeadingId as string | null
  const currentSectionId = oldCurrentId
    ? (headingToSectionId.get(oldCurrentId) ?? sections[0]?.id ?? null)
    : sections[0]?.id ?? null

  // Migrate questionTimelines → global timeline
  type OldQuestion = {
    id?: string
    text?: string
    reason?: string
    kind?: string
    priority?: string
    aiGuess?: { value: string; rationale: string }
    status?: string
    answer?: string
    skipReason?: string
    skipDetail?: string
    createdAt?: string
    answeredAt?: string
  }
  type OldTimeline = { headingId: string; questions: OldQuestion[] }
  const oldTimelines = (raw.questionTimelines as Record<string, OldTimeline>) ?? {}

  const timeline: TimelineItem[] = []

  for (const qt of Object.values(oldTimelines)) {
    const sectionId = headingToSectionId.get(qt.headingId) ?? qt.headingId.replace(/^h-/, 's-')
    const section = sections.find((s) => s.id === sectionId)
    if (!section) continue

    const qs = qt.questions ?? []
    if (qs.length === 0) continue

    // Section marker before the questions
    const marker: SectionMarker = {
      id: crypto.randomUUID(),
      type: 'section_marker',
      sectionId: section.id,
      sectionTitle: section.title,
      createdAt: (qs[0].createdAt as string) ?? new Date().toISOString(),
    }
    timeline.push(marker)

    for (const q of qs) {
      const question: Question = {
        id: (q.id as string) ?? crypto.randomUUID(),
        type: 'question',
        sectionId: section.id,
        sectionTitle: section.title,
        text: (q.text as string) ?? '',
        reason: q.reason as string | undefined,
        kind: q.kind as QuestionKind | undefined,
        priority: q.priority as QuestionPriority | undefined,
        aiGuess: q.aiGuess as { value: string; rationale: string } | undefined,
        status: ((q.status as string) ?? 'open') as 'open' | 'answered' | 'skipped',
        answer: q.answer as string | undefined,
        skipReason: q.skipReason as SkipReason | undefined,
        skipDetail: q.skipDetail as string | undefined,
        createdAt: (q.createdAt as string) ?? new Date().toISOString(),
        answeredAt: q.answeredAt as string | undefined,
      }
      timeline.push(question)
    }
  }

  // If timeline empty after migration, add initial section marker
  if (timeline.length === 0 && sections.length > 0) {
    const first = sections[0]
    timeline.push({
      id: crypto.randomUUID(),
      type: 'section_marker',
      sectionId: first.id,
      sectionTitle: first.title,
      createdAt: new Date().toISOString(),
    })
  }

  return {
    id: (raw.id as string) ?? crypto.randomUUID(),
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
    initialPrompt: (raw.initialPrompt as string) ?? '',
    spec,
    log: (raw.log as string) ?? '',
    memo: (raw.memo as string) ?? '',
    sections,
    currentSectionId,
    timeline,
  }
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const state: AppState = { ...DEFAULT_STATE, ...(parsed as Partial<AppState>) }
    if (state.project) {
      state.project = migrateProject(state.project as unknown as Record<string, unknown>)
    }
    return state
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function saveProject(project: Project): void {
  const state = loadState()
  saveState({ ...state, project: { ...project, updatedAt: new Date().toISOString() } })
}

export function resetProject(): void {
  const state = loadState()
  saveState({ ...state, project: null, uiState: { activeTab: 'spec' } })
}

export function saveApiKey(key: string): void {
  const state = loadState()
  saveState({ ...state, apiKey: key })
}
