'use client'

import { useRef, useState } from 'react'
import type { Workspace } from '@/types'
import type { InitialRelatedSource } from '@/lib/feature'
import { validateWorkspaceSlug } from '@/lib/workspace'
import { validatePreSpecWorkspace, preSpecWorkspaceToWorkspace, PRE_SPEC_PROJECT_FILE_SUFFIX } from '@/lib/projectFile'
import type { WorkspaceSaveTarget } from '@/lib/storage/saveTarget'
import { pickOpenTarget } from '@/lib/storage/fsaSaveTarget'
import { UI_TEXT } from '@/lib/text/uiText'

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

export type CreateWorkspaceInputs = {
  slug: string
  relatedSources?: InitialRelatedSource[]
}

type Props = {
  onCreate: (inputs: CreateWorkspaceInputs) => Promise<{ ok: true } | { ok: false; error?: string }>
  onOpenWorkspace: (workspace: Workspace, saveTarget: WorkspaceSaveTarget) => void
}

export default function StartScreen({ onCreate, onOpenWorkspace }: Props) {
  const [view, setView] = useState<View>('landing')
  const [slug, setSlug] = useState('')
  const [relatedEntries, setRelatedEntries] = useState<RelatedEntry[]>([])
  const [slugError, setSlugError] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isOpeningFile, setIsOpeningFile] = useState(false)

  const handleOpenFile = async () => {
    setOpenError(null)
    setIsOpeningFile(true)
    try {
      const result = await pickOpenTarget()
      const filenameSlug = result.fileName.slice(0, -PRE_SPEC_PROJECT_FILE_SUFFIX.length)
      if (!result.fileName.endsWith(PRE_SPEC_PROJECT_FILE_SUFFIX) || !validateWorkspaceSlug(filenameSlug)) {
        setOpenError(UI_TEXT.startScreen.openWorkFileNameError)
        return
      }
      const raw = JSON.parse(result.text) as unknown
      if (!validatePreSpecWorkspace(raw)) {
        setOpenError(UI_TEXT.startScreen.openWorkFileError)
        return
      }
      const ws = preSpecWorkspaceToWorkspace(raw)
      onOpenWorkspace(ws, result.saveTarget)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setOpenError(UI_TEXT.startScreen.openWorkFileError)
    } finally {
      setIsOpeningFile(false)
    }
  }

  const handleCreate = async () => {
    const trimmedSlug = slug.trim()
    if (!trimmedSlug) {
      setSlugError(UI_TEXT.startScreen.slugRequired)
      return
    }
    if (!validateWorkspaceSlug(trimmedSlug)) {
      setSlugError(UI_TEXT.startScreen.slugInvalid)
      return
    }
    setSlugError(null)
    setCreateError(null)
    setIsCreating(true)
    try {
      const relatedSources: InitialRelatedSource[] = relatedEntries.flatMap((entry): InitialRelatedSource[] => {
        if (entry.mode === 'file' && entry.fileContent && entry.fileName) {
          return [{ kind: 'file' as const, filename: entry.fileName, content: entry.fileContent, note: entry.note || undefined }]
        }
        if (entry.mode === 'url' && entry.url.trim()) {
          return [{ kind: 'url' as const, url: entry.url.trim(), note: entry.note || undefined }]
        }
        return []
      })
      const result = await onCreate({
        slug: trimmedSlug,
        relatedSources: relatedSources.length > 0 ? relatedSources : undefined,
      })
      if (!result.ok && result.error) {
        setCreateError(result.error)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleAddRelatedEntry = () => {
    setRelatedEntries((prev) => [...prev, emptyEntry()])
  }

  const handleChangeRelatedEntry = (id: string, patch: Partial<RelatedEntry>) => {
    setRelatedEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e))
  }

  const handleRemoveRelatedEntry = (id: string) => {
    setRelatedEntries((prev) => prev.filter((e) => e.id !== id))
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
              onClick={() => { void handleOpenFile() }}
              disabled={isOpeningFile}
              className="w-full py-2.5 border border-stone-300 text-stone-700 text-sm font-medium rounded hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isOpeningFile ? UI_TEXT.startScreen.openWorkFileLoading : UI_TEXT.startScreen.openWorkFile}
            </button>

            {openError && (
              <p className="text-xs text-red-600 text-center">{openError}</p>
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
          <fieldset disabled={isCreating} className="border-0 p-0 m-0 min-w-0 space-y-5">
            {/* Workspace 名 */}
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

            {/* Global 関連資料 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700">
                {UI_TEXT.startScreen.relatedLabel}
              </label>
              {relatedEntries.map((entry) => (
                <RelatedEntryRow
                  key={entry.id}
                  entry={entry}
                  onChange={handleChangeRelatedEntry}
                  onRemove={handleRemoveRelatedEntry}
                />
              ))}
              <button
                onClick={handleAddRelatedEntry}
                className="text-sm text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {UI_TEXT.startScreen.relatedAddButton}
              </button>
            </div>
          </fieldset>

          <div className="border-t border-stone-100 pt-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => { void handleCreate() }}
                disabled={isCreating}
                className="flex-1 py-2.5 bg-stone-800 text-white text-sm font-medium rounded hover:bg-stone-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? UI_TEXT.startScreen.createButtonLoading : UI_TEXT.startScreen.createButton}
              </button>
              <button
                onClick={() => {
                  setSlug('')
                  setRelatedEntries([])
                  setSlugError(null)
                  setCreateError(null)
                  setView('landing')
                }}
                disabled={isCreating}
                className="px-4 py-2.5 border border-stone-300 text-stone-600 text-sm rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {UI_TEXT.startScreen.backButton}
              </button>
            </div>
            {createError && (
              <p className="text-xs text-red-600">{createError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
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
      if (!content.trim()) {
        setFileReadError(UI_TEXT.file.emptyFile(file.name))
        return
      }
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
          className={`text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${entry.mode === 'file' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          {UI_TEXT.startScreen.relatedFileMode}
        </button>
        <button
          onClick={() => onChange(entry.id, { mode: 'url' })}
          className={`text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${entry.mode === 'url' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          {UI_TEXT.startScreen.relatedUrlMode}
        </button>
        <button
          onClick={() => onRemove(entry.id)}
          className="ml-auto text-xs text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="text-sm px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-full text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}

      <textarea
        value={entry.note}
        onChange={(e) => onChange(entry.id, { note: e.target.value })}
        placeholder={UI_TEXT.startScreen.relatedNotePlaceholder}
        rows={2}
        className="w-full text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}
