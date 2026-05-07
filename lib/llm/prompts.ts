import type { Section } from '@/types'

export function buildInitialConfirmationQuestionsPrompt(params: {
  requirementMemo: string
  baseSpecMarkdown?: string
  referenceMarkdown: string
  sections: Section[]
}): string {
  const sectionTitles = params.sections.map((s) => `- ${s.title}`).join('\n')
  const baseSpecSection = params.baseSpecMarkdown?.trim()
    ? `\n下地 spec.md:\n${params.baseSpecMarkdown}\n`
    : ''
  const refSection = params.referenceMarkdown.trim()
    ? `\n参照.md:\n${params.referenceMarkdown}\n`
    : ''

  return `あなたは pre-spec の初期確認質問生成エンジンです。

入力材料を読んで、spec.md の各セクションに「初期配置すべき候補」があれば、確認質問として列挙してください。

## 入力材料

要件定義メモ:
${params.requirementMemo}
${baseSpecSection}${refSection}
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
- protected が必要そうな場合は [pre-spec:protected] を含める
- revisit が必要そうな場合は [pre-spec:revisit] を含める
- 質問数に固定上限なし（必要な数だけ、ただし過剰に作らない）
- 質問は日本語で記述する

kind 候補: decision / constraint / risk / scope / data / flow / assumption
priority 候補: high / medium / low

有効な JSON のみを返してください（マークダウンコードフェンス・説明文不要）:
{
  "questions": [
    {
      "sectionTitle": "Overview",
      "text": "Overview に以下を置いてよいですか？",
      "reason": "要件定義メモからプロダクト概要として読み取れるため",
      "kind": "scope",
      "priority": "high",
      "proposedMarkdown": "- ..."
    }
  ]
}`
}

export function buildInitialSpecPrompt(prompt: string): string {
  return `You are a software specification assistant. Based on the following feature description, generate a structured specification in Markdown.

Feature: ${prompt}

Generate the specification with exactly these sections (use ## for section headers):

# Feature Specification

## Overview

## Goals

## Non-Goals

## Current Context

## User Flow

## Requirements

## Data / State

## External References

## Confirmed Decisions

## Assumptions

## Open Questions

Write concise, actionable content in each section based on the description. Return ONLY the markdown, no preamble or explanation.`
}

export function buildAnswerFormatPrompt(params: {
  currentHeading: string
  question: string
  answer: string
  currentSpec: string
  referenceMemo: string
  recentLog: string
}): string {
  const memoSection = params.referenceMemo.trim()
    ? `\n参照メモ:\n${params.referenceMemo}\n`
    : ''
  const logSection = params.recentLog.trim()
    ? `\n直近ログ (末尾):\n${params.recentLog}\n`
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
- 未解決事項・不確実な内容が含まれる場合は "openQuestionInsertions" に入れる (プレフィックスなしの文字列)
- 日本語で記述する
- 追記内容は簡潔・アクション可能に (箇条書き推奨)

有効な JSON のみを返してください (マークダウンコードフェンス・説明文不要):
{
  "specInsertionMarkdown": "- ...",
  "aggregationLogSummary": "...",
  "openQuestionInsertions": []
}`
}

export function buildQuestionTimelinePrompt(params: {
  sectionTitle: string
  spec: string
  memo: string
  existingQuestions: string[]
  recentAggregationLog: string
}): string {
  const memoSection = params.memo.trim()
    ? `\n参照メモ:\n${params.memo}\n`
    : ''
  const logSection = params.recentAggregationLog.trim()
    ? `\n直近集約ログ:\n${params.recentAggregationLog}\n`
    : ''
  const existingSection = params.existingQuestions.length
    ? `\n既出質問 (重複・類似禁止):\n${params.existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : ''

  return `あなたは pre-spec の質問生成エンジンです。

現在の spec.md・現在セクション・参照メモ・直近ログ・既出質問をもとに、
現在セクションに関する質問を 1〜5 問生成してください。

現在セクション: ## ${params.sectionTitle}

spec.md:
${params.spec}
${memoSection}${logSection}${existingSection}
ルール:
- 他のセクションへ飛ばない
- 既出質問と重複・類似しない
- 既に決まっていることを再質問しない
- 参照メモから推定できる場合は aiGuess を付ける
- aiGuess には value (推定値) と rationale (根拠) を含める
- ユーザーが採用・修正しやすい推定を出す
- 質問には kind と priority を付ける
- priority high の質問を先に並べる
- 質問数は 1〜5 問
- 無理に 5 問出さない
- 本当に聞くべき質問だけを出す
- 質問は日本語で記述する

kind 候補: decision / constraint / risk / scope / data / flow / assumption
priority 候補: high / medium / low

有効な JSON のみを返してください (マークダウンコードフェンス・説明文不要):
{
  "questions": [
    {
      "text": "...",
      "reason": "...",
      "kind": "scope",
      "priority": "high",
      "aiGuess": {
        "value": "...",
        "rationale": "..."
      }
    }
  ]
}`
}
