'use client'

import { useRef, useState } from 'react'
import type { Project } from '@/types'
import type { CreateProjectInputs, InitialRelatedSource } from '@/lib/ldd/project'
import { generateProjectSlug } from '@/lib/ldd/slug'
import { validatePreSpecProject, preSpecProjectToProject } from '@/lib/projectFile'
import type { ProjectSaveTarget } from '@/lib/storage/saveTarget'
import { pickOpenTarget } from '@/lib/storage/fsaSaveTarget'
import { UI_TEXT } from '@/lib/text/uiText'

const WORK_FILE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.pre-spec\.json$/

type View = 'landing' | 'new_project'

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

type Props = {
  onCreate: (inputs: CreateProjectInputs) => Promise<void>
  onOpenProject: (project: Project, saveTarget: ProjectSaveTarget) => void
}

export default function StartScreen({ onCreate, onOpenProject }: Props) {
  const [view, setView] = useState<View>('landing')
  const [projectName, setProjectName] = useState('')
  const [requirementMemoContent, setRequirementMemoContent] = useState<string | null>(null)
  const [requirementMemoFilename, setRequirementMemoFilename] = useState<string | null>(null)
  const [relatedEntries, setRelatedEntries] = useState<RelatedEntry[]>([])
  const [nameError, setNameError] = useState<string | null>(null)
  const [memoError, setMemoError] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isOpeningFile, setIsOpeningFile] = useState(false)

  const requirementMemoFileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenFile = async () => {
    setOpenError(null)
    setIsOpeningFile(true)
    try {
      const result = await pickOpenTarget()
      if (!WORK_FILE_PATTERN.test(result.fileName)) {
        setOpenError(UI_TEXT.startScreen.openWorkFileNameError)
        return
      }
      const raw = JSON.parse(result.text) as unknown
      if (!validatePreSpecProject(raw)) {
        setOpenError(UI_TEXT.startScreen.openWorkFileError)
        return
      }
      const filenameSlug = result.fileName.replace(/\.pre-spec\.json$/, '')
      const project = { ...preSpecProjectToProject(raw), slug: filenameSlug }
      onOpenProject(project, result.saveTarget)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setOpenError(UI_TEXT.startScreen.openWorkFileError)
    } finally {
      setIsOpeningFile(false)
    }
  }

  const handleRequirementMemoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      setRequirementMemoContent(text)
      setRequirementMemoFilename(file.name)
      setMemoError(null)
    } catch {
      // ignore read errors
    }
  }

  const handleCreate = async () => {
    const trimmedName = projectName.trim()
    const slug = generateProjectSlug(trimmedName)

    if (!trimmedName) {
      setNameError(UI_TEXT.startScreen.projectNameRequired)
      return
    }
    if (!slug) {
      setNameError(UI_TEXT.startScreen.projectNameInvalid)
      return
    }
    if (!requirementMemoContent) {
      setMemoError(UI_TEXT.startScreen.requirementMemoRequired)
      return
    }

    setNameError(null)
    setMemoError(null)
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
      await onCreate({
        projectName: trimmedName,
        requirementMemo: requirementMemoContent,
        relatedSources: relatedSources.length > 0 ? relatedSources : undefined,
      })
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
              onClick={() => setView('new_project')}
              className="w-full py-2.5 bg-stone-800 text-white text-sm font-medium rounded hover:bg-stone-700 transition-colors"
            >
              {UI_TEXT.startScreen.newProject}
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
          {/* プロジェクト名 */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-700">
              {UI_TEXT.startScreen.projectNameLabel}
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => { setProjectName(e.target.value); setNameError(null) }}
              placeholder={UI_TEXT.startScreen.projectNamePlaceholder}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            {nameError && <p className="text-xs text-red-600">{nameError}</p>}
            {projectName.trim() && generateProjectSlug(projectName.trim()) && (
              <p className="text-xs text-stone-400">
                ファイル名: {generateProjectSlug(projectName.trim())}.pre-spec.json
              </p>
            )}
          </div>

          {/* 要件メモ */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-700">
              {UI_TEXT.startScreen.requirementMemoLabel}
            </label>
            <input
              ref={requirementMemoFileInputRef}
              type="file"
              accept=".md,.txt"
              onChange={(e) => { void handleRequirementMemoFileChange(e) }}
              className="hidden"
            />
            {requirementMemoFilename ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 truncate flex-1">{UI_TEXT.startScreen.requirementMemoFileSelected(requirementMemoFilename)}</span>
                <button
                  onClick={() => { setRequirementMemoContent(null); setRequirementMemoFilename(null) }}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors shrink-0"
                >
                  {UI_TEXT.startScreen.relatedRemoveButton}
                </button>
              </div>
            ) : (
              <button
                onClick={() => requirementMemoFileInputRef.current?.click()}
                className="text-sm px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
              >
                {UI_TEXT.startScreen.requirementMemoFileButton}
              </button>
            )}
            {memoError && <p className="text-xs text-red-600">{memoError}</p>}
          </div>

          {/* 関連資料 */}
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
              className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
            >
              {UI_TEXT.startScreen.relatedAddButton}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { void handleCreate() }}
              disabled={isCreating}
              className="flex-1 py-2.5 bg-stone-800 text-white text-sm font-medium rounded hover:bg-stone-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? UI_TEXT.startScreen.startButtonLoading : UI_TEXT.startScreen.startButton}
            </button>
            <button
              onClick={() => setView('landing')}
              className="px-4 py-2.5 border border-stone-300 text-stone-600 text-sm rounded hover:bg-stone-50 transition-colors"
            >
              {UI_TEXT.startScreen.backButton}
            </button>
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const content = await file.text()
      onChange(entry.id, { fileContent: content, fileName: file.name })
    } catch {
      // ignore read errors
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
