'use client'

import { useRef, useState } from 'react'
import { UI_TEXT } from '@/text/uiText'

type RawRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

type Props = {
  isLoading: boolean
  error: string | null
  onCreateWorkspace: (slug: string, relatedSources: RawRelatedSource[]) => void
  onOpenWorkspace: (filename: string, content: string) => void
  onClearError: () => void
}

type View = 'landing' | 'new_workspace'

type RelatedEntryMode = 'file' | 'url'

type RelatedEntry = {
  id: string
  mode: RelatedEntryMode
  fileContent: string | null
  fileName: string | null
  url: string
  note: string
}

function emptyEntry(): RelatedEntry {
  return { id: crypto.randomUUID(), mode: 'file', fileContent: null, fileName: null, url: '', note: '' }
}

function isValidSlug(s: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(s)
}

function RelatedEntryRow({
  entry,
  onChange,
  onRemove,
}: {
  entry: RelatedEntry
  onChange: (id: string, patch: Partial<RelatedEntry>) => void
  onRemove: (id: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileReadError, setFileReadError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const content = await file.text()
      onChange(entry.id, { fileContent: content, fileName: file.name })
      setFileReadError(null)
    } catch {
      setFileReadError(UI_TEXT.startScreen.relatedFileReadError)
    }
  }

  return (
    <div className="border border-stone-200 rounded p-3 space-y-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(entry.id, { mode: 'file' })}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${entry.mode === 'file' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          {UI_TEXT.startScreen.relatedFileMode}
        </button>
        <button
          onClick={() => onChange(entry.id, { mode: 'url' })}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${entry.mode === 'url' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          {UI_TEXT.startScreen.relatedUrlMode}
        </button>
        <button
          onClick={() => onRemove(entry.id)}
          className="ml-auto text-xs text-stone-400 hover:text-stone-700 transition-colors"
        >
          {UI_TEXT.startScreen.relatedRemoveButton}
        </button>
      </div>

      {entry.mode === 'file' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            onChange={(e) => { void handleFileChange(e) }}
            className="hidden"
          />
          {entry.fileName ? (
            <p className="text-xs text-stone-500">{UI_TEXT.startScreen.relatedFileSelected(entry.fileName)}</p>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
            >
              {UI_TEXT.startScreen.relatedFileButton}
            </button>
          )}
          {fileReadError && <p className="text-xs text-red-600">{fileReadError}</p>}
        </>
      )}

      {entry.mode === 'url' && (
        <input
          type="text"
          value={entry.url}
          onChange={(e) => onChange(entry.id, { url: e.target.value })}
          placeholder={UI_TEXT.startScreen.relatedUrlPlaceholder}
          className="w-full text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
        />
      )}

      <textarea
        value={entry.note}
        onChange={(e) => onChange(entry.id, { note: e.target.value })}
        placeholder={UI_TEXT.startScreen.relatedNotePlaceholder}
        rows={2}
        className="w-full text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
      />
    </div>
  )
}

export function StartScreen({ isLoading, error, onCreateWorkspace, onOpenWorkspace, onClearError }: Props) {
  const [view, setView] = useState<View>('landing')
  const [slug, setSlug] = useState('')
  const [relatedEntries, setRelatedEntries] = useState<RelatedEntry[]>([])
  const [slugError, setSlugError] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      onOpenWorkspace(file.name, content)
    }
    reader.onerror = () => setOpenError(UI_TEXT.startScreen.openWorkFileError)
    reader.readAsText(file)
  }

  const handleCreate = () => {
    const trimmedSlug = slug.trim()
    if (!trimmedSlug) {
      setSlugError(UI_TEXT.startScreen.slugRequired)
      return
    }
    if (!isValidSlug(trimmedSlug)) {
      setSlugError(UI_TEXT.startScreen.slugInvalid)
      return
    }
    setSlugError(null)
    const relatedSources = relatedEntries.flatMap((entry): RawRelatedSource[] => {
      if (entry.mode === 'file' && entry.fileContent && entry.fileName) {
        return [{ kind: 'file', filename: entry.fileName, content: entry.fileContent, note: entry.note || undefined }]
      }
      if (entry.mode === 'url' && entry.url.trim()) {
        return [{ kind: 'url', url: entry.url.trim(), note: entry.note || undefined }]
      }
      return []
    })
    onCreateWorkspace(trimmedSlug, relatedSources)
  }

  const handleBack = () => {
    setSlug('')
    setRelatedEntries([])
    setSlugError(null)
    onClearError()
    setView('landing')
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{UI_TEXT.app.name}</h1>
            <p className="text-sm text-stone-500 mt-1">{UI_TEXT.app.tagline}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 border border-stone-300 text-stone-700 text-sm font-medium rounded hover:bg-stone-100 transition-colors"
            >
              {UI_TEXT.startScreen.openWorkFile}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleOpenFile}
            />

            {(openError || error) && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded px-3 py-2">
                <span className="flex-1">{openError ?? error}</span>
                <button
                  onClick={() => { setOpenError(null); onClearError() }}
                  className="shrink-0 text-red-400 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              onClick={() => setView('new_workspace')}
              className="w-full py-2.5 bg-stone-800 text-white text-sm font-medium rounded hover:bg-stone-700 transition-colors"
            >
              {UI_TEXT.startScreen.newWorkspace}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-start justify-center p-6">
      <div className="w-full max-w-lg mt-12 space-y-5">
        <h1 className="text-2xl font-bold text-stone-800">{UI_TEXT.app.name}</h1>

        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-5">
          <fieldset disabled={isLoading} className="border-0 p-0 m-0 min-w-0 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-700">
                {UI_TEXT.startScreen.slugLabel}
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugError(null) }}
                placeholder={UI_TEXT.startScreen.slugPlaceholder}
                className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {slugError && <p className="text-xs text-red-600">{slugError}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700">
                {UI_TEXT.startScreen.relatedLabel}
              </label>
              {relatedEntries.map((entry) => (
                <RelatedEntryRow
                  key={entry.id}
                  entry={entry}
                  onChange={(id, patch) =>
                    setRelatedEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
                  }
                  onRemove={(id) => setRelatedEntries((prev) => prev.filter((e) => e.id !== id))}
                />
              ))}
              <button
                onClick={() => setRelatedEntries((prev) => [...prev, emptyEntry()])}
                className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
              >
                {UI_TEXT.startScreen.relatedAddButton}
              </button>
            </div>
          </fieldset>

          <div className="border-t border-stone-100 pt-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-stone-800 text-white text-sm font-medium rounded hover:bg-stone-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? UI_TEXT.startScreen.createButtonLoading : UI_TEXT.startScreen.createButton}
              </button>
              <button
                onClick={handleBack}
                disabled={isLoading}
                className="px-4 py-2.5 border border-stone-300 text-stone-600 text-sm rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {UI_TEXT.startScreen.backButton}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
