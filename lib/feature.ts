import type { Feature, Workspace } from '@/types'
import { SPEC_TEMPLATE, extractSections } from '@/lib/markdown'
import { validateSlugBase } from '@/lib/ldd/fileBase'

export type InitialRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

export function generateFeatureId(): string {
  return crypto.randomUUID()
}

export function validateFeatureSlug(input: string): boolean {
  return validateSlugBase(input)
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
    id: generateFeatureId(),
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
