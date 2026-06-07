'use client'

import { useState, useRef } from 'react'
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

export function StartScreen({ isLoading, error, onCreateWorkspace, onOpenWorkspace, onClearError }: Props) {
  const [view, setView] = useState<View>('landing')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [relatedSources, setRelatedSources] = useState<RawRelatedSource[]>([])
  const [openError, setOpenError] = useState('')
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
    if (!slug.trim()) {
      setSlugError(UI_TEXT.startScreen.slugRequired)
      return
    }
    setSlugError('')
    onCreateWorkspace(slug.trim(), relatedSources)
  }

  const addRelatedUrl = () => {
    setRelatedSources((prev) => [...prev, { kind: 'url' as const, url: '' }])
  }

  const removeRelated = (idx: number) => {
    setRelatedSources((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateRelated = (idx: number, update: Partial<RawRelatedSource>) => {
    setRelatedSources((prev) =>
      prev.map((src, i) => (i === idx ? { ...src, ...update } as RawRelatedSource : src)),
    )
  }

  if (view === 'landing') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-stone-800">{UI_TEXT.app.name}</h1>
          <p className="text-stone-500 mt-1">{UI_TEXT.app.tagline}</p>
        </div>

        {(error || openError) && (
          <div className="text-red-600 text-sm bg-red-50 rounded px-4 py-2 max-w-md text-center">
            {error || openError}
            <button onClick={() => { onClearError(); setOpenError('') }} className="ml-2 text-red-400">✕</button>
          </div>
        )}

        <div className="flex flex-col gap-3 w-64">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 px-4 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
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

          <button
            onClick={() => setView('new_workspace')}
            className="w-full py-2 px-4 rounded bg-stone-800 text-white hover:bg-stone-700"
          >
            {UI_TEXT.startScreen.newWorkspace}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold text-stone-800 mb-6">{UI_TEXT.startScreen.newWorkspace}</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">
            {UI_TEXT.startScreen.slugLabel}
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={UI_TEXT.startScreen.slugPlaceholder}
            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
          {slugError && <p className="text-red-600 text-xs mt-1">{slugError}</p>}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-stone-700">{UI_TEXT.startScreen.relatedLabel}</label>
            <button
              type="button"
              onClick={addRelatedUrl}
              className="text-xs text-stone-500 hover:text-stone-700"
            >
              {UI_TEXT.startScreen.relatedAddButton} URL
            </button>
          </div>
          {relatedSources.map((src, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              {src.kind === 'url' ? (
                <input
                  type="text"
                  value={(src as { url: string }).url}
                  onChange={(e) => updateRelated(idx, { url: e.target.value } as Partial<RawRelatedSource>)}
                  placeholder={UI_TEXT.startScreen.relatedUrlPlaceholder}
                  className="flex-1 border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none"
                />
              ) : (
                <span className="flex-1 text-sm text-stone-500">{(src as { filename: string }).filename}</span>
              )}
              <button
                onClick={() => removeRelated(idx)}
                className="text-stone-400 hover:text-stone-600 text-xs"
              >
                {UI_TEXT.startScreen.relatedRemoveButton}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setView('landing')}
            className="flex-1 py-2 px-4 rounded border border-stone-300 text-stone-700 hover:bg-stone-50"
          >
            {UI_TEXT.startScreen.backButton}
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="flex-1 py-2 px-4 rounded bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {isLoading ? UI_TEXT.startScreen.createButtonLoading : UI_TEXT.startScreen.createButton}
          </button>
        </div>
      </div>
    </div>
  )
}
