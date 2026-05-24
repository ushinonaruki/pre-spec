import type { PreSpecWorkspace, Section, TimelineItem, Workspace } from '@/types'
import { TIMELINE_TEXT } from '@/lib/text/timelineText'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'
import type { Question } from '@/types'

const CURRENT_VERSION = '2'

export const PRE_SPEC_PROJECT_FILE_SUFFIX = '.pre-spec.json'

export function getFeatureFilenames(featureSlug: string) {
  return {
    spec: `specs/${featureSlug}/spec.md`,
    references: `specs/${featureSlug}/references.md`,
    timeline: `specs/${featureSlug}/timeline.md`,
  }
}

export function workspaceToPreSpecWorkspace(workspace: Workspace): PreSpecWorkspace {
  return {
    version: CURRENT_VERSION,
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      references: workspace.references,
      activeFeatureId: workspace.activeFeatureId,
      features: workspace.features.map((f) => ({
        id: f.id,
        slug: f.slug,
        references: f.references,
        spec: f.spec,
        sections: f.sections,
        currentSectionId: f.currentSectionId,
        timeline: f.timeline,
      })),
    },
  }
}

export function preSpecWorkspaceToWorkspace(file: PreSpecWorkspace): Workspace {
  const ws = file.workspace
  return {
    id: ws.id,
    slug: ws.slug,
    references: ws.references,
    activeFeatureId: ws.activeFeatureId,
    features: ws.features.map((f) => ({
      id: f.id,
      slug: f.slug,
      references: f.references,
      spec: f.spec,
      sections: f.sections as Section[],
      currentSectionId: f.currentSectionId,
      timeline: f.timeline as TimelineItem[],
    })),
  }
}

export function validatePreSpecWorkspace(raw: unknown): raw is PreSpecWorkspace {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>

  if (typeof r.version !== 'string') return false

  const ws = r.workspace as Record<string, unknown> | undefined
  if (!ws || typeof ws !== 'object') return false
  if (typeof ws.id !== 'string') return false
  if (typeof ws.slug !== 'string' || !ws.slug) return false
  if (typeof ws.references !== 'string') return false
  if (!Array.isArray(ws.features)) return false

  for (const f of ws.features as unknown[]) {
    if (!f || typeof f !== 'object') return false
    const feat = f as Record<string, unknown>
    if (typeof feat.id !== 'string') return false
    if (typeof feat.slug !== 'string' || !feat.slug) return false
    if (typeof feat.references !== 'string') return false
    if (typeof feat.spec !== 'string') return false
    if (!Array.isArray(feat.sections)) return false
    if (!Array.isArray(feat.timeline)) return false
    if (feat.currentSectionId !== undefined && typeof feat.currentSectionId !== 'string') return false
  }

  if (ws.activeFeatureId !== undefined && typeof ws.activeFeatureId !== 'string') return false

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
      lines.push(`## ${item.label}`)
      lines.push('')
    } else if (item.type === 'section_marker') {
      lines.push(TIMELINE_TEXT.sectionMarker(item.sectionTitle, formatTimestamp(item.createdAt)))
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
        if (q.reflectedMarkdown) {
          lines.push(`  - ${TIMELINE_TEXT.reflectedLabel}:`)
          lines.push(`    ${q.reflectedMarkdown}`)
        }
        if (q.answeredAt) lines.push(`  - ${TIMELINE_TEXT.answeredAtLabel}: ${formatTimestamp(q.answeredAt)}`)
      } else if (q.status === 'skipped') {
        lines.push(TIMELINE_TEXT.statusSkipped)
        if (q.skipReason) lines.push(`  - ${TIMELINE_TEXT.reasonLabel}: ${q.skipReason}`)
        if (q.skipCustomText) lines.push(`  - ${TIMELINE_TEXT.detailLabel}: ${q.skipCustomText}`)
        if (q.reflectedMarkdown) {
          lines.push(`  - ${TIMELINE_TEXT.reflectedLabel}:`)
          lines.push(`    ${q.reflectedMarkdown}`)
        }
        if (q.skippedAt) lines.push(`  - ${TIMELINE_TEXT.skippedAtLabel}: ${formatTimestamp(q.skippedAt)}`)
      } else if (q.status === 'failed') {
        lines.push(TIMELINE_TEXT.statusFailed)
        if (q.failureReason) lines.push(`  - ${TIMELINE_TEXT.failureReasonLabel}: ${q.failureReason}`)
        if (q.failedAt) lines.push(`  - ${TIMELINE_TEXT.failedAtLabel}: ${formatTimestamp(q.failedAt)}`)
        if (q.attemptedAnswer) lines.push(`  - ${TIMELINE_TEXT.attemptedAnswerLabel}: ${q.attemptedAnswer}`)
        if (q.attemptedSkip) {
          lines.push(`  - ${TIMELINE_TEXT.attemptedSkipLabel}: reason=${q.attemptedSkip.reason}${q.attemptedSkip.customText ? ` / ${q.attemptedSkip.customText}` : ''}`)
        }
      } else {
        lines.push(TIMELINE_TEXT.statusOpen)
      }
      lines.push('')
    } else if (item.type === 'manual_edit') {
      lines.push(TIMELINE_TEXT.manualEditHeading)
      lines.push('')
      lines.push(`- createdAt: ${formatTimestamp(item.createdAt)}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
