import type { Workspace } from '@/types'
import type { WorkspaceSaveTarget } from './saveTarget'
import { workspaceToPreSpecWorkspace } from '@/lib/projectFile'

function createFSATarget(handle: FileSystemFileHandle): WorkspaceSaveTarget {
  return {
    async write(workspace: Workspace): Promise<void> {
      const content = JSON.stringify(workspaceToPreSpecWorkspace(workspace), null, 2)
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
    },
  }
}

function assertFSASupported(): void {
  if (!('showSaveFilePicker' in window)) {
    throw new Error('File System Access API is not supported in this browser')
  }
}

export async function pickSaveTarget(suggestedName: string): Promise<WorkspaceSaveTarget> {
  assertFSASupported()
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [{ description: 'pre-spec work file', accept: { 'application/json': ['.json'] } }],
  })
  return createFSATarget(handle)
}

type OpenResult = {
  fileName: string
  text: string
  saveTarget: WorkspaceSaveTarget
}

export async function pickOpenTarget(): Promise<OpenResult> {
  assertFSASupported()
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'pre-spec work file', accept: { 'application/json': ['.json'] } }],
    multiple: false,
  })
  const file = await handle.getFile()
  const text = await file.text()
  return { fileName: handle.name, text, saveTarget: createFSATarget(handle) }
}
