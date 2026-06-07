import { apiPost } from './backendUrl'
import type { Workspace } from '@/workbench/workbenchState'

export async function editSpec(
  workspaceSlug: string,
  newSpec: string,
): Promise<{ workspace: Workspace }> {
  return apiPost('/api/spec/edit', { workspaceSlug, newSpec })
}
