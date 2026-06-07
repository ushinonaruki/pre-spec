import type { Workspace } from '@/src/types'
import { setActiveFeature } from '@/src/domain/feature/feature'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function selectFeature(params: {
  workspaceSlug: string
  featureId: string
}): Promise<{ workspace: Workspace }> {
  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const feature = workspace.features.find((f) => f.id === params.featureId)
  if (!feature) throw new Error(ERROR_TEXT.featureNotFound)

  const updated = setActiveFeature(workspace, params.featureId)
  await saveWorkspace(updated)
  return { workspace: updated }
}
