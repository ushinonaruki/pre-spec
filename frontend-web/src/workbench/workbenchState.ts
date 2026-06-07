export type SkipReason = string

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
  aiGuess?: { value: string; rationale: string }
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

export type EffectiveSkipReason =
  | { reason: string; label: string; instruction: string; isCustom: false }
  | { reason: 'custom'; label: string; isCustom: true }

export type FeaturePreflightResult = {
  featureSlug: string
  openQuestions: number
  skipMarkers: number
  markerCounts: Record<string, number>
  hasWarnings: boolean
}

export type WorkspacePreflightResult = {
  features: FeaturePreflightResult[]
  hasWarnings: boolean
}

export type PublicConfig = {
  markers: Record<string, { label: string }>
  skipReasons: Record<string, { label: string }>
  questionTaxonomy: {
    priorities: Record<string, string>
    kinds: Record<string, string>
  }
}

export type WorkbenchState = {
  workspaceSlug: string | null
  workspace: Workspace | null
  config: PublicConfig | null

  isCreatingWorkspace: boolean
  isCreatingFeature: boolean
  isGeneratingQuestion: boolean
  formattingQuestionId: string | null
  skippingQuestionId: string | null
  retryingQuestionId: string | null

  specEditMode: boolean
  specDraft: string

  error: string | null
}

export const INITIAL_STATE: WorkbenchState = {
  workspaceSlug: null,
  workspace: null,
  config: null,
  isCreatingWorkspace: false,
  isCreatingFeature: false,
  isGeneratingQuestion: false,
  formattingQuestionId: null,
  skippingQuestionId: null,
  retryingQuestionId: null,
  specEditMode: false,
  specDraft: '',
  error: null,
}
