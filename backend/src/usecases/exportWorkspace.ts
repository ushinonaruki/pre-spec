import { loadWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { buildWorkspaceExportFiles } from '@/src/domain/export/exportWorkspace'
import { buildExportZip } from '@/src/infrastructure/storage/zipExport'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function exportWorkspaceUsecase(params: {
  workspaceSlug: string
}): Promise<Buffer> {
  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const files = buildWorkspaceExportFiles(workspace)
  return buildExportZip(files)
}
