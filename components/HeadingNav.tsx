'use client'

import type { Heading } from '@/types'

const STATUS_COLOR: Record<Heading['status'], string> = {
  unvisited: 'text-stone-400',
  in_progress: 'text-blue-600 font-medium',
  done: 'text-green-600',
  skipped: 'text-stone-400 line-through',
}

const STATUS_ICON: Record<Heading['status'], string> = {
  unvisited: '○',
  in_progress: '●',
  done: '✓',
  skipped: '–',
}

type Props = {
  headings: Heading[]
  currentId: string | null
  onSelect: (id: string) => void
}

export default function HeadingNav({ headings, currentId, onSelect }: Props) {
  if (headings.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-stone-400">
        spec.md に ## 見出しを追加してください
      </div>
    )
  }

  return (
    <div className="space-y-0.5 px-2 py-2">
      {headings.map((h) => (
        <button
          key={h.id}
          onClick={() => onSelect(h.id)}
          className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 transition-colors
            ${currentId === h.id ? 'bg-stone-100' : 'hover:bg-stone-50'}
            ${STATUS_COLOR[h.status]}`}
        >
          <span className="shrink-0 w-3">{STATUS_ICON[h.status]}</span>
          <span className="truncate">{h.title}</span>
        </button>
      ))}
    </div>
  )
}
