import type { Project } from '@/types'
import { SPEC_TEMPLATE, extractHeadings } from '@/lib/markdown'
import { appendStartLog } from '@/lib/logBuilder'

export function createProject(prompt: string): Project {
  const now = new Date().toISOString()
  const spec = SPEC_TEMPLATE
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
  }
}
