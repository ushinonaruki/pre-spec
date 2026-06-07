import type { Workspace } from '@/src/types'
import { advanceCurrentSection } from '@/src/domain/spec/headings'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function nextSectionUsecase(params: {
  workspaceSlug: string
}): Promise<{ workspace: Workspace }> {
  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const activeFeature = workspace.features.find((f) => f.id === workspace.activeFeatureId)
  if (!activeFeature) throw new Error(ERROR_TEXT.featureNotFound)

  const updatedFeature = advanceCurrentSection(activeFeature)
  const updatedWorkspace: Workspace = {
    ...workspace,
    features: workspace.features.map((f) => (f.id === updatedFeature.id ? updatedFeature : f)),
  }

  await saveWorkspace(updatedWorkspace)
  return { workspace: updatedWorkspace }
}
