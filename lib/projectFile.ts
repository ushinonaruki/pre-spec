import type { PreSpecProject, Project, TimelineItem } from '@/types'
import { TIMELINE_TEXT } from '@/lib/text/timelineText'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'

const CURRENT_VERSION = '1'

export function getProjectFilenames(fileBase: string) {
  return {
    spec: `${fileBase}.spec.md`,
    references: `${fileBase}.references.md`,
    timeline: `${fileBase}.timeline.md`,
    project: `${fileBase}.pre-spec.json`,
  }
}

export function projectToPreSpecProject(project: Project): PreSpecProject {
  return {
    version: CURRENT_VERSION,
    project: {
      id: project.id,
      fileBase: project.fileBase,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    workspace: {
      draftSpecMarkdown: project.spec,
      referencesMarkdown: project.referencesMarkdown,
      currentSectionId: project.currentSectionId,
      sections: project.sections,
      timeline: project.timeline,
    },
  }
}

export function preSpecProjectToProject(file: PreSpecProject): Project {
  const ws = file.workspace
  return {
    id: file.project.id,
    fileBase: file.project.fileBase,
    createdAt: file.project.createdAt,
    updatedAt: file.project.updatedAt,
    spec: ws.draftSpecMarkdown,
    referencesMarkdown: ws.referencesMarkdown,
    sections: ws.sections,
    currentSectionId: ws.currentSectionId,
    timeline: ws.timeline,
  }
}

export function validatePreSpecProject(raw: unknown): raw is PreSpecProject {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>

  if (typeof r.version !== 'string') return false

  const proj = r.project as Record<string, unknown> | undefined
  if (!proj || typeof proj !== 'object') return false
  if (typeof proj.id !== 'string') return false
  if (typeof proj.fileBase !== 'string' || !proj.fileBase) return false
  if (typeof proj.createdAt !== 'string') return false
  if (typeof proj.updatedAt !== 'string') return false

  const ws = r.workspace as Record<string, unknown> | undefined
  if (!ws || typeof ws !== 'object') return false
  if (typeof ws.draftSpecMarkdown !== 'string') return false
  if (typeof ws.referencesMarkdown !== 'string') return false
  if (!Array.isArray(ws.sections)) return false
  if (!Array.isArray(ws.timeline)) return false
  if (ws.currentSectionId !== null && typeof ws.currentSectionId !== 'string') return false

  return true
}

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
      lines.push(`\n## ${item.label}`)
      lines.push('')
    } else if (item.type === 'section_marker') {
      lines.push(TIMELINE_TEXT.sectionMarker(item.sectionTitle, formatTimestamp(item.createdAt)))
      lines.push('')
    } else if (item.type === 'question') {
      const q = item
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
        if (q.reflectedMarkdown) lines.push(`  ${q.reflectedMarkdown}`)
        if (q.answeredAt) lines.push(`  *${formatTimestamp(q.answeredAt)}*`)
      } else if (q.status === 'skipped') {
        lines.push(TIMELINE_TEXT.statusSkipped)
        if (q.skipReason) lines.push(`  - reason: ${q.skipReason}`)
        if (q.skipCustomText) lines.push(`  - detail: ${q.skipCustomText}`)
        if (q.reflectedMarkdown) {
          lines.push(`  - reflected:`)
          lines.push(`    ${q.reflectedMarkdown}`)
        }
      } else if (q.status === 'failed') {
        lines.push(TIMELINE_TEXT.statusFailed)
        if (q.failureReason) lines.push(`  - ${TIMELINE_TEXT.failureReasonLabel}: ${q.failureReason}`)
        if (q.failedAt) lines.push(`  - failedAt: ${formatTimestamp(q.failedAt)}`)
        if (q.attemptedAnswer) lines.push(`  - ${TIMELINE_TEXT.attemptedAnswerLabel}: ${q.attemptedAnswer}`)
        if (q.attemptedSkip) {
          lines.push(`  - ${TIMELINE_TEXT.attemptedSkipLabel}: reason=${q.attemptedSkip.reason}${q.attemptedSkip.customText ? ` / ${q.attemptedSkip.customText}` : ''}`)
        }
      } else {
        lines.push(TIMELINE_TEXT.statusOpen)
      }
      lines.push('')
    } else if (item.type === 'manual_edit') {
      lines.push(`\n${TIMELINE_TEXT.manualEditHeading}`)
      lines.push('')
      lines.push(`- createdAt: ${formatTimestamp(item.createdAt)}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
