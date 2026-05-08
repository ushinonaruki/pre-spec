'use client'

import { useRef, useState } from 'react'
import type { Project } from '@/types'
import type { CreateProjectInputs } from '@/lib/ldd/project'
import { generateProjectSlug } from '@/lib/ldd/slug'
import { validatePreSpecProject, preSpecProjectToProject } from '@/lib/projectFile'
import { UI_TEXT } from '@/lib/uiText'

const WORK_FILE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.pre-spec\.json$/

type View = 'landing' | 'new_project'

type Props = {
  onCreate: (inputs: CreateProjectInputs) => Promise<void>
  onOpenProject: (project: Project) => void
}

export default function StartScreen({ onCreate, onOpenProject }: Props) {
  const [view, setView] = useState<View>('landing')
  const [projectName, setProjectName] = useState('')
  const [requirementMemo, setRequirementMemo] = useState('')
  const [relatedMarkdown, setRelatedMarkdown] = useState<string | undefined>(undefined)
  const [relatedFilename, setRelatedFilename] = useState<string | undefined>(undefined)
  const [nameError, setNameError] = useState<string | null>(null)
  const [memoError, setMemoError] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isOpeningFile, setIsOpeningFile] = useState(false)

  const jsonInputRef = useRef<HTMLInputElement>(null)
  const relatedFileInputRef = useRef<HTMLInputElement>(null)

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setOpenError(null)

    if (!WORK_FILE_PATTERN.test(file.name)) {
      setOpenError(UI_TEXT.startScreen.openWorkFileNameError)
      return
    }

    setIsOpeningFile(true)
    try {
      const text = await file.text()
      const raw = JSON.parse(text) as unknown
      if (!validatePreSpecProject(raw)) {
        setOpenError(UI_TEXT.startScreen.openWorkFileError)
        return
      }
      const project = preSpecProjectToProject(raw)
      onOpenProject(project)
    } catch {
      setOpenError(UI_TEXT.startScreen.openWorkFileError)
    } finally {
      setIsOpeningFile(false)
    }
  }

  const handleRelatedFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      setRelatedMarkdown(text)
      setRelatedFilename(file.name)
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
    if (!requirementMemo.trim()) {
      setMemoError(UI_TEXT.startScreen.requirementMemoRequired)
      return
    }

    setNameError(null)
    setMemoError(null)
    setIsCreating(true)
    try {
      await onCreate({
        projectName: trimmedName,
        requirementMemo: requirementMemo.trim(),
        relatedMarkdown: relatedMarkdown || undefined,
      })
    } finally {
      setIsCreating(false)
    }
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
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={(e) => { void handleJsonFileChange(e) }}
              className="hidden"
            />
            <button
              onClick={() => jsonInputRef.current?.click()}
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

          <p className="text-xs text-stone-400 text-center">{UI_TEXT.startScreen.storageNote}</p>
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
            <textarea
              value={requirementMemo}
              onChange={(e) => { setRequirementMemo(e.target.value); setMemoError(null) }}
              placeholder={UI_TEXT.startScreen.requirementMemoPlaceholder}
              rows={5}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
            {memoError && <p className="text-xs text-red-600">{memoError}</p>}
          </div>

          {/* 関連資料 */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-700">
              {UI_TEXT.startScreen.relatedLabel}
            </label>
            <input
              ref={relatedFileInputRef}
              type="file"
              accept=".md,.txt"
              onChange={(e) => { void handleRelatedFileChange(e) }}
              className="hidden"
            />
            <button
              onClick={() => relatedFileInputRef.current?.click()}
              className="text-sm px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
            >
              {UI_TEXT.startScreen.relatedFileButton}
            </button>
            {relatedFilename && (
              <p className="text-xs text-stone-500">{UI_TEXT.startScreen.relatedFileSelected(relatedFilename)}</p>
            )}
            <textarea
              value={relatedMarkdown ?? ''}
              onChange={(e) => setRelatedMarkdown(e.target.value || undefined)}
              placeholder={UI_TEXT.startScreen.relatedNotePlaceholder}
              rows={3}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
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
