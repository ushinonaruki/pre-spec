'use client'

import { useState, useRef } from 'react'
import { UI_TEXT } from '@/text/uiText'

type Props = {
  globalReferences: string
  localReferences: string
  activeFeatureId?: string
  onAddReference: (params: {
    featureId?: string
    kind: 'file' | 'url'
    name: string
    content: string
    note?: string
  }) => Promise<unknown> | void
}

type Tab = 'global' | 'local'
type AddMode = 'file' | 'url'

export function ReferencesPanel({
  globalReferences,
  localReferences,
  activeFeatureId,
  onAddReference,
}: Props) {
  const [tab, setTab] = useState<Tab>('global')
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('url')
  const [urlValue, setUrlValue] = useState('')
  const [noteValue, setNoteValue] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const references = tab === 'global' ? globalReferences : localReferences
  const previewLines = references.trim().split('\n').slice(0, 30).join('\n')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFileName(file.name)
      setFileContent(ev.target?.result as string)
    }
    reader.onerror = () => setAddError(UI_TEXT.referencesPanel.addRefFileReadError)
    reader.readAsText(file)
  }

  const handleAdd = async () => {
    setAddError('')
    setIsAdding(true)
    try {
      const params =
        addMode === 'url'
          ? { kind: 'url' as const, name: urlValue, content: urlValue, note: noteValue || undefined }
          : { kind: 'file' as const, name: fileName, content: fileContent, note: noteValue || undefined }

      const featureId = tab === 'local' ? activeFeatureId : undefined
      await onAddReference({ ...params, featureId })
      setShowAdd(false)
      setUrlValue('')
      setNoteValue('')
      setFileName('')
      setFileContent('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : UI_TEXT.referencesPanel.addRefError)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
          {UI_TEXT.referencesPanel.referencesTitle}
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          {showAdd ? UI_TEXT.referencesPanel.addRefCloseButton : UI_TEXT.referencesPanel.addRefButton}
        </button>
      </div>

      <div className="flex gap-2 mb-2 text-xs">
        <button
          onClick={() => setTab('global')}
          className={`px-2 py-0.5 rounded ${tab === 'global' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:bg-stone-100'}`}
        >
          {UI_TEXT.references.globalTab}
        </button>
        {activeFeatureId && (
          <button
            onClick={() => setTab('local')}
            className={`px-2 py-0.5 rounded ${tab === 'local' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:bg-stone-100'}`}
          >
            {UI_TEXT.references.localTab}
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-3 border border-stone-200 rounded p-2 flex flex-col gap-2">
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setAddMode('url')}
              className={`px-2 py-0.5 rounded ${addMode === 'url' ? 'bg-stone-200' : 'hover:bg-stone-100'}`}
            >
              {UI_TEXT.referencesPanel.addRefUrl}
            </button>
            <button
              onClick={() => setAddMode('file')}
              className={`px-2 py-0.5 rounded ${addMode === 'file' ? 'bg-stone-200' : 'hover:bg-stone-100'}`}
            >
              {UI_TEXT.referencesPanel.addRefFile}
            </button>
          </div>

          {addMode === 'url' ? (
            <input
              type="text"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder={UI_TEXT.referencesPanel.addRefUrlPlaceholder}
              className="border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none"
            />
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-stone-500 border border-stone-300 rounded px-2 py-1 hover:bg-stone-50"
              >
                {UI_TEXT.referencesPanel.addRefFileButton}
              </button>
              {fileName && <span className="text-xs text-stone-500 truncate">{fileName}</span>}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          <input
            type="text"
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder={UI_TEXT.referencesPanel.addRefNotePlaceholder}
            className="border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none"
          />

          {addError && <p className="text-red-600 text-xs">{addError}</p>}

          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="text-xs py-1 rounded bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {isAdding ? UI_TEXT.referencesPanel.addRefReviewing : UI_TEXT.referencesPanel.addRefAddButton}
          </button>
        </div>
      )}

      {previewLines ? (
        <pre className="text-xs text-stone-500 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
          {previewLines}
        </pre>
      ) : (
        <p className="text-xs text-stone-400 italic">(なし)</p>
      )}
    </div>
  )
}
