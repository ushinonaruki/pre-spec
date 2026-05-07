'use client'

import { UI_TEXT } from '@/lib/uiText'

type Tab = 'log' | 'memo'

type Props = {
  activeTab: Tab
  onTabChange: (t: Tab) => void
  log: string
  memo: string
  onMemoChange: (v: string) => void
}

export default function BottomTabs({
  activeTab,
  onTabChange,
  log,
  memo,
  onMemoChange,
}: Props) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'log', label: UI_TEXT.bottomTabs.logTab },
    { id: 'memo', label: UI_TEXT.bottomTabs.memoTab },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-stone-200 bg-stone-50 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`px-4 py-2 text-xs transition-colors border-r border-stone-200 last:border-r-0
              ${activeTab === t.id
                ? 'bg-white text-stone-800 font-medium -mb-px border-b-2 border-b-white'
                : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'log' && (
          <textarea
            readOnly
            value={log || UI_TEXT.bottomTabs.logEmpty}
            className="w-full h-full resize-none p-3 text-xs font-mono text-stone-600 bg-white focus:outline-none"
          />
        )}
        {activeTab === 'memo' && (
          <textarea
            value={memo}
            onChange={(e) => onMemoChange(e.target.value)}
            placeholder={UI_TEXT.bottomTabs.memoPlaceholder}
            className="w-full h-full resize-none p-3 text-xs font-mono text-stone-700 bg-white focus:outline-none"
          />
        )}
      </div>
    </div>
  )
}
