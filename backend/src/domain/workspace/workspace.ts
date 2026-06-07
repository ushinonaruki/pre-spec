import type { Workspace } from '@/src/types'
import { v4 as uuidv4 } from 'uuid'

const FORBIDDEN_CHARS = /[\x00-\x1f\x7f<>:"|?*]/
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..+)?$/i

export function validateWorkspaceSlug(input: string): boolean {
  if (!input) return false
  if (input.includes('/') || input.includes('\\')) return false
  if (FORBIDDEN_CHARS.test(input)) return false
  if (input === '.' || input === '..') return false
  if (WINDOWS_RESERVED.test(input)) return false
  if (input.endsWith('.') || input.endsWith(' ')) return false
  return true
}

export function createWorkspace(slug: string, references = ''): Workspace {
  return {
    id: uuidv4(),
    slug,
    references,
    features: [],
    activeFeatureId: undefined,
  }
}
