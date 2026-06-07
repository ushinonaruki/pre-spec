import type { Workspace } from '@/src/types'
import { validateWorkspaceSlug, createWorkspace } from '@/src/domain/workspace/workspace'
import { saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function createWorkspaceUsecase(params: {
  slug: string
}): Promise<{ workspaceSlug: string; workspace: Workspace }> {
  if (!validateWorkspaceSlug(params.slug)) {
    throw new Error(ERROR_TEXT.workspaceSlugRequired)
  }

  const workspace = createWorkspace(params.slug)
  await saveWorkspace(workspace)

  return { workspaceSlug: workspace.slug, workspace }
}
