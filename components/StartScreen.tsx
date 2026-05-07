'use client'

import { useRef, useState } from 'react'
import type { Project } from '@/types'
import { validatePreSpecProject, preSpecProjectToProject } from '@/lib/projectFile'
import { UI_TEXT } from '@/lib/uiText'

type Props = {
  onStart: (prompt: string) => Promise<void>
  onOpenProject: (project: Project) => void
}

export default function StartScreen({ onStart, onOpenProject }: Props) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpeningFile, setIsOpeningFile] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleStart = async () => {
    if (!prompt.trim() || isLoading) return
    setIsLoading(true)
    try {
      await onStart(prompt.trim())
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{UI_TEXT.app.name}</h1>
          <p className="text-sm text-stone-500 mt-1">{UI_TEXT.app.tagline}</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700">
              {UI_TEXT.startScreen.promptLabel}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleStart()
              }}
              placeholder={UI_TEXT.startScreen.promptPlaceholder}
              rows={4}
              disabled={isLoading}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none disabled:opacity-60"
            />
            <p className="text-xs text-stone-400">{UI_TEXT.startScreen.shortcutHint}</p>
          </div>

          <button
            onClick={() => void handleStart()}
            disabled={!prompt.trim() || isLoading}
            className="w-full py-2.5 bg-stone-800 text-white text-sm font-medium rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? UI_TEXT.startScreen.startButtonLoading : UI_TEXT.startScreen.startButton}
          </button>

          {isLoading && (
            <p className="text-xs text-stone-400 text-center">
              {UI_TEXT.startScreen.generatingNote}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-stone-200" />
            <span className="text-xs text-stone-400">または</span>
            <div className="flex-1 border-t border-stone-200" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => { void handleFileChange(e) }}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isOpeningFile}
            className="w-full py-2 border border-stone-300 text-stone-600 text-sm rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isOpeningFile ? UI_TEXT.startScreen.openProjectJsonLoading : UI_TEXT.startScreen.openProjectJson}
          </button>

          {openError && (
            <p className="text-xs text-red-600 text-center">{openError}</p>
          )}
        </div>

        <p className="text-xs text-stone-400 text-center">
          {UI_TEXT.startScreen.storageNote}
        </p>
      </div>
    </div>
  )
}
