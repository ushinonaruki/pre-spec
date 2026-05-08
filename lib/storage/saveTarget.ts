import type { Project } from '@/types'

export type ProjectSaveTarget = {
  write(project: Project): Promise<void>
}
