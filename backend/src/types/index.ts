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
  updatedAt: string
}

export type SectionMarker = {
  id: string
  type: 'section_marker'
  sectionId: string
  sectionTitle: string
  createdAt: string
  updatedAt: string
}

export type ManualEdit = {
  id: string
  type: 'manual_edit'
  createdAt: string
  updatedAt: string
}

export type Question = {
  id: string
  type: 'question'
  questionType: 'initial_confirmation' | 'section_question'
  sectionId: string
  sectionTitle: string
  text: string
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
  reflectedMarkdown?: string
  failureReason?: 'target_section_not_found'
  attemptedAnswer?: string
  attemptedSkip?: { reason: string; customText?: string }
  createdAt: string
  updatedAt: string
}

export type TimelineItem = PhaseMarker | SectionMarker | Question | ManualEdit

export type Feature = {
  id: string
  slug: string
  references: string
  timeline: TimelineItem[]
  spec: string
  sections: Section[]
  currentSectionId?: string
}

export type Workspace = {
  id: string
  slug: string
  references: string
  features: Feature[]
  activeFeatureId?: string
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

export type PreSpecWorkspace = {
  version: string
  workspace: {
    id: string
    slug: string
    references: string
    activeFeatureId?: string
    features: Array<{
      id: string
      slug: string
      references: string
      spec: string
      sections: Section[]
      currentSectionId?: string
      timeline: TimelineItem[]
    }>
  }
}
