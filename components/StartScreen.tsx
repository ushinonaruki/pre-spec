'use client'

import { useRef, useState } from 'react'
import type { Project } from '@/types'
import type { CreateProjectInputs } from '@/lib/ldd/project'
import { validatePreSpecProject, preSpecProjectToProject } from '@/lib/projectFile'
import { UI_TEXT } from '@/lib/uiText'

type View = 'landing' | 'new_project'

type Props = {
  onCreate: (inputs: CreateProjectInputs) => void
  onOpenProject: (project: Project) => void
}

export default function StartScreen({ onCreate, onOpenProject }: Props) {
  const [view, setView] = useState<View>('landing')
  const [requirementMemo, setRequirementMemo] = useState('')
  const [baseSpecMarkdown, setBaseSpecMarkdown] = useState<string | undefined>(undefined)
  const [baseSpecFilename, setBaseSpecFilename] = useState<string | undefined>(undefined)
  const [relatedNote, setRelatedNote] = useState('')
  const [memoError, setMemoError] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [isOpeningFile, setIsOpeningFile] = useState(false)

  const jsonInputRef = useRef<HTMLInputElement>(null)
  const baseSpecInputRef = useRef<HTMLInputElement>(null)

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setOpenError(null)
    setIsOpeningFile(true)
    try {
      const text = await file.text()
      const raw = JSON.parse(text) as unknown
      if (!validatePreSpecProject(raw)) {
        setOpenError(UI_TEXT.startScreen.openProjectJsonError)
        return
      }
      const project = preSpecProjectToProject(raw)
      onOpenProject(project)
    } catch {
      setOpenError(UI_TEXT.startScreen.openProjectJsonError)
    } finally {
      setIsOpeningFile(false)
    }
  }

  const handleBaseSpecFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      setBaseSpecMarkdown(text)
      setBaseSpecFilename(file.name)
    } catch {
      // ignore read errors
    }
  }

  const handleCreate = () => {
    if (!requirementMemo.trim()) {
      setMemoError(UI_TEXT.startScreen.requirementMemoRequired)
      return
    }
    setMemoError(null)
    onCreate({
      requirementMemo: requirementMemo.trim(),
      baseSpecMarkdown: baseSpecMarkdown || undefined,
      relatedMarkdown: relatedNote.trim() || undefined,
    })
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
              {isOpeningFile ? UI_TEXT.startScreen.openProjectJsonLoading : UI_TEXT.startScreen.openProjectJson}
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

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-700">
              {UI_TEXT.startScreen.baseSpecLabel}
            </label>
            <input
              ref={baseSpecInputRef}
              type="file"
              accept=".md,.txt"
              onChange={(e) => { void handleBaseSpecFileChange(e) }}
              className="hidden"
            />
            <button
              onClick={() => baseSpecInputRef.current?.click()}
              className="text-sm px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
            >
              {UI_TEXT.startScreen.baseSpecButton}
            </button>
            {baseSpecFilename && (
              <p className="text-xs text-stone-500">{UI_TEXT.startScreen.baseSpecSelected(baseSpecFilename)}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-700">
              {UI_TEXT.startScreen.relatedNoteLabel}
            </label>
            <textarea
              value={relatedNote}
              onChange={(e) => setRelatedNote(e.target.value)}
              placeholder={UI_TEXT.startScreen.relatedNotePlaceholder}
              rows={3}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>

          <p className="text-xs text-stone-400">{UI_TEXT.startScreen.noLLMNote}</p>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 py-2.5 bg-stone-800 text-white text-sm font-medium rounded hover:bg-stone-700 transition-colors"
            >
              {UI_TEXT.startScreen.startButton}
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
