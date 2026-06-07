import type { Workspace } from '@/src/types'
import { replaceSpecMarkdownAndRefreshSections } from '@/src/domain/spec/headings'
import { addManualEdit } from '@/src/domain/timeline/timelines'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function editSpec(params: {
  workspaceSlug: string
  newSpec: string
}): Promise<{ workspace: Workspace }> {
  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const featureId = workspace.activeFeatureId
  if (!featureId) throw new Error(ERROR_TEXT.featureNotFound)

  let feature = workspace.features.find((f) => f.id === featureId)
  if (!feature) throw new Error(ERROR_TEXT.featureNotFound)

  feature = replaceSpecMarkdownAndRefreshSections(feature, params.newSpec)
  feature = addManualEdit(feature)

  const updated = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
  await saveWorkspace(updated)
  return { workspace: updated }
}
