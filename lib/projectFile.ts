import type { ManualEdit, PhaseMarker, PreSpecProject, Project, Question, Section, SectionMarker, TimelineItem } from '@/types'
import { extractSections } from '@/lib/markdown'
import { TIMELINE_TEXT } from '@/lib/text/timelineText'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'

const CURRENT_VERSION = '1'

export function getProjectFilenames(slug: string) {
  return {
    spec: `${slug}.spec.md`,
    references: `${slug}.references.md`,
    timeline: `${slug}.timeline.md`,
    project: `${slug}.pre-spec.json`,
  }
}

export function projectToPreSpecProject(project: Project): PreSpecProject {
  return {
    version: CURRENT_VERSION,
    project: {
      id: project.id,
      slug: project.slug,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    inputs: {
      requirementMemo: project.initialPrompt,
      relatedSources: project.relatedSources,
    },
    workspace: {
      draftSpecMarkdown: project.spec,
      referencesMarkdown: project.memo,
      currentSectionId: project.currentSectionId,
      sections: project.sections,
      timeline: project.timeline,
    },
  }
}

export function preSpecProjectToProject(file: PreSpecProject): Project {
  const ws = file.workspace
  const rawWs = ws as unknown as Record<string, unknown>
  const memo = (rawWs.referencesMarkdown ?? rawWs.referenceMarkdown ?? '') as string
  const sections = ws.sections.length > 0 ? ws.sections : extractSections(ws.draftSpecMarkdown)
  const slug = file.project.slug || 'untitled-project'
  return {
    id: file.project.id,
    slug,
    createdAt: file.project.createdAt,
    updatedAt: file.project.updatedAt,
    initialPrompt: file.inputs?.requirementMemo ?? '',
    spec: ws.draftSpecMarkdown,
    memo,
    relatedSources: file.inputs?.relatedSources ?? [],
    sections,
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
  if (typeof proj.createdAt !== 'string') return false
  if (typeof proj.updatedAt !== 'string') return false

  const ws = r.workspace as Record<string, unknown> | undefined
  if (!ws || typeof ws !== 'object') return false
  if (typeof ws.draftSpecMarkdown !== 'string') return false
  if (typeof ws.referencesMarkdown !== 'string' && typeof ws.referenceMarkdown !== 'string') return false
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

export function generateTimelineMarkdown(timeline: TimelineItem[], sections: Section[] = []): string {
  if (timeline.length === 0) return `${TIMELINE_TEXT.heading}\n\n${TIMELINE_TEXT.empty}\n`

  const lines: string[] = [TIMELINE_TEXT.heading, '']

  for (const item of timeline) {
    if (item.type === 'phase_marker') {
      const pm = item as PhaseMarker
      lines.push(`\n## ${pm.label}`)
      lines.push('')
    } else if (item.type === 'section_marker') {
      const marker = item as SectionMarker
      lines.push(TIMELINE_TEXT.sectionMarker(marker.sectionTitle, formatTimestamp(marker.createdAt)))
      lines.push('')
    } else if (item.type === 'question') {
      const q = item as Question
      const kindStr = q.kinds?.length ? q.kinds.join(' / ') : undefined
      const meta = [q.priority, kindStr].filter(Boolean).join(TIMELINE_TEXT.metaSeparator)
      const prefix = q.questionType === 'initial_confirmation' ? TIMELINE_TEXT.questionPrefixInitial : TIMELINE_TEXT.questionPrefix
      lines.push(`${prefix} ${meta ? `[${meta}] ` : ''}${q.text}`)
      if (q.reason) lines.push(`*${TIMELINE_TEXT.reasonLabel}: ${q.reason}*`)
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
      } else {
        lines.push(TIMELINE_TEXT.statusOpen)
      }
      lines.push('')
    } else if (item.type === 'manual_edit') {
      const me = item as ManualEdit
      lines.push(`\n${TIMELINE_TEXT.manualEditHeading}`)
      lines.push('')
      lines.push(`- createdAt: ${formatTimestamp(me.createdAt)}`)
      if (me.memo) lines.push(`- memo: ${me.memo}`)
      if (me.affectedSectionIds.length > 0) {
        const titles = me.affectedSectionIds
          .map((id) => sections.find((s) => s.id === id)?.title ?? id)
          .join(', ')
        lines.push(`- affected: ${titles}`)
      }
      lines.push(`- beforeHash: ${me.beforeHash}`)
      lines.push(`- afterHash: ${me.afterHash}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
