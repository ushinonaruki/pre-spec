import type { Workspace } from '@/types'
import { validateSlugBase } from '@/lib/ldd/fileBase'

export function generateWorkspaceId(): string {
  return crypto.randomUUID()
}

export function validateWorkspaceSlug(input: string): boolean {
  return validateSlugBase(input)
}

export function createWorkspace(slug: string, references = ''): Workspace {
  return {
    id: generateWorkspaceId(),
    slug,
    references,
    features: [],
    activeFeatureId: undefined,
  }
}
