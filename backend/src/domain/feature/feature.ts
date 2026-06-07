import type { Feature, Workspace } from '@/src/types'
import { SPEC_TEMPLATE, extractSections } from '@/src/domain/spec/markdown'
import { v4 as uuidv4 } from 'uuid'

const FORBIDDEN_CHARS = /[\x00-\x1f\x7f<>:"|?*]/
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..+)?$/i

export function validateFeatureSlug(input: string): boolean {
  if (!input) return false
  if (input.includes('/') || input.includes('\\')) return false
  if (FORBIDDEN_CHARS.test(input)) return false
  if (input === '.' || input === '..') return false
  if (WINDOWS_RESERVED.test(input)) return false
  if (input.endsWith('.') || input.endsWith(' ')) return false
  return true
}

export function sortFeatures(features: Feature[]): Feature[] {
  return [...features].sort((a, b) => a.slug.localeCompare(b.slug))
}

export function findFeatureBySlug(features: Feature[], slug: string): Feature | undefined {
  return features.find((f) => f.slug === slug)
}

export function createFeature(slug: string, references: string): Feature {
  const spec = SPEC_TEMPLATE
  const sections = extractSections(spec)
  return {
    id: uuidv4(),
    slug,
    references,
    spec,
    sections,
    currentSectionId: sections[0]?.id,
    timeline: [],
  }
}

export function renameFeature(workspace: Workspace, featureId: string, newSlug: string): Workspace {
  const features = sortFeatures(
    workspace.features.map((f) => (f.id === featureId ? { ...f, slug: newSlug } : f)),
  )
  return { ...workspace, features }
}

export function deleteFeature(workspace: Workspace, featureId: string): Workspace {
  const features = sortFeatures(workspace.features.filter((f) => f.id !== featureId))
  const activeFeatureId =
    workspace.activeFeatureId === featureId ? undefined : workspace.activeFeatureId
  return { ...workspace, features, activeFeatureId }
}

export function setActiveFeature(workspace: Workspace, featureId: string): Workspace {
  return { ...workspace, activeFeatureId: featureId }
}
