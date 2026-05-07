'use client'

import type { Heading } from '@/types'

type Props = {
  headings: Heading[]
  currentId: string | null
  onSelect: (id: string) => void
  onUncomplete: (id: string) => void
}

export default function HeadingNav({ headings, currentId, onSelect, onUncomplete }: Props) {
  if (headings.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-stone-400">
        spec.md に ## 見出しを追加してください
      </div>
    )
  }

  return (
    <div className="space-y-0.5 px-2 py-2">
      {headings.map((h) => {
        const isCurrent = h.id === currentId
        const isDone = h.status === 'done'
        const icon = isCurrent ? '●' : isDone ? '✓' : '○'

        return (
          <div
            key={h.id}
            className={`flex items-center rounded transition-colors ${isCurrent ? 'bg-stone-100' : 'hover:bg-stone-50'}`}
          >
            <button
              onClick={() => onSelect(h.id)}
              className={`flex-1 text-left text-xs px-2 py-1.5 flex items-center gap-2 min-w-0
                ${isCurrent ? 'text-stone-800 font-semibold' : isDone ? 'text-green-600' : 'text-stone-400'}`}
            >
              <span className="shrink-0 w-3">{icon}</span>
              <span className="truncate">{h.title}</span>
            </button>
            {isDone && (
              <button
                onClick={() => onUncomplete(h.id)}
                className="shrink-0 text-xs text-stone-300 hover:text-stone-500 px-2 py-1.5 transition-colors"
                title="完了を解除"
              >
                解除
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
