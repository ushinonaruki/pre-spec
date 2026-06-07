import type { MarkerContext } from '@/src/types'
import { KIND_CANDIDATES, PRIORITY_CANDIDATES, buildMarkerContextSection } from './promptHelpers'

export function buildQuestionTimelinePrompt(params: {
  sectionTitle: string
  spec: string
  referencesMarkdown: string
  existingQuestions: string[]
  timelineContext: string
  markerContexts?: MarkerContext[]
}): string {
  const memoSection = params.referencesMarkdown.trim()
    ? `\nReferences:\n${params.referencesMarkdown}\n`
    : ''
  const logSection = params.timelineContext.trim()
    ? `\nTimeline:\n${params.timelineContext}\n`
    : ''
  const existingSection = params.existingQuestions.length
    ? `\n既出質問 (重複・類似禁止):\n${params.existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : ''
  const markerSection = buildMarkerContextSection(params.markerContexts ?? [])

  return `あなたは pre-spec の質問生成エンジンです。

現在の spec.md・現在セクション・参照メモ・直近ログ・既出質問をもとに、
現在セクションに関する質問を 1〜5 問生成してください。

現在セクション: ## ${params.sectionTitle}

spec.md:
${params.spec}
${memoSection}${logSection}${existingSection}${markerSection}
ルール:
- 他のセクションへ飛ばない
- 既出質問と重複・類似しない
- 既に決まっていることを再質問しない
- 参照メモから推定できる場合は aiGuess を付ける
- aiGuess には value (推定値) と rationale (根拠) を含める
- ユーザーが採用・修正しやすい推定を出す
- 質問には kinds と priority を付ける
- kinds は配列で、質問の観点として当てはまるものだけを入れる（重複なし・無関係なものは入れない）
- priority high の質問を先に並べる
- 質問数は 1〜5 問
- 無理に 5 問出さない
- 本当に聞くべき質問だけを出す
- 質問は日本語で記述する

kinds 候補: ${KIND_CANDIDATES}
priority 候補: ${PRIORITY_CANDIDATES}

有効な JSON のみを返してください (マークダウンコードフェンス・説明文不要):
{
  "questions": [
    {
      "text": "...",
      "kinds": ["scope"],
      "priority": "high",
      "aiGuess": {
        "value": "...",
        "rationale": "..."
      }
    }
  ]
}`
}
