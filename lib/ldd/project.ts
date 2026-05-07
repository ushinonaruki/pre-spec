import type { Project } from '@/types'
import { SPEC_TEMPLATE, extractHeadings } from '@/lib/markdown'
import { appendStartLog } from '@/lib/logBuilder'

export function createProjectWithSpec(prompt: string, spec: string): Project {
  const now = new Date().toISOString()
  const headings = extractHeadings(spec)
  const log = appendStartLog('', { prompt })
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    initialPrompt: prompt,
    uploads: [],
    spec,
    log,
    memo: '',
    headings,
    currentHeadingId: headings[0]?.id ?? null,
    isCompleted: false,
    questionTimelines: {},
  }
}

export function createProject(prompt: string): Project {
  return createProjectWithSpec(prompt, SPEC_TEMPLATE)
}
