import { apiPost } from './backendUrl'
import type { WorkspacePreflightResult } from '@/workbench/workbenchState'

export async function checkExport(
  workspaceSlug: string,
): Promise<{ result: WorkspacePreflightResult }> {
  return apiPost('/api/export/check', { workspaceSlug })
}
