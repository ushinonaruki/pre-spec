export function buildAnswerFormatPrompt(params: {
  currentHeading: string
  question: string
  answer: string
  currentSpec: string
  referencesMarkdown: string
  timelineContext: string
}): string {
  const memoSection = params.referencesMarkdown.trim()
    ? `\nReferences:\n${params.referencesMarkdown}\n`
    : ''
  const logSection = params.timelineContext.trim()
    ? `\nTimeline:\n${params.timelineContext}\n`
    : ''
  return `あなたは pre-spec の回答整形エンジンです。

ユーザーの回答を、対象セクション配下へ追記するための Markdown に整形してください。

現在の spec.md:
${params.currentSpec}
${memoSection}${logSection}
対象セクション: ## ${params.currentHeading}

質問: ${params.question}

ユーザーの回答: ${params.answer}

ルール:
- spec.md 全体を書き換えない
- "## ${params.currentHeading}" に追記するコンテンツだけを返す
- 回答を過度に一般化しない
- ユーザーが言ったことを正確に反映する
- 確定事項と推測を混在させない
- 既存コンテンツと重複しないようにする
- 日本語で記述する
- 追記内容は簡潔・アクション可能に (箇条書き推奨)

有効な JSON のみを返してください (マークダウンコードフェンス・説明文不要):
{
  "specInsertionMarkdown": "- ..."
}`
}

export function buildInitialConfirmationAnswerFormatPrompt(params: {
  sectionTitle: string
  questionText: string
  proposedMarkdown?: string
  answer: string
  currentSpec: string
  referencesMarkdown: string
  timelineContext: string
}): string {
  const memoSection = params.referencesMarkdown.trim()
    ? `\nReferences:\n${params.referencesMarkdown}\n`
    : ''
  const proposedSection = (params.proposedMarkdown?.trim() ?? '')
    ? `\n提案 Markdown:\n${params.proposedMarkdown}\n`
    : ''
  const logSection = params.timelineContext.trim()
    ? `\nTimeline:\n${params.timelineContext}\n`
    : ''
  return `あなたは pre-spec の初期反映回答整形エンジンです。

初期反映の提案に対するユーザーの回答を受けて、spec.md への反映内容を決定してください。

現在の spec.md:
${params.currentSpec}${memoSection}${logSection}
対象セクション: ## ${params.sectionTitle}

質問: ${params.questionText}
${proposedSection}
ユーザーの回答: ${params.answer}

ルール:
- ユーザーが承認 / OK / このままでよい の場合は提案 Markdown をそのまま specInsertionMarkdown にする
- ユーザーが修正を指示した場合は指示を反映して修正した内容を specInsertionMarkdown にする
- ユーザーが採用しない・不要と判断した場合は specInsertionMarkdown を空文字にする
- spec.md 全体を書き換えない
- "## ${params.sectionTitle}" に追記するコンテンツだけを返す
- 既存コンテンツと重複しないようにする
- 日本語で記述する

有効な JSON のみを返してください (マークダウンコードフェンス・説明文不要):
{
  "specInsertionMarkdown": "- ..."
}`
}
