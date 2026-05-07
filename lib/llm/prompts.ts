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
    ? `\nReference memo:\n${params.referenceMemo}\n`
    : ''
  const logSection = params.recentLog.trim()
    ? `\nRecent log (last entries):\n${params.recentLog}\n`
    : ''
  return `You are a software specification assistant.

The user has answered a clarifying question about a specific section of a spec document.
Format their answer into clean, readable Markdown to be appended under that section.

Current spec:
${params.currentSpec}
${memoSection}${logSection}
Current heading: ## ${params.currentHeading}

Question: ${params.question}

User's answer: ${params.answer}

Rules:
- Return ONLY the content to be inserted under "## ${params.currentHeading}" — do NOT rewrite the whole spec
- Write in Japanese
- Do not over-generalize; reflect exactly what the user said
- Do not mix confirmed facts with speculation
- Do not duplicate content already present in the spec
- If the answer contains unresolved items or uncertainties, list them in "openQuestionInsertions" (plain strings, no bullet prefix)
- Keep insertion concise and actionable (bullet points preferred)

Return valid JSON only (no markdown code fences, no explanation):
{
  "specInsertionMarkdown": "- ...",
  "aggregationLogSummary": "...",
  "openQuestionInsertions": []
}`
}

export function buildQuestionTimelinePrompt(params: {
  headingTitle: string
  spec: string
  memo: string
  existingQuestions: string[]
  recentAggregationLog: string
}): string {
  const memoSection = params.memo.trim()
    ? `\nMemo/Reference notes:\n${params.memo}\n`
    : ''
  const logSection = params.recentAggregationLog.trim()
    ? `\nRecent aggregation log:\n${params.recentAggregationLog}\n`
    : ''
  const existingSection = params.existingQuestions.length
    ? `\nAlready asked questions (do NOT repeat or closely paraphrase these):\n${params.existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : ''

  return `You are a software specification assistant helping to elaborate a feature spec.

Current specification:
${params.spec}
${memoSection}${logSection}${existingSection}Generate 1 to 5 questions to clarify the "## ${params.headingTitle}" section.

Rules:
- Questions must focus ONLY on "${params.headingTitle}"
- Do not ask about other sections
- Do not re-ask things already decided in the spec
- Do not repeat or closely paraphrase already-asked questions listed above
- Only ask questions that are genuinely unclear or unresolved — if the section is already well-defined, 1 or 2 questions is fine
- Do not force 5 questions; quality over quantity
- If you can infer an answer from the spec or memo, include aiGuess
- Write questions in Japanese
- Keep questions non-mandatory (user can skip any)
- Assign each question a "kind" from: decision, constraint, risk, scope, data, flow, assumption
- Assign each question a "priority" from: high, medium, low
- Sort questions with "priority": "high" first

Return valid JSON only (no markdown code fences, no explanation):
{
  "questions": [
    {
      "id": "q_1",
      "text": "...",
      "reason": "...",
      "kind": "scope",
      "priority": "high",
      "aiGuess": { "value": "...", "rationale": "..." },
      "options": ["推定でOK", "別の方針を入力"]
    }
  ]
}`
}
