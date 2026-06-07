import * as fs from 'fs/promises'
import * as path from 'path'
import type { Workspace } from '@/src/types'
import { workspaceToPreSpecWorkspace, preSpecWorkspaceToWorkspace } from '@/src/schema-normalizer/normalizeWorkspaceFile'

const DATA_DIR = path.resolve(process.cwd(), 'data', 'workspaces')
const FILE_SUFFIX = '.pre-spec.json'

function workspacePath(slug: string): string {
  return path.join(DATA_DIR, `${slug}${FILE_SUFFIX}`)
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const data = workspaceToPreSpecWorkspace(workspace)
  await fs.writeFile(workspacePath(workspace.slug), JSON.stringify(data, null, 2), 'utf-8')
}

export async function loadWorkspace(slug: string): Promise<Workspace | null> {
  try {
    const raw = await fs.readFile(workspacePath(slug), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    return preSpecWorkspaceToWorkspace(parsed)
  } catch {
    return null
  }
}

export async function listWorkspaceSlugs(): Promise<string[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    const entries = await fs.readdir(DATA_DIR)
    return entries
      .filter((e) => e.endsWith(FILE_SUFFIX))
      .map((e) => e.slice(0, -FILE_SUFFIX.length))
  } catch {
    return []
  }
}
