'use client'

import { useState } from 'react'
import { markdownToHtml } from '@/lib/markdown'
import { UI_TEXT } from '@/lib/uiText'

type Props = {
  value: string
  onSave: (value: string, memo?: string) => void
}

export default function SpecEditor({ value, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [memo, setMemo] = useState('')

  function handleEnterEdit() {
    setDraft(value)
    setMemo('')
    setIsEditing(true)
  }

  function handleSave() {
    onSave(draft, memo.trim() || undefined)
    setIsEditing(false)
  }

  function handleCancel() {
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-200 bg-stone-50 shrink-0">
        <span className="text-xs font-medium text-stone-500 mr-auto">{UI_TEXT.specEditor.fileLabel}</span>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 transition-colors"
            >
              {UI_TEXT.specEditor.saveButton}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-2 py-1 text-stone-500 hover:text-stone-800 transition-colors"
            >
              {UI_TEXT.specEditor.cancelButton}
            </button>
          </>
        ) : (
          <button
            onClick={handleEnterEdit}
            className="text-xs px-2 py-1 text-stone-500 hover:text-stone-800 transition-colors"
          >
            {UI_TEXT.specEditor.editButton}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="shrink-0 px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
          {UI_TEXT.specEditor.editModeNote}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {isEditing ? (
          <div className="flex flex-col h-full">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 min-h-0 resize-none p-3 text-sm font-mono text-stone-800 bg-white focus:outline-none"
              spellCheck={false}
            />
            <div className="shrink-0 border-t border-stone-200 px-3 py-2">
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder={UI_TEXT.specEditor.memoPlaceholder}
                className="w-full border border-stone-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
          </div>
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
