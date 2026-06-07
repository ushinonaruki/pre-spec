export function buildSkipMarkerBodyPrompt(params: {
  sectionTitle: string
  questionText: string
  proposedMarkdown?: string
  aiGuess?: { value: string; rationale: string }
  skipReason: string
  skipInstruction: string
  spec: string
  referencesMarkdown: string
  timelineContext: string
}): string {
  const proposedSection = params.proposedMarkdown?.trim()
    ? `\n提案 Markdown:\n${params.proposedMarkdown}\n`
    : ''
  const aiGuessSection = params.aiGuess
    ? `\nAI推定値: ${params.aiGuess.value}\n推定根拠: ${params.aiGuess.rationale}\n`
    : ''
  const memoSection = params.referencesMarkdown.trim()
    ? `\nReferences:\n${params.referencesMarkdown}\n`
    : ''
  const logSection = params.timelineContext.trim()
    ? `\nTimeline:\n${params.timelineContext}\n`
    : ''

  return `あなたは pre-spec の skip marker 生成エンジンです。

以下の質問がスキップされました。spec.md に残す未決事項文を 1〜2 文で生成してください。

セクション: ${params.sectionTitle}
質問: ${params.questionText}
${proposedSection}${aiGuessSection}
現在の spec.md:
${params.spec}
${memoSection}${logSection}
指示: ${params.skipInstruction}

ルール:
- 質問文をそのまま返さない
- spec.md に残る未決事項として読める文にする
- 指示の意味を反映する
- proposedMarkdown がある場合は、それを優先して未決内容を表現する
- 確定事項として書かない
- 日本語で簡潔にする (1〜2 文)

有効な JSON のみを返してください（マークダウンコードフェンス・説明文不要）:
{ "markerBody": "..." }`
}
