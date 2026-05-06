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

export type Heading = {
  id: string
  title: string
  level: 2
  status: 'unvisited' | 'in_progress' | 'done' | 'skipped'
  questionRound: number
}

export type Upload = {
  id: string
  name: string
  type: 'file' | 'url' | 'text'
  rawContent: string
  aiSummary?: string
  uploadedAt: string
  processed: boolean
}

export type Project = {
  id: string
  createdAt: string
  updatedAt: string
  initialPrompt: string
  uploads: Upload[]
  spec: string
  log: string
  memo: string
  headings: Heading[]
  currentHeadingId: string | null
  isCompleted: boolean
}

export type AppState = {
  apiKey: string | null
  project: Project | null
  uiState: {
    activeTab: 'spec' | 'log' | 'memo'
    activeHeadingId: string | null
  }
}
