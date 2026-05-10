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
  questionType: 'initial_confirmation' | 'section_question'
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
  status: 'open' | 'answered' | 'skipped' | 'failed'
  answer?: string
  skipReason?: SkipReason
  skipCustomText?: string
  skippedAt?: string
  reflectedMarkdown?: string
  failedAt?: string
  failureReason?: 'target_section_not_found'
  attemptedAnswer?: string
  attemptedSkip?: { reason: string; customText?: string }
  createdAt: string
  answeredAt?: string
}

export type TimelineItem = PhaseMarker | SectionMarker | Question | ManualEdit

export type Project = {
  id: string
  fileBase: string
  createdAt: string
  updatedAt: string
  requirementMemo: string
  spec: string
  referencesMarkdown: string
  sections: Section[]
  currentSectionId: string | null
  timeline: TimelineItem[]
}

export type AnswerFormatResult = {
  specInsertionMarkdown: string
}

export type RelatedSourceKind = 'file' | 'url'

export type MarkerDefinition = {
  label: string
  instruction: string
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
  instruction: string
  targets: MarkerTarget[]
}

export type PreSpecProject = {
  version: string
  project: {
    id: string
    fileBase: string
    createdAt: string
    updatedAt: string
  }
  inputs: {
    requirementMemo: string
  }
  workspace: {
    draftSpecMarkdown: string
    referencesMarkdown: string
    currentSectionId: string | null
    sections: Section[]
    timeline: TimelineItem[]
  }
}
