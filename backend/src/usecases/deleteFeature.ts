import type { Workspace } from '@/src/types'
import { deleteFeature } from '@/src/domain/feature/feature'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function deleteFeatureUsecase(params: {
  workspaceSlug: string
  featureId: string
}): Promise<{ workspace: Workspace }> {
  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const feature = workspace.features.find((f) => f.id === params.featureId)
  if (!feature) throw new Error(ERROR_TEXT.featureNotFound)

  const updated = deleteFeature(workspace, params.featureId)
  await saveWorkspace(updated)
  return { workspace: updated }
}
