'use client'

import { useState } from 'react'
import { UI_TEXT } from '@/lib/uiText'

type Props = {
  onStart: (prompt: string) => Promise<void>
}

export default function StartScreen({ onStart }: Props) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleStart = async () => {
    if (!prompt.trim() || isLoading) return
    setIsLoading(true)
    try {
      await onStart(prompt.trim())
    } finally {
      setIsLoading(false)
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

        <p className="text-xs text-stone-400 text-center">
          {UI_TEXT.startScreen.storageNote}
        </p>
      </div>
    </div>
  )
}
