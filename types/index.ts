export type SkipReason = string

export type SkipReasonDefinition = {
  label: string
  instruction: string
}

export type SkipReasonDefinitionFile = {
  skipReasons: Record<string, SkipReasonDefinition>
}

export type Section = {
  id: string
  title: string
  level: 2
  order: number
}

import type { QuestionKind, QuestionPriority } from '@/lib/config/questionTaxonomy'
export type { QuestionKind, QuestionPriority }

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
  kinds?: QuestionKind[]
  priority?: QuestionPriority
  aiGuess?: {
    value: string
    rationale: string
  }
  proposedMarkdown?: string
  status: 'open' | 'answered' | 'skipped'
  answer?: string
  skipReason?: SkipReason
  skipCustomText?: string
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
  memo: string
  relatedSources: RelatedSource[]
  sections: Section[]
  currentSectionId: string | null
  timeline: TimelineItem[]
}

export type AnswerFormatResult = {
  specInsertionMarkdown: string
  aggregationLogSummary: string
  openQuestionInsertions: string[]
}

export type RelatedSourceKind = 'file' | 'url'

export type RelatedSource = {
  id: string
  kind: RelatedSourceKind
  name: string
  note?: string
  url?: string
  addedAt: string
}

export type MarkerDefinition = {
  label: string
  description: string
  questionInstruction?: string
}

export type MarkerDefinitionFile = {
  markers: Record<string, MarkerDefinition>
}

export type MarkerTarget = {
  markerType: 'inline' | 'range'
  text: string
}

export type MarkerContext = {
  name: string
  label: string
  description: string
  questionInstruction?: string
  targets: MarkerTarget[]
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
    relatedSources: RelatedSource[]
  }
  workspace: {
    draftSpecMarkdown: string
    referencesMarkdown: string
    currentSectionId: string | null
    sections: Section[]
    timeline: TimelineItem[]
  }
}
