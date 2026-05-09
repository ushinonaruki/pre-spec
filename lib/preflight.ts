import type { MarkerDefinitionFile, Project, Question } from '@/types'
import { UI_TEXT } from '@/lib/text/uiText'
import { EXTENSIBLE_MARKERS } from '@/lib/markers'

export type PreflightWarning = {
  type: string
  count: number
  message: string
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

  for (const marker of EXTENSIBLE_MARKERS) {
    const inline = countPattern(spec, marker.inlinePattern)
    const range = marker.rangePattern ? countPattern(spec, marker.rangePattern) : 0
    markerCounts[marker.id] = inline + range
  }

  const extensibleIds = new Set(EXTENSIBLE_MARKERS.map((m) => m.id))

  if (markerDefinitions) {
    for (const name of Object.keys(markerDefinitions.markers)) {
      if (extensibleIds.has(name)) continue
      const inlinePattern = new RegExp(`\\[pre-spec:${name}\\]`, 'g')
      const rangePattern = new RegExp(`<!--\\s*pre-spec:${name}:start\\s*-->`, 'g')
      markerCounts[name] = countPattern(spec, inlinePattern) + countPattern(spec, rangePattern)
    }
  }

  const warnings: PreflightWarning[] = []

  if (openQuestions > 0) {
    warnings.push({ type: 'open_questions', count: openQuestions, message: UI_TEXT.preflight.warnOpenQuestions })
  }
  if (skipMarkers > 0) {
    warnings.push({ type: 'skip_markers', count: skipMarkers, message: UI_TEXT.preflight.warnSkipMarkers })
  }
  for (const marker of EXTENSIBLE_MARKERS) {
    const count = markerCounts[marker.id]
    if (count > 0) {
      warnings.push({ type: marker.id, count, message: marker.warningMessage })
    }
  }
  if (markerDefinitions) {
    for (const [name, def] of Object.entries(markerDefinitions.markers)) {
      if (extensibleIds.has(name)) continue
      const count = markerCounts[name] ?? 0
      if (count > 0) {
        warnings.push({ type: name, count, message: UI_TEXT.preflight.warnCustomMarker(name, count, def.label) })
      }
    }
  }

  return { openQuestions, skipMarkers, markerCounts, warnings }
}
