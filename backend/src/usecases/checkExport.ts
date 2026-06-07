import { loadWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { loadMarkerDefinitions } from '@/src/config/loadConfig'
import { runWorkspacePreflightCheck, type WorkspacePreflightResult } from '@/src/domain/preflight/preflight'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function checkExport(params: {
  workspaceSlug: string
}): Promise<{ result: WorkspacePreflightResult }> {
  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const markerDefinitions = loadMarkerDefinitions()
  const result = runWorkspacePreflightCheck(workspace, markerDefinitions)
  return { result }
}
