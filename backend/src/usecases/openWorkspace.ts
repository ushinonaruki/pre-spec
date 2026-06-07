import type { Workspace } from '@/src/types'
import { preSpecWorkspaceToWorkspace, validatePreSpecWorkspace } from '@/src/schema-normalizer/normalizeWorkspaceFile'
import { saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function openWorkspace(params: {
  filename: string
  content: string
}): Promise<{ workspaceSlug: string; workspace: Workspace }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(params.content)
  } catch {
    throw new Error(ERROR_TEXT.invalidFile)
  }

  if (!validatePreSpecWorkspace(parsed)) {
    throw new Error(ERROR_TEXT.invalidFile)
  }

  const workspace = preSpecWorkspaceToWorkspace(parsed)
  await saveWorkspace(workspace)

  return { workspaceSlug: workspace.slug, workspace }
}
