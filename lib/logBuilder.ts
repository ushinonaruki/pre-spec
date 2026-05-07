import type { SkipReason } from '@/types'
import { SKIP_REASON_LABELS } from '@/types'

function formatTime(d: Date): string {
  return d.toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function appendAnswerLog(
  log: string,
  params: { heading: string; question: string; answer: string; summary?: string },
): string {
  return (
    log +
    `
## ${formatTime(new Date())} - ${params.heading}

**質問**: ${params.question}

**回答**: ${params.answer}
${params.summary ? `\n**反映**: ${params.summary}` : ''}
`
  )
}

export function appendSkipLog(
  log: string,
  params: { heading: string; question: string; reason: SkipReason; detail?: string },
): string {
  return (
    log +
    `
## ${formatTime(new Date())} - ${params.heading} (スキップ)

**質問**: ${params.question}

**スキップ理由**: ${SKIP_REASON_LABELS[params.reason]}${params.detail ? ' — ' + params.detail : ''}

**反映**: spec.md に skip marker を記録
`
  )
}

export function appendStartLog(log: string, params: { prompt: string }): string {
  return (
    log +
    `
## ${formatTime(new Date())} - プロジェクト開始

**初期要件**: ${params.prompt}
`
  )
}
