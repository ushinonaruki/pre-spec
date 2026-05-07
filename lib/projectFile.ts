import type { PreSpecProject, Project, Question, SectionMarker, TimelineItem } from '@/types'
import { extractSections } from '@/lib/markdown'

const CURRENT_VERSION = '1'

export function projectToPreSpecProject(project: Project): PreSpecProject {
  return {
    version: CURRENT_VERSION,
    project: {
      id: project.id,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    inputs: {
      requirementMemo: project.initialPrompt,
      relatedSources: [],
    },
    workspace: {
      draftSpecMarkdown: project.spec,
      referenceMarkdown: project.memo,
      currentSectionId: project.currentSectionId,
      sections: project.sections,
      timeline: project.timeline,
    },
    markers: {
      custom: {},
    },
  }
}

export function preSpecProjectToProject(file: PreSpecProject): Project {
  const ws = file.workspace
  const sections = ws.sections.length > 0 ? ws.sections : extractSections(ws.draftSpecMarkdown)
  return {
    id: file.project.id,
    createdAt: file.project.createdAt,
    updatedAt: file.project.updatedAt,
    initialPrompt: file.inputs?.requirementMemo ?? '',
    spec: ws.draftSpecMarkdown,
    log: '',
    memo: ws.referenceMarkdown,
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
  if (typeof ws.referenceMarkdown !== 'string') return false
  if (!Array.isArray(ws.sections)) return false
  if (!Array.isArray(ws.timeline)) return false
  if (ws.currentSectionId !== null && typeof ws.currentSectionId !== 'string') return false

  return true
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  } catch {
    return iso
  }
}

export function generateTimelineMarkdown(timeline: TimelineItem[]): string {
  if (timeline.length === 0) return '# タイムライン\n\n(まだ記録がありません)\n'

  const lines: string[] = ['# タイムライン', '']

  for (const item of timeline) {
    if (item.type === 'section_marker') {
      const marker = item as SectionMarker
      lines.push(`\n─── ${marker.sectionTitle} ─── *${formatTimestamp(marker.createdAt)}*`)
      lines.push('')
    } else if (item.type === 'question') {
      const q = item as Question
      const meta = [q.kind, q.priority].filter(Boolean).join('・')
      lines.push(`**Q** ${meta ? `[${meta}] ` : ''}${q.text}`)
      if (q.reason) lines.push(`*理由: ${q.reason}*`)
      if (q.aiGuess) lines.push(`*AI推定: ${q.aiGuess.value}*`)

      if (q.status === 'answered') {
        lines.push(`→ ✓ 回答済み: ${q.answer ?? ''}`)
        if (q.answeredAt) lines.push(`  *${formatTimestamp(q.answeredAt)}*`)
      } else if (q.status === 'skipped') {
        const detail = [q.skipReason, q.skipDetail].filter(Boolean).join(' / ')
        lines.push(`→ — スキップ${detail ? `: ${detail}` : ''}`)
      } else {
        lines.push('→ ○ 未回答')
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
