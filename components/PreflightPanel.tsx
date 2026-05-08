'use client'

import type { PreflightCheckResult } from '@/lib/preflight'
import type { MarkerDefinitionFile } from '@/types'
import { EXTENSIBLE_MARKERS } from '@/lib/markers'
import { UI_TEXT } from '@/lib/text/uiText'

type Props = {
  result: PreflightCheckResult
  markerDefinitions?: MarkerDefinitionFile | null
}

export default function PreflightPanel({ result, markerDefinitions }: Props) {
  const { openQuestions, skipMarkers, markerCounts, warnings } = result

  return (
    <div className="shrink-0 px-4 py-1.5 bg-stone-50 border-b border-stone-100">
      <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
        <span className="font-medium text-stone-600">{UI_TEXT.preflight.title}</span>
        <span>{UI_TEXT.preflight.openQuestions}: {openQuestions}</span>
        <span>{UI_TEXT.preflight.skipMarkers}: {skipMarkers}</span>
        {EXTENSIBLE_MARKERS.map((marker) => (
          <span key={marker.id}>{marker.label}: {markerCounts[marker.id] ?? 0}</span>
        ))}
        {markerDefinitions && Object.entries(markerDefinitions.markers).map(([name, def]) => (
          <span key={name}>{def.label}: {markerCounts[name] ?? 0}</span>
        ))}
      </div>
      {warnings.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {warnings.map((w) => (
            <p key={w.type} className="text-xs text-amber-600">{w.message}</p>
          ))}
        </div>
      )}
    </div>
  )
}
