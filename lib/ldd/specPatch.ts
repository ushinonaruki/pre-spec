import type { AnswerFormatResult, Feature } from '@/types'
import { insertUnderHeading } from '@/lib/markdown'

export function applyFormattedAnswer(
  feature: Feature,
  params: { sectionTitle: string; formatResult: AnswerFormatResult },
): Feature {
  const newSpec = insertUnderHeading(
    feature.spec,
    params.sectionTitle,
    params.formatResult.specInsertionMarkdown,
  )
  return { ...feature, spec: newSpec }
}

export function applySkip(
  feature: Feature,
  params: { sectionTitle: string; markerBody: string; reason: string },
): { feature: Feature; reflectedMarkdown: string } {
  const markerLine = `- [pre-spec:skip:${params.reason}] ${params.markerBody}`
  const newSpec = insertUnderHeading(feature.spec, params.sectionTitle, markerLine)
  return { feature: { ...feature, spec: newSpec }, reflectedMarkdown: markerLine }
}
