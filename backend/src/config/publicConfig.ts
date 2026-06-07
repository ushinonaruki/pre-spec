import { loadMarkerDefinitions, loadSkipReasonDefinitions, loadQuestionTaxonomy } from './loadConfig'

export type PublicConfig = {
  markers: Record<string, { label: string }>
  skipReasons: Record<string, { label: string }>
  questionTaxonomy: {
    priorities: Record<string, string>
    kinds: Record<string, string>
  }
}

export function buildPublicConfig(): PublicConfig {
  const markers = loadMarkerDefinitions()
  const skipReasons = loadSkipReasonDefinitions()
  const taxonomy = loadQuestionTaxonomy()

  return {
    markers: Object.fromEntries(
      Object.entries(markers.markers).map(([k, v]) => [k, { label: v.label }]),
    ),
    skipReasons: Object.fromEntries(
      Object.entries(skipReasons.skipReasons).map(([k, v]) => [k, { label: v.label }]),
    ),
    questionTaxonomy: {
      priorities: Object.fromEntries(
        Object.entries(taxonomy.priorities).map(([k, v]) => [k, v.label]),
      ),
      kinds: Object.fromEntries(
        Object.entries(taxonomy.kinds).map(([k, v]) => [k, v.label]),
      ),
    },
  }
}
