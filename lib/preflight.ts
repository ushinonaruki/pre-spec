import type { MarkerDefinitionFile, Project, Question } from '@/types'

export type PreflightWarning = {
  type: string
  count: number
}

export type PreflightCheckResult = {
  openQuestions: number
  skipMarkers: number
  markerCounts: Record<string, number>
  warnings: PreflightWarning[]
}

function countPattern(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

export function runPreflightCheck(
  project: Project,
  markerDefinitions?: MarkerDefinitionFile | null,
): PreflightCheckResult {
  const spec = project.spec

  const openQuestions = project.timeline.filter(
    (item): item is Question => item.type === 'question' && item.status === 'open',
  ).length

  const skipMarkers = countPattern(spec, /\[pre-spec:skip:[a-z_-]+\]/g)

  const markerCounts: Record<string, number> = {}

  if (markerDefinitions) {
    for (const name of Object.keys(markerDefinitions.markers)) {
      const inlinePattern = new RegExp(`\\[pre-spec:${name}\\]`, 'g')
      const rangePattern = new RegExp(`<!--\\s*pre-spec:${name}:start\\s*-->`, 'g')
      markerCounts[name] = countPattern(spec, inlinePattern) + countPattern(spec, rangePattern)
    }
  }

  const warnings: PreflightWarning[] = []

  if (openQuestions > 0) {
    warnings.push({ type: 'open_questions', count: openQuestions })
  }
  if (skipMarkers > 0) {
    warnings.push({ type: 'skip_markers', count: skipMarkers })
  }
  if (markerDefinitions) {
    for (const [name] of Object.entries(markerDefinitions.markers)) {
      const count = markerCounts[name] ?? 0
      if (count > 0) {
        warnings.push({ type: name, count })
      }
    }
  }

  return { openQuestions, skipMarkers, markerCounts, warnings }
}
