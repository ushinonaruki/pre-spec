import type { MarkerContext, Question } from '@/src/types'
import { KIND_CANDIDATES, PRIORITY_CANDIDATES, buildMarkerContextSection } from './promptHelpers'

export type RetryQuestionResult = {
  text: string
  kinds?: string[]
  priority?: string
  aiGuess?: { value: string; rationale: string }
  proposedMarkdown?: string
}

export function buildRetryQuestionPrompt(params: {
  sectionTitle: string
  originalQuestion: Pick<Question, 'text' | 'questionType' | 'kinds' | 'priority' | 'aiGuess' | 'proposedMarkdown'>
  spec: string
  referencesMarkdown: string
  timelineContext: string
  markerContexts?: MarkerContext[]
}): string {
  const { sectionTitle, originalQuestion, spec, referencesMarkdown } = params
  const isInitial = originalQuestion.questionType === 'initial_confirmation'

  const memoSection = referencesMarkdown.trim() ? `\nReferences:\n${referencesMarkdown}\n` : ''
  const logSection = params.timelineContext.trim()
    ? `\nTimeline:\n${params.timelineContext}\n`
    : ''
  const markerSection = buildMarkerContextSection(params.markerContexts ?? [])

  const kindsStr = originalQuestion.kinds?.length ? originalQuestion.kinds.join(' / ') : '(なし)'
  const priorityStr = originalQuestion.priority ?? '(なし)'
  const aiGuessStr = originalQuestion.aiGuess
    ? `\nAI推定値: ${originalQuestion.aiGuess.value}\n推定根拠: ${originalQuestion.aiGuess.rationale}`
    : ''
  const proposedStr = isInitial && originalQuestion.proposedMarkdown?.trim()
    ? `\n提案 Markdown:\n${originalQuestion.proposedMarkdown}`
    : ''

  const outputFormat = isInitial
    ? `{
  "text": "...",
  "kinds": ["scope"],
  "priority": "high",
  "proposedMarkdown": "- ..."
}`
    : `{
  "text": "...",
  "kinds": ["scope"],
  "priority": "high",
  "aiGuess": {
    "value": "...",
    "rationale": "..."
  }
}`

  return `あなたは pre-spec の質問リトライエンジンです。

以下の質問がユーザーに「意図がわからない」と判断されました。
同じ対象セクション・同じ意図を保ちながら、より回答しやすい形に質問を作り直してください。

## 元の質問情報

セクション: ## ${sectionTitle}
質問文: ${originalQuestion.text}
kinds: ${kindsStr}
priority: ${priorityStr}${aiGuessStr}${proposedStr}

## 現在の spec.md

${spec}
${memoSection}${logSection}${markerSection}
## ルール

- セクションは変えない（"## ${sectionTitle}" のみを対象にする）
- 元の質問と同じ意図・判断ポイントを保つ
- 元の質問より具体的・回答しやすい表現にする
- 元の質問文をそのまま返さない
- kinds / priority は元の値を維持するか、より適切な値に調整する
${isInitial ? '- proposedMarkdown は元の提案を引き継ぐか、より適切な形に調整する\n' : ''}- aiGuess がある場合は内容を維持するか、より正確な推定に更新する
- 日本語で記述する

kinds 候補: ${KIND_CANDIDATES}
priority 候補: ${PRIORITY_CANDIDATES}

有効な JSON のみを返してください（マークダウンコードフェンス・説明文不要）:
${outputFormat}`
}
