import type { Heading, Project } from '@/types'
import { extractHeadings, mergeHeadings } from '@/lib/markdown'

export function updateProjectSpec(project: Project, specMarkdown: string): Project {
  const freshHeadings = extractHeadings(specMarkdown)
  const merged = mergeHeadings(project.headings, freshHeadings)
  const currentStillExists = merged.some((h) => h.id === project.currentHeadingId)
  return {
    ...project,
    spec: specMarkdown,
    headings: merged,
    currentHeadingId: currentStillExists ? project.currentHeadingId : (merged[0]?.id ?? null),
  }
}

export function selectHeading(project: Project, headingId: string): Project {
  return { ...project, currentHeadingId: headingId }
}

export function uncompleteHeading(project: Project, headingId: string): Project {
  const isCurrent = project.currentHeadingId === headingId
  const headings = project.headings.map((h) =>
    h.id === headingId
      ? { ...h, status: (isCurrent ? 'in_progress' : 'unvisited') as Heading['status'] }
      : h,
  )
  return { ...project, headings, isCompleted: false }
}

export function completeCurrentHeading(project: Project): Project {
  const headings = project.headings.map((h) =>
    h.id === project.currentHeadingId ? { ...h, status: 'done' as const } : h,
  )
  const currentIdx = headings.findIndex((h) => h.id === project.currentHeadingId)
  const next = headings.slice(currentIdx + 1).find((h) => h.status !== 'done' && h.status !== 'skipped')
  const nextId = next?.id ?? null
  const headings2 = headings.map((h) =>
    h.id === nextId && h.status === 'unvisited' ? { ...h, status: 'in_progress' as const } : h,
  )
  return { ...project, headings: headings2, currentHeadingId: nextId, isCompleted: !nextId }
}
