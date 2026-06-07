import type { Workspace } from '@/src/types'
import { loadWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function getWorkspace(workspaceSlug: string): Promise<{ workspace: Workspace }> {
  const workspace = await loadWorkspace(workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)
  return { workspace }
}
