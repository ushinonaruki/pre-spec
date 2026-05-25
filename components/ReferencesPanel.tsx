'use client'

import { useRef, useState } from 'react'
import type { RelatedSourceKind } from '@/types'
import { URL_SOURCE_NAME } from '@/lib/relatedSources'
import { UI_TEXT } from '@/lib/text/uiText'

type ScopeTab = 'global' | 'local'
type AddMode = 'file' | 'url'

type Props = {
  globalReferences: string
  localReferences: string
  onAppendGlobal: (kind: RelatedSourceKind, name: string, content: string, note?: string) => Promise<{ ok: boolean; reason?: string }>
  onAppendLocal: (kind: RelatedSourceKind, name: string, content: string, note?: string) => Promise<{ ok: boolean; reason?: string }>
  localDisabled: boolean
}

export default function ReferencesPanel({
  globalReferences,
  localReferences,
  onAppendGlobal,
  onAppendLocal,
  localDisabled,
}: Props) {
  const [scopeTab, setScopeTab] = useState<ScopeTab>('global')
  const [addMode, setAddMode] = useState<AddMode | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeScope = localDisabled ? 'global' : scopeTab
  const referencesMarkdown = activeScope === 'global' ? globalReferences : localReferences
  const onAddReference = activeScope === 'global' ? onAppendGlobal : onAppendLocal

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
    try {
      const result = await onAddReference('file', fileName, fileContent, noteInput.trim() || undefined)
      if (result.ok) {
        closeAddForm()
      } else {
        setReviewError(result.reason ? UI_TEXT.referencesPanel.addRefUnreadable(result.reason) : UI_TEXT.referencesPanel.addRefError)
      }
    } finally {
      setIsReviewing(false)
    }
  }

  async function handleAddUrl() {
    if (!urlInput.trim()) return
    setIsReviewing(true)
    setReviewError(null)
    try {
      const result = await onAddReference('url', URL_SOURCE_NAME, urlInput.trim(), noteInput.trim() || undefined)
      if (result.ok) {
        closeAddForm()
      } else {
        setReviewError(result.reason ? UI_TEXT.referencesPanel.addRefUnreadable(result.reason) : UI_TEXT.referencesPanel.addRefError)
      }
    } finally {
      setIsReviewing(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const content = await file.text()
      setFileContent(content)
      setFileName(file.name)
      setReviewError(null)
    } catch {
      setReviewError(UI_TEXT.referencesPanel.addRefFileReadError)
    }
  }

  const noteRow = (
    <div className="px-2 py-1.5 border-t border-stone-100 shrink-0">
      <textarea
        value={noteInput}
        onChange={(e) => setNoteInput(e.target.value)}
        placeholder={UI_TEXT.referencesPanel.addRefNotePlaceholder}
        disabled={isReviewing}
        rows={2}
        className="w-full text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-50 resize-none"
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header: scope tabs + add button */}
      <div className="flex items-center gap-2 px-3 border-b border-stone-200 bg-stone-50 shrink-0 h-10">
        <span className="text-xs font-medium text-stone-500 mr-auto">{UI_TEXT.referencesPanel.referencesTitle}</span>
        <div className="flex border border-stone-200 rounded overflow-hidden">
          <button
            onClick={() => { setScopeTab('global'); closeAddForm() }}
            className={`text-xs px-2 py-1 transition-colors cursor-pointer ${activeScope === 'global' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:bg-stone-100'}`}
          >
            {UI_TEXT.references.globalTab}
          </button>
          <button
            onClick={() => { if (!localDisabled) { setScopeTab('local'); closeAddForm() } }}
            disabled={localDisabled}
            className={`text-xs px-2 py-1 transition-colors border-l border-stone-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${activeScope === 'local' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:bg-stone-100'}`}
          >
            {UI_TEXT.references.localTab}
          </button>
        </div>
        {addMode === null && (
          <button
            onClick={openAddForm}
            className="text-xs text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            {UI_TEXT.referencesPanel.addRefButton}
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
                {UI_TEXT.referencesPanel.addRefFile}
              </button>
              <button
                onClick={() => { setAddMode('url'); setReviewError(null) }}
                disabled={isReviewing}
                className={`text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-50 cursor-pointer ${addMode === 'url' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {UI_TEXT.referencesPanel.addRefUrl}
              </button>
              <button
                onClick={closeAddForm}
                disabled={isReviewing}
                className="ml-auto text-xs text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {UI_TEXT.referencesPanel.addRefCloseButton}
              </button>
            </div>

            {addMode === 'file' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-2 py-1.5 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt"
                    onChange={(e) => { void handleFileChange(e) }}
                    className="hidden"
                  />
                  {fileContent !== null ? (
                    <p className="text-xs font-mono text-stone-500">{fileName}</p>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      {UI_TEXT.referencesPanel.addRefFileButton}
                    </button>
                  )}
                </div>
                {noteRow}
                <div className="shrink-0 px-2 py-1.5 border-t border-stone-100 flex items-center gap-2">
                  <button
                    onClick={() => { void handleAddFile() }}
                    disabled={!fileContent || isReviewing}
                    className="text-xs px-3 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {isReviewing ? UI_TEXT.referencesPanel.addRefReviewing : UI_TEXT.referencesPanel.addRefAddButton}
                  </button>
                  {reviewError !== null && (
                    <span className="text-xs text-red-600">{reviewError}</span>
                  )}
                </div>
              </div>
            )}

            {addMode === 'url' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-2 py-1.5 shrink-0">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={UI_TEXT.referencesPanel.addRefUrlPlaceholder}
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
                    {isReviewing ? UI_TEXT.referencesPanel.addRefReviewing : UI_TEXT.referencesPanel.addRefAddButton}
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
            value={referencesMarkdown}
            className="w-full h-full resize-none p-3 text-xs font-mono text-stone-700 bg-white focus:outline-none"
          />
        )}
      </div>
    </div>
  )
}
