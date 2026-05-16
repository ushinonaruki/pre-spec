import type { MarkerDefinitionFile, Project, Question } from '@/types'
import { SKIP_REASON_KEY_CHARS } from '@/lib/skipReasons'

export type PreflightCheckResult = {
  openQuestions: number
  skipMarkers: number
  markerCounts: Record<string, number>
  hasWarnings: boolean
}

function countPattern(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

export function runPreflightCheck(
  project: Project,
  markerDefinitions: MarkerDefinitionFile | null,
): PreflightCheckResult {
  const spec = project.spec

  const openQuestions = project.timeline.filter(
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

  return { openQuestions, skipMarkers, markerCounts, hasWarnings }
}
