import type { Workspace } from '@/src/types'
import { validateFeatureSlug, renameFeature } from '@/src/domain/feature/feature'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function renameFeatureUsecase(params: {
  workspaceSlug: string
  featureId: string
  newSlug: string
}): Promise<{ workspace: Workspace }> {
  if (!validateFeatureSlug(params.newSlug)) {
    throw new Error(ERROR_TEXT.featureSlugRequired)
  }

  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const feature = workspace.features.find((f) => f.id === params.featureId)
  if (!feature) throw new Error(ERROR_TEXT.featureNotFound)

  const updated = renameFeature(workspace, params.featureId, params.newSlug)
  await saveWorkspace(updated)
  return { workspace: updated }
}
