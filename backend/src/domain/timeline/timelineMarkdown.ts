import type { Question, TimelineItem } from '@/src/types'
import { TIMELINE_TEXT } from '@/src/text/timelineText'

const APP_LOCALE = process.env.APP_LOCALE ?? 'ja-JP'
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'Asia/Tokyo'

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(APP_LOCALE, { timeZone: APP_TIMEZONE })
  } catch {
    return iso
  }
}

export function generateTimelineMarkdown(timeline: TimelineItem[]): string {
  if (timeline.length === 0) return `${TIMELINE_TEXT.heading}\n\n${TIMELINE_TEXT.empty}\n`

  const lines: string[] = [TIMELINE_TEXT.heading, '']

  for (const item of timeline) {
    if (item.type === 'phase_marker') {
      lines.push(`## ${item.label}`)
      lines.push('')
      lines.push(`- ${TIMELINE_TEXT.createdAtLabel}: ${formatTimestamp(item.createdAt)}`)
      lines.push(`- ${TIMELINE_TEXT.updatedAtLabel}: ${formatTimestamp(item.updatedAt)}`)
      lines.push('')
    } else if (item.type === 'section_marker') {
      lines.push(TIMELINE_TEXT.sectionMarker(item.sectionTitle))
      lines.push('')
      lines.push(`- ${TIMELINE_TEXT.createdAtLabel}: ${formatTimestamp(item.createdAt)}`)
      lines.push(`- ${TIMELINE_TEXT.updatedAtLabel}: ${formatTimestamp(item.updatedAt)}`)
      lines.push('')
    } else if (item.type === 'question') {
      const q = item as Question
      const kindStr = q.kinds?.length ? q.kinds.join(' / ') : undefined
      const meta = [q.priority, kindStr].filter(Boolean).join(TIMELINE_TEXT.metaSeparator)
      const prefix = q.status === 'failed'
        ? `${TIMELINE_TEXT.questionPrefixFailed} ${q.sectionTitle}`
        : q.questionType === 'initial_confirmation' ? TIMELINE_TEXT.questionPrefixInitial : TIMELINE_TEXT.questionPrefix
      lines.push(`${prefix} ${meta ? `[${meta}] ` : ''}${q.text}`)
      if (q.aiGuess) lines.push(`*${TIMELINE_TEXT.aiGuessLabel}: ${q.aiGuess.value}*`)
      if (q.proposedMarkdown) lines.push(`*${TIMELINE_TEXT.proposedLabel}: ${q.proposedMarkdown}*`)

      if (q.status === 'answered') {
        lines.push(TIMELINE_TEXT.statusAnswered)
        if (q.answer) lines.push(`  - ${TIMELINE_TEXT.answerLabel}: ${q.answer}`)
        if (q.reflectedMarkdown) {
          lines.push(`  - ${TIMELINE_TEXT.reflectedLabel}:`)
          lines.push(`    ${q.reflectedMarkdown}`)
        }
        lines.push(`  - ${TIMELINE_TEXT.createdAtLabel}: ${formatTimestamp(q.createdAt)}`)
        lines.push(`  - ${TIMELINE_TEXT.updatedAtLabel}: ${formatTimestamp(q.updatedAt)}`)
      } else if (q.status === 'skipped') {
        lines.push(TIMELINE_TEXT.statusSkipped)
        if (q.skipReason) lines.push(`  - ${TIMELINE_TEXT.reasonLabel}: ${q.skipReason}`)
        if (q.skipCustomText) lines.push(`  - ${TIMELINE_TEXT.detailLabel}: ${q.skipCustomText}`)
        if (q.reflectedMarkdown) {
          lines.push(`  - ${TIMELINE_TEXT.reflectedLabel}:`)
          lines.push(`    ${q.reflectedMarkdown}`)
        }
        lines.push(`  - ${TIMELINE_TEXT.createdAtLabel}: ${formatTimestamp(q.createdAt)}`)
        lines.push(`  - ${TIMELINE_TEXT.updatedAtLabel}: ${formatTimestamp(q.updatedAt)}`)
      } else if (q.status === 'failed') {
        lines.push(TIMELINE_TEXT.statusFailed)
        if (q.failureReason) lines.push(`  - ${TIMELINE_TEXT.failureReasonLabel}: ${q.failureReason}`)
        if (q.attemptedAnswer) lines.push(`  - ${TIMELINE_TEXT.attemptedAnswerLabel}: ${q.attemptedAnswer}`)
        if (q.attemptedSkip) {
          lines.push(`  - ${TIMELINE_TEXT.attemptedSkipLabel}: reason=${q.attemptedSkip.reason}${q.attemptedSkip.customText ? ` / ${q.attemptedSkip.customText}` : ''}`)
        }
        lines.push(`  - ${TIMELINE_TEXT.createdAtLabel}: ${formatTimestamp(q.createdAt)}`)
        lines.push(`  - ${TIMELINE_TEXT.updatedAtLabel}: ${formatTimestamp(q.updatedAt)}`)
      } else {
        lines.push(TIMELINE_TEXT.statusOpen)
        lines.push(`  - ${TIMELINE_TEXT.createdAtLabel}: ${formatTimestamp(q.createdAt)}`)
        lines.push(`  - ${TIMELINE_TEXT.updatedAtLabel}: ${formatTimestamp(q.updatedAt)}`)
      }
      lines.push('')
    } else if (item.type === 'manual_edit') {
      lines.push(TIMELINE_TEXT.manualEditHeading)
      lines.push('')
      lines.push(`- ${TIMELINE_TEXT.createdAtLabel}: ${formatTimestamp(item.createdAt)}`)
      lines.push(`- ${TIMELINE_TEXT.updatedAtLabel}: ${formatTimestamp(item.updatedAt)}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
