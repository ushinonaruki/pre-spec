'use client'

import type { PreflightCheckResult } from '@/lib/preflight'
import { UI_TEXT } from '@/lib/uiText'

type Props = { result: PreflightCheckResult }

export default function PreflightPanel({ result }: Props) {
  const {
    openQuestions,
    skipMarkers,
    revisitMarkers,
    revisitRangeMarkers,
    protectedMarkers,
    protectedRangeMarkers,
    warnings,
  } = result

  const totalRevisit = revisitMarkers + revisitRangeMarkers
  const totalProtected = protectedMarkers + protectedRangeMarkers

  return (
    <div className="shrink-0 px-4 py-1.5 bg-stone-50 border-b border-stone-100">
      <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
        <span className="font-medium text-stone-600">{UI_TEXT.preflight.title}</span>
        <span>
          {UI_TEXT.preflight.openQuestions}: {openQuestions}
        </span>
        <span>
          {UI_TEXT.preflight.skipMarkers}: {skipMarkers}
        </span>
        <span>
          {UI_TEXT.preflight.revisitMarkers}: {totalRevisit}
        </span>
        <span>
          {UI_TEXT.preflight.protectedMarkers}: {totalProtected}
        </span>
      </div>
      {warnings.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {warnings.map((w) => (
            <p key={w.type} className="text-xs text-amber-600">
              {w.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
