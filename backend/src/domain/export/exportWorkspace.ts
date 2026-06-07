import type { Workspace } from '@/src/types'
import { buildOutputGlobalReferences, buildOutputLocalReferences } from '@/src/domain/references/references'
import { generateTimelineMarkdown } from '@/src/domain/timeline/timelineMarkdown'

export type WorkspaceExportFiles = {
  globalReferences: string
  features: Array<{
    slug: string
    spec: string
    references: string
    timeline: string
  }>
}

export function buildWorkspaceExportFiles(workspace: Workspace): WorkspaceExportFiles {
  return {
    globalReferences: buildOutputGlobalReferences(workspace),
    features: workspace.features.map((f) => ({
      slug: f.slug,
      spec: f.spec,
      references: buildOutputLocalReferences(f),
      timeline: generateTimelineMarkdown(f.timeline),
    })),
  }
}
