import type { MarkerDefinitionFile, SkipReasonDefinitionFile } from '@/src/types'
import markersJson from './pre-spec.markers.json'
import skipReasonsJson from './pre-spec.skip-reasons.json'
import taxonomyJson from './questionTaxonomy.json'

export type QuestionTaxonomy = typeof taxonomyJson

export function loadMarkerDefinitions(): MarkerDefinitionFile {
  return markersJson as MarkerDefinitionFile
}

export function loadSkipReasonDefinitions(): SkipReasonDefinitionFile {
  return skipReasonsJson as SkipReasonDefinitionFile
}

export function loadQuestionTaxonomy(): QuestionTaxonomy {
  return taxonomyJson
}
