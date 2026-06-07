import { listWorkspaceSlugs } from '@/src/infrastructure/storage/workspaceStorage'

export async function listWorkspaces(): Promise<{ slugs: string[] }> {
  const slugs = await listWorkspaceSlugs()
  return { slugs }
}
