import type { MarkerContext, Question, RelatedSourceKind, Section } from '@/types'
import { KIND_CANDIDATES, PRIORITY_CANDIDATES } from '@/lib/config/questionTaxonomy'

export function buildInitialConfirmationQuestionsPrompt(params: {
  requirementMemo: string
  referencesMarkdown: string
  sections: Section[]
}): string {
  const sectionTitles = params.sections.map((s) => `- ${s.title}`).join('\n')
  const refSection = params.referencesMarkdown.trim()
    ? `\nReferences:\n${params.referencesMarkdown}\n`
    : ''

  return `あなたは pre-spec の初期反映質問生成エンジンです。

入力材料を読んで、spec.md の各セクションに「初期配置すべき候補」があれば、反映質問として列挙してください。

## 入力材料

要件定義メモ:
${params.requirementMemo}
${refSection}
## spec.md セクション一覧

${sectionTitles}

## ルール

- spec.md 全文を生成しない
- 入力材料から明確に spec.md へ初期配置すべき候補だけを質問にする
- 1質問 = 1つの反映候補
- sectionTitle は上記セクション一覧の title から選ぶ
- proposedMarkdown は、そのセクションに追記できる Markdown にする（箇条書き推奨）
- 重複質問・薄い確認・単なる言い換えは作らない
- 実装上意味のない確認は作らない
- 判断できないものは質問にせず省く
- 質問数に固定上限なし（必要な数だけ、ただし過剰に作らない）
- 質問は日本語で記述する

kinds 候補: ${KIND_CANDIDATES}
priority 候補: ${PRIORITY_CANDIDATES}

有効な JSON のみを返してください（マークダウンコードフェンス・説明文不要）:
{
  "questions": [
    {
      "sectionTitle": "(セクション名)",
      "text": "(セクション名) に以下を置いてよいですか？",
      "reason": "要件定義メモから読み取れるため",
      "kinds": ["scope"],
      "priority": "high",
      "proposedMarkdown": "- ..."
    }
  ]
}`
}

export function buildAnswerFormatPrompt(params: {
  currentHeading: string
  question: string
  answer: string
  currentSpec: string
  referencesMarkdown: string
  recentTimelineLog: string
}): string {
  const memoSection = params.referencesMarkdown.trim()
    ? `\nReferences:\n${params.referencesMarkdown}\n`
    : ''
  const logSection = params.recentTimelineLog.trim()
    ? `\n直近ログ (末尾):\n${params.recentTimelineLog}\n`
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

function buildMarkerContextSection(contexts: MarkerContext[]): string {
  if (!contexts.length) return ''
  const lines: string[] = [
    '',
    'Marker Context:',
    '',
    'The following pre-spec markers are present in spec.md.',
    'Use them as reading instructions when generating questions.',
    '',
    'Marked content is provided as-is.',
    'Do not treat marker instructions as confirmed requirements by themselves.',
    'Do not silently rewrite marked content.',
    'If a marker instruction suggests caution, generate a confirmation question instead of changing the marked content.',
    '',
  ]
  for (const ctx of contexts) {
    lines.push(`- marker: ${ctx.name}`)
    lines.push(`  label: ${ctx.label}`)
    lines.push(`  instruction: ${ctx.instruction}`)
    lines.push('  targets:')
    for (const t of ctx.targets) {
      lines.push(`    - type: ${t.markerType}`)
      lines.push('      text:')
      for (const tl of t.text.split('\n')) {
        lines.push(`        ${tl}`)
      }
    }
  }
  return lines.join('\n') + '\n'
}

export function buildInitialConfirmationAnswerFormatPrompt(params: {
  sectionTitle: string
  questionText: string
  proposedMarkdown: string
  answer: string
  currentSpec: string
  referencesMarkdown: string
}): string {
  const memoSection = params.referencesMarkdown.trim()
    ? `\nReferences:\n${params.referencesMarkdown}\n`
    : ''
  const proposedSection = params.proposedMarkdown.trim()
    ? `\n提案 Markdown:\n${params.proposedMarkdown}\n`
    : ''
  return `あなたは pre-spec の初期反映回答整形エンジンです。

初期反映の提案に対するユーザーの回答を受けて、spec.md への反映内容を決定してください。

現在の spec.md:
${params.currentSpec}${memoSection}
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

export type RelatedSourceReviewResult = {
  status: 'ok' | 'unreadable'
  content?: string
  reason?: string
}

export function buildRelatedSourceReviewPrompt(params: {
  name: string
  kind: RelatedSourceKind
  content: string
  note?: string
}): string {
  const noteSection = params.note?.trim()
    ? `\n読み方指示:\n${params.note}\n`
    : ''

  const suffix = `
ルール:
- 読める場合: status を "ok" にして、references.md の Imported block 本文として使う content を返す
- 読めない・アクセスできない・意味のある内容が抽出できない場合: status を "unreadable" にして reason を返す
- content は Markdown 形式で仕様化に役立つ情報のみを整理して返す
- spec.md の書き換えは行わない
- 日本語で記述する

有効な JSON のみを返してください（マークダウンコードフェンス・説明文不要）:
{
  "status": "ok",
  "content": "..."
}
または
{
  "status": "unreadable",
  "reason": "..."
}`

  if (params.kind === 'url') {
    return `あなたは pre-spec の関連資料確認エンジンです。

以下の URL を確認して、仕様化に使える知識・制約・注意点を整理してください。

URL: ${params.content}
${noteSection}${suffix}`
  }

  return `あなたは pre-spec の関連資料確認エンジンです。

以下の関連資料を読んで、仕様化に使える知識・制約・注意点を整理してください。

資料名: ${params.name}
種別: ${params.kind === 'file' ? 'user upload' : 'user input'}
${noteSection}
資料本文:
${params.content}
${suffix}`
}

export type SkipMarkerBodyResult = {
  markerBody: string
}

export function buildSkipMarkerBodyPrompt(params: {
  sectionTitle: string
  questionText: string
  questionType?: 'initial_confirmation' | 'section_question'
  proposedMarkdown?: string
  aiGuess?: { value: string; rationale: string }
  skipReason: string
  skipInstruction: string
  isCustom: boolean
}): string {
  const proposedSection = params.proposedMarkdown?.trim()
    ? `\n提案 Markdown:\n${params.proposedMarkdown}\n`
    : ''
  const aiGuessSection = params.aiGuess
    ? `\nAI推定値: ${params.aiGuess.value}\n推定根拠: ${params.aiGuess.rationale}\n`
    : ''

  return `あなたは pre-spec の skip marker 生成エンジンです。

以下の質問がスキップされました。spec.md に残す未決事項文を 1〜2 文で生成してください。

セクション: ${params.sectionTitle}
質問: ${params.questionText}
${proposedSection}${aiGuessSection}
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

export type RetryQuestionResult = {
  text: string
  reason?: string
  kinds?: string[]
  priority?: string
  aiGuess?: { value: string; rationale: string }
  proposedMarkdown?: string
}

export function buildRetryQuestionPrompt(params: {
  sectionTitle: string
  originalQuestion: Pick<Question, 'text' | 'questionType' | 'kinds' | 'priority' | 'aiGuess' | 'reason' | 'proposedMarkdown'>
  spec: string
  referencesMarkdown: string
}): string {
  const { sectionTitle, originalQuestion, spec, referencesMarkdown } = params
  const isInitial = originalQuestion.questionType === 'initial_confirmation'

  const memoSection = referencesMarkdown.trim() ? `\nReferences:\n${referencesMarkdown}\n` : ''

  const kindsStr = originalQuestion.kinds?.length ? originalQuestion.kinds.join(' / ') : '(なし)'
  const priorityStr = originalQuestion.priority ?? '(なし)'
  const aiGuessStr = originalQuestion.aiGuess
    ? `\nAI推定値: ${originalQuestion.aiGuess.value}\n推定根拠: ${originalQuestion.aiGuess.rationale}`
    : ''
  const reasonStr = originalQuestion.reason ? `\n質問の意図: ${originalQuestion.reason}` : ''
  const proposedStr = isInitial && originalQuestion.proposedMarkdown?.trim()
    ? `\n提案 Markdown:\n${originalQuestion.proposedMarkdown}`
    : ''

  const outputFormat = isInitial
    ? `{
  "text": "...",
  "reason": "...",
  "kinds": ["scope"],
  "priority": "high",
  "proposedMarkdown": "- ..."
}`
    : `{
  "text": "...",
  "reason": "...",
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
質問文: ${originalQuestion.text}${reasonStr}
kinds: ${kindsStr}
priority: ${priorityStr}${aiGuessStr}${proposedStr}

## 現在の spec.md

${spec}
${memoSection}
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

export function buildQuestionTimelinePrompt(params: {
  sectionTitle: string
  spec: string
  referencesMarkdown: string
  existingQuestions: string[]
  recentTimelineLog: string
  markerContexts?: MarkerContext[]
}): string {
  const memoSection = params.referencesMarkdown.trim()
    ? `\nReferences:\n${params.referencesMarkdown}\n`
    : ''
  const logSection = params.recentTimelineLog.trim()
    ? `\n直近タイムラインログ:\n${params.recentTimelineLog}\n`
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
      "reason": "...",
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
