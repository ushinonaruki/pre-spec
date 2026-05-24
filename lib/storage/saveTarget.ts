import type { Workspace } from '@/types'

export type WorkspaceSaveTarget = {
  write(workspace: Workspace): Promise<void>
}
