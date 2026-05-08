import type { Project } from '@/types'
import type { ProjectSaveTarget } from './saveTarget'
import { projectToPreSpecProject } from '@/lib/projectFile'

function createFSATarget(handle: FileSystemFileHandle): ProjectSaveTarget {
  return {
    async write(project: Project): Promise<void> {
      const content = JSON.stringify(projectToPreSpecProject(project), null, 2)
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

export async function pickSaveTarget(suggestedName: string): Promise<ProjectSaveTarget> {
  assertFSASupported()
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [{ description: 'pre-spec work file', accept: { 'application/json': ['.json'] } }],
  })
  return createFSATarget(handle)
}

export type OpenResult = {
  fileName: string
  text: string
  saveTarget: ProjectSaveTarget
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
