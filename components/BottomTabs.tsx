'use client'

import { useRef, useState } from 'react'
import type { RelatedSourceKind } from '@/types'
import { UI_TEXT } from '@/lib/text/uiText'

type AddMode = 'file' | 'url'

type Props = {
  memo: string
  onAddReference: (kind: RelatedSourceKind, name: string, content: string, note?: string) => Promise<{ ok: boolean; reason?: string }>
}

export default function BottomTabs({ memo, onAddReference }: Props) {
  const [addMode, setAddMode] = useState<AddMode | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function openAddForm() {
    setAddMode('file')
    setUrlInput('')
    setNoteInput('')
    setFileContent(null)
    setFileName(null)
    setIsReviewing(false)
    setReviewError(null)
  }

  function closeAddForm() {
    setAddMode(null)
    setUrlInput('')
    setNoteInput('')
    setFileContent(null)
    setFileName(null)
    setIsReviewing(false)
    setReviewError(null)
  }

  async function handleAddFile() {
    if (!fileContent || !fileName) return
    setIsReviewing(true)
    setReviewError(null)
    const result = await onAddReference('file', fileName, fileContent, noteInput.trim() || undefined)
    setIsReviewing(false)
    if (result.ok) {
      closeAddForm()
    } else {
      setReviewError(result.reason ? UI_TEXT.bottomTabs.addRefUnreadable(result.reason) : UI_TEXT.bottomTabs.addRefError)
    }
  }

  async function handleAddUrl() {
    if (!urlInput.trim()) return
    setIsReviewing(true)
    setReviewError(null)
    const result = await onAddReference('url', 'url-source', urlInput.trim(), noteInput.trim() || undefined)
    setIsReviewing(false)
    if (result.ok) {
      closeAddForm()
    } else {
      setReviewError(result.reason ? UI_TEXT.bottomTabs.addRefUnreadable(result.reason) : UI_TEXT.bottomTabs.addRefError)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const content = await file.text()
      if (!content.trim()) return
      setFileContent(content)
      setFileName(file.name)
    } catch {
      // ignore read errors
    }
  }

  const noteRow = (
    <div className="px-2 py-1.5 border-t border-stone-100 shrink-0">
      <textarea
        value={noteInput}
        onChange={(e) => setNoteInput(e.target.value)}
        placeholder={UI_TEXT.bottomTabs.addRefNotePlaceholder}
        disabled={isReviewing}
        rows={2}
        className="w-full text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-50 resize-none"
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-stone-200 bg-stone-50 shrink-0 px-2">
        <span className="text-xs text-stone-500 py-2">{UI_TEXT.bottomTabs.memoTab}</span>
        {addMode === null && (
          <button
            onClick={openAddForm}
            className="ml-auto text-xs text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            {UI_TEXT.bottomTabs.addRefButton}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {addMode !== null ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-stone-100 bg-stone-50 shrink-0">
              <button
                onClick={() => { setAddMode('file'); setReviewError(null) }}
                disabled={isReviewing}
                className={`text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-50 cursor-pointer ${addMode === 'file' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {UI_TEXT.bottomTabs.addRefFile}
              </button>
              <button
                onClick={() => { setAddMode('url'); setReviewError(null) }}
                disabled={isReviewing}
                className={`text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-50 cursor-pointer ${addMode === 'url' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {UI_TEXT.bottomTabs.addRefUrl}
              </button>
              <button
                onClick={closeAddForm}
                disabled={isReviewing}
                className="ml-auto text-xs text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addMode === 'file' && (
              fileContent !== null ? (
                <div className="flex flex-col flex-1 min-h-0 justify-end">
                  <div className="px-2 py-1.5 text-xs font-mono text-stone-500 shrink-0">{fileName}</div>
                  {noteRow}
                  <div className="shrink-0 px-2 py-1.5 border-t border-stone-100 flex items-center gap-2">
                    <button
                      onClick={() => { void handleAddFile() }}
                      disabled={isReviewing}
                      className="text-xs px-3 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isReviewing ? UI_TEXT.bottomTabs.addRefReviewing : UI_TEXT.bottomTabs.addRefAddButton}
                    </button>
                    {reviewError !== null && (
                      <span className="text-xs text-red-600">{reviewError}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt"
                    onChange={(e) => { void handleFileChange(e) }}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    {UI_TEXT.bottomTabs.addRefFileButton}
                  </button>
                </div>
              )
            )}

            {addMode === 'url' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-2 py-1.5 shrink-0">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={UI_TEXT.bottomTabs.addRefUrlPlaceholder}
                    disabled={isReviewing}
                    className="w-full text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-50 font-mono"
                  />
                </div>
                {noteRow}
                <div className="shrink-0 px-2 py-1.5 border-t border-stone-100 flex items-center gap-2">
                  <button
                    onClick={() => { void handleAddUrl() }}
                    disabled={!urlInput.trim() || isReviewing}
                    className="text-xs px-3 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {isReviewing ? UI_TEXT.bottomTabs.addRefReviewing : UI_TEXT.bottomTabs.addRefAddButton}
                  </button>
                  {reviewError !== null && (
                    <span className="text-xs text-red-600">{reviewError}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <textarea
            readOnly
            value={memo}
            className="w-full h-full resize-none p-3 text-xs font-mono text-stone-700 bg-white focus:outline-none"
          />
        )}
      </div>
    </div>
  )
}
