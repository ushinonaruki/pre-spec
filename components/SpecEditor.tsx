'use client'

import { markdownToHtml } from '@/lib/markdown'

type Props = {
  value: string
  onChange: (v: string) => void
  mode: 'edit' | 'preview'
  onModeChange: (m: 'edit' | 'preview') => void
}

export default function SpecEditor({ value, onChange, mode, onModeChange }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-200 bg-stone-50 shrink-0">
        <span className="text-xs font-medium text-stone-500 mr-auto">spec.md</span>
        <button
          onClick={() => onModeChange('edit')}
          className={`text-xs px-2 py-1 rounded ${mode === 'edit' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Edit
        </button>
        <button
          onClick={() => onModeChange('preview')}
          className={`text-xs px-2 py-1 rounded ${mode === 'preview' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Preview
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'edit' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full resize-none p-3 text-sm font-mono text-stone-800 bg-white focus:outline-none"
            spellCheck={false}
          />
        ) : (
          <div
            className="h-full overflow-y-auto p-4 text-sm text-stone-800"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }}
          />
        )}
      </div>
    </div>
  )
}
