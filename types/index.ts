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

export type SectionMarker = {
  id: string
  type: 'section_marker'
  sectionId: string
  sectionTitle: string
  createdAt: string
}

export type Question = {
  id: string
  type: 'question'
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
  status: 'open' | 'answered' | 'skipped'
  answer?: string
  skipReason?: SkipReason
  skipDetail?: string
  createdAt: string
  answeredAt?: string
}

export type TimelineItem = SectionMarker | Question

export type Project = {
  id: string
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

export type AppState = {
  apiKey: string | null
  project: Project | null
  uiState: {
    activeTab: 'spec' | 'log' | 'memo'
  }
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
