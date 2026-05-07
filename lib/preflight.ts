import type { Project, Question } from '@/types'
import { UI_TEXT } from '@/lib/uiText'

export type PreflightWarning = {
  type: 'open_questions' | 'skip_markers' | 'revisit_markers' | 'protected_markers'
  count: number
  message: string
}

export type PreflightCheckResult = {
  openQuestions: number
  skipMarkers: number
  revisitMarkers: number
  revisitRangeMarkers: number
  protectedMarkers: number
  protectedRangeMarkers: number
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
  const revisitMarkers = countPattern(spec, /\[pre-spec:revisit\]/g)
  const revisitRangeMarkers = countPattern(spec, /<!--\s*pre-spec:revisit:start\s*-->/g)
  const protectedMarkers = countPattern(spec, /\[pre-spec:protected\]/g)
  const protectedRangeMarkers = countPattern(spec, /<!--\s*pre-spec:protected:start\s*-->/g)

  const warnings: PreflightWarning[] = []

  if (openQuestions > 0) {
    warnings.push({
      type: 'open_questions',
      count: openQuestions,
      message: UI_TEXT.preflight.warnOpenQuestions,
    })
  }
  if (skipMarkers > 0) {
    warnings.push({
      type: 'skip_markers',
      count: skipMarkers,
      message: UI_TEXT.preflight.warnSkipMarkers,
    })
  }
  if (revisitMarkers + revisitRangeMarkers > 0) {
    warnings.push({
      type: 'revisit_markers',
      count: revisitMarkers + revisitRangeMarkers,
      message: UI_TEXT.preflight.warnRevisitMarkers,
    })
  }
  if (protectedMarkers + protectedRangeMarkers > 0) {
    warnings.push({
      type: 'protected_markers',
      count: protectedMarkers + protectedRangeMarkers,
      message: UI_TEXT.preflight.warnProtectedMarkers,
    })
  }

  return {
    openQuestions,
    skipMarkers,
    revisitMarkers,
    revisitRangeMarkers,
    protectedMarkers,
    protectedRangeMarkers,
    warnings,
  }
}
