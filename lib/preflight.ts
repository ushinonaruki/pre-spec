import type { Project, Question } from '@/types'
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

export function runPreflightCheck(project: Project): PreflightCheckResult {
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

  return { openQuestions, skipMarkers, markerCounts, warnings }
}
