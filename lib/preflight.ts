import type { Feature, MarkerDefinitionFile, Question, Workspace } from '@/types'
import { SKIP_REASON_KEY_CHARS } from '@/lib/skipReasons'

export type FeaturePreflightResult = {
  featureSlug: string
  openQuestions: number
  skipMarkers: number
  markerCounts: Record<string, number>
  hasWarnings: boolean
}

export type WorkspacePreflightResult = {
  features: FeaturePreflightResult[]
  hasWarnings: boolean
}

function countPattern(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

function checkFeature(
  feature: Feature,
  markerDefinitions: MarkerDefinitionFile | null,
): FeaturePreflightResult {
  const spec = feature.spec

  const openQuestions = feature.timeline.filter(
    (item): item is Question => item.type === 'question' && item.status === 'open',
  ).length

  const skipMarkers = countPattern(spec, new RegExp(`\\[pre-spec:skip:${SKIP_REASON_KEY_CHARS}+\\]`, 'g'))

  const markerCounts: Record<string, number> = {}
  if (markerDefinitions) {
    for (const name of Object.keys(markerDefinitions.markers)) {
      const inlinePattern = new RegExp(`\\[pre-spec:${name}\\]`, 'g')
      const rangePattern = new RegExp(`<!--\\s*pre-spec:${name}:start\\s*-->`, 'g')
      markerCounts[name] = countPattern(spec, inlinePattern) + countPattern(spec, rangePattern)
    }
  }

  const hasMarkerWarnings = markerDefinitions
    ? Object.values(markerCounts).some((c) => c > 0)
    : false

  const hasWarnings = openQuestions > 0 || skipMarkers > 0 || hasMarkerWarnings

  return { featureSlug: feature.slug, openQuestions, skipMarkers, markerCounts, hasWarnings }
}

export function runWorkspacePreflightCheck(
  workspace: Workspace,
  markerDefinitions: MarkerDefinitionFile | null,
): WorkspacePreflightResult {
  const features = workspace.features.map((f) => checkFeature(f, markerDefinitions))
  return {
    features,
    hasWarnings: features.some((r) => r.hasWarnings),
  }
}
