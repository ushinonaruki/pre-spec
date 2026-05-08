export type SkipReason =
  | 'thinking'
  | 'need_confirm'
  | 'need_research'
  | 'defer_to_implementation'
  | 'low_priority'

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  thinking: 'まだ考えていない',
  need_confirm: '他者確認待ち',
  need_research: '既存仕様・コード調査待ち',
  defer_to_implementation: 'この粒度では細かすぎる',
  low_priority: '重要度が低い',
}

export type Section = {
  id: string
  title: string
  level: 2
  order: number
}

export type QuestionKind =
  | 'decision'
  | 'constraint'
  | 'risk'
  | 'scope'
  | 'data'
  | 'flow'
  | 'assumption'

export type QuestionPriority = 'high' | 'medium' | 'low'

export type PhaseMarker = {
  id: string
  type: 'phase_marker'
  label: 'Initial Setup'
  createdAt: string
}

export type SectionMarker = {
  id: string
  type: 'section_marker'
  sectionId: string
  sectionTitle: string
  createdAt: string
}

export type ManualEdit = {
  id: string
  type: 'manual_edit'
  createdAt: string
  memo?: string
  beforeHash: string
  afterHash: string
  affectedSectionIds: string[]
}

export type Question = {
  id: string
  type: 'question'
  questionType?: 'initial_confirmation' | 'section_question'
  sectionId: string
  sectionTitle: string
  text: string
  reason?: string
  kind?: QuestionKind
  priority?: QuestionPriority
  aiGuess?: {
    value: string
    rationale: string
  }
  proposedMarkdown?: string
  status: 'open' | 'answered' | 'skipped'
  answer?: string
  skipReason?: SkipReason
  skipDetail?: string
  skippedAt?: string
  reflectedToSpec?: boolean
  reflectedMarkdown?: string
  createdAt: string
  answeredAt?: string
}

export type TimelineItem = PhaseMarker | SectionMarker | Question | ManualEdit

export type Project = {
  id: string
  slug: string
  createdAt: string
  updatedAt: string
  initialPrompt: string
  spec: string
  log: string
  memo: string
  sections: Section[]
  currentSectionId: string | null
  timeline: TimelineItem[]
}

export type AnswerFormatResult = {
  specInsertionMarkdown: string
  aggregationLogSummary: string
  openQuestionInsertions: string[]
}

export type RelatedSource = {
  id: string
  label: string
  kind: 'file' | 'url' | 'github_file' | 'text' | 'diff'
  status: 'readable' | 'unreadable'
  checkedAt: string
  importedToReference: boolean
  note?: string
  error?: string
}

export type CustomMarkerDefinition = {
  label: string
  description?: string
  questionInstruction?: string
}

export type PreSpecProject = {
  version: string
  project: {
    id: string
    title?: string
    slug: string
    createdAt: string
    updatedAt: string
  }
  inputs: {
    requirementMemo: string
    baseSpecSourceId?: string
    relatedSources: RelatedSource[]
  }
  workspace: {
    draftSpecMarkdown: string
    referenceMarkdown: string
    currentSectionId: string | null
    sections: Section[]
    timeline: TimelineItem[]
  }
  markers: {
    custom: Record<string, CustomMarkerDefinition>
  }
}
