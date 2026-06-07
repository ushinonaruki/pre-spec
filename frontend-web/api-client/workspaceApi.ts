import { apiGet, apiPost, BACKEND_URL } from './backendUrl'
import type { Workspace } from '@/workbench/workbenchState'

type WorkspaceResponse = { workspaceSlug: string; workspace: Workspace }

export async function listWorkspaces(): Promise<{ slugs: string[] }> {
  return apiGet('/api/workspaces')
}

export async function createWorkspace(slug: string): Promise<WorkspaceResponse> {
  return apiPost('/api/workspaces/create', { slug })
}

export async function openWorkspace(filename: string, content: string): Promise<WorkspaceResponse> {
  return apiPost('/api/workspaces/open', { filename, content })
}

export async function getWorkspace(workspaceSlug: string): Promise<{ workspace: Workspace }> {
  return apiGet(`/api/workspaces/${encodeURIComponent(workspaceSlug)}`)
}

export async function exportWorkspace(workspaceSlug: string): Promise<Blob> {
  const res = await fetch(`${BACKEND_URL}/api/export/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceSlug }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.blob()
}
