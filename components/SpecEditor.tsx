'use client'

import { useState } from 'react'
import { findDuplicateSectionTitles, markdownToHtml } from '@/lib/markdown'
import { UI_TEXT } from '@/lib/text/uiText'

type ViewMode = 'preview' | 'source' | 'edit'

type Props = {
  value: string
  onSave: (value: string) => void
  disabled?: boolean
}

export default function SpecEditor({ value, onSave, disabled = false }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('source')
  const [draft, setDraft] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleEnterEdit() {
    setDraft(value)
    setSaveError(null)
    setViewMode('edit')
  }

  function handleSave() {
    const duplicates = findDuplicateSectionTitles(draft)
    if (duplicates.length > 0) {
      setSaveError(UI_TEXT.specEditor.duplicateSectionTitles(duplicates))
      return
    }
    setSaveError(null)
    onSave(draft)
    setViewMode('source')
  }

  function handleCancel() {
    setSaveError(null)
    setViewMode('source')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 border-b border-stone-200 bg-stone-50 shrink-0 h-10">
        <span className="text-xs font-medium text-stone-500 mr-auto">{UI_TEXT.specEditor.fileLabel}</span>
        {viewMode === 'edit' ? (
          <>
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 transition-colors cursor-pointer"
            >
              {UI_TEXT.specEditor.saveButton}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-2 py-1 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            >
              {UI_TEXT.specEditor.cancelButton}
            </button>
          </>
        ) : (
          <>
            <div className="flex border border-stone-200 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('preview')}
                disabled={disabled}
                className={`text-xs px-2 py-1 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${viewMode === 'preview' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:bg-stone-100'}`}
              >
                {UI_TEXT.specEditor.previewButton}
              </button>
              <button
                onClick={() => setViewMode('source')}
                disabled={disabled}
                className={`text-xs px-2 py-1 transition-colors border-l border-stone-200 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${viewMode === 'source' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:bg-stone-100'}`}
              >
                {UI_TEXT.specEditor.sourceButton}
              </button>
            </div>
            <button
              onClick={handleEnterEdit}
              disabled={disabled}
              className="text-xs px-2 py-1 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {UI_TEXT.specEditor.editButton}
            </button>
          </>
        )}
      </div>

      {viewMode === 'edit' && (
        <div className="shrink-0 px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
          {UI_TEXT.specEditor.editModeNote}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'preview' && (
          <div
            className="h-full overflow-y-auto p-4 text-sm text-stone-800"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }}
          />
        )}
        {viewMode === 'source' && (
          <textarea
            readOnly
            disabled={disabled}
            value={value}
            className="w-full h-full resize-none p-3 text-sm font-mono text-stone-800 bg-white focus:outline-none"
            spellCheck={false}
          />
        )}
        {viewMode === 'edit' && (
          <div className="flex flex-col h-full">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 min-h-0 resize-none p-3 text-sm font-mono text-stone-800 bg-white focus:outline-none"
              spellCheck={false}
            />
            {saveError && (
              <div className="shrink-0 border-t border-red-200 bg-red-50 px-3 py-2">
                <p className="text-xs text-red-600">{saveError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
