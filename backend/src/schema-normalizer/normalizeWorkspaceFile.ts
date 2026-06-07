import type { PreSpecWorkspace, Section, TimelineItem, Workspace } from '@/src/types'

const CURRENT_VERSION = '2'

export function workspaceToPreSpecWorkspace(workspace: Workspace): PreSpecWorkspace {
  return {
    version: CURRENT_VERSION,
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      references: workspace.references,
      activeFeatureId: workspace.activeFeatureId,
      features: workspace.features.map((f) => ({
        id: f.id,
        slug: f.slug,
        references: f.references,
        spec: f.spec,
        sections: f.sections,
        currentSectionId: f.currentSectionId,
        timeline: f.timeline,
      })),
    },
  }
}

export function preSpecWorkspaceToWorkspace(raw: unknown): Workspace {
  if (!validatePreSpecWorkspace(raw)) {
    throw new Error('Invalid .pre-spec.json file')
  }
  const ws = raw.workspace
  return {
    id: ws.id,
    slug: ws.slug,
    references: ws.references,
    activeFeatureId: ws.activeFeatureId,
    features: ws.features.map((f) => ({
      id: f.id,
      slug: f.slug,
      references: f.references,
      spec: f.spec,
      sections: f.sections as Section[],
      currentSectionId: f.currentSectionId,
      timeline: f.timeline as TimelineItem[],
    })),
  }
}

export function validatePreSpecWorkspace(raw: unknown): raw is PreSpecWorkspace {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>

  if (typeof r.version !== 'string') return false

  const ws = r.workspace as Record<string, unknown> | undefined
  if (!ws || typeof ws !== 'object') return false
  if (typeof ws.id !== 'string') return false
  if (typeof ws.slug !== 'string' || !ws.slug) return false
  if (typeof ws.references !== 'string') return false
  if (!Array.isArray(ws.features)) return false

  for (const f of ws.features as unknown[]) {
    if (!f || typeof f !== 'object') return false
    const feat = f as Record<string, unknown>
    if (typeof feat.id !== 'string') return false
    if (typeof feat.slug !== 'string' || !feat.slug) return false
    if (typeof feat.references !== 'string') return false
    if (typeof feat.spec !== 'string') return false
    if (!Array.isArray(feat.sections)) return false
    if (!Array.isArray(feat.timeline)) return false
    if (feat.currentSectionId !== undefined && typeof feat.currentSectionId !== 'string') return false
  }

  if (ws.activeFeatureId !== undefined && typeof ws.activeFeatureId !== 'string') return false

  return true
}
