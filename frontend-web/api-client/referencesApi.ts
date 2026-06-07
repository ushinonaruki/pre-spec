import { apiGet, apiPost } from './backendUrl'
import type { Workspace } from '@/workbench/workbenchState'

export async function getReferences(workspaceSlug: string): Promise<{
  global: string
  local: string
  effective: string
}> {
  return apiGet(`/api/references?workspaceSlug=${encodeURIComponent(workspaceSlug)}`)
}

export async function addReference(params: {
  workspaceSlug: string
  featureId?: string
  kind: 'file' | 'url'
  name: string
  content: string
  note?: string
}): Promise<{ workspace: Workspace; status: 'ok' | 'unreadable'; reason?: string }> {
  return apiPost('/api/references/add', params)
}
