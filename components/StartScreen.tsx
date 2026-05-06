'use client'

import { useState } from 'react'

type Props = {
  onStart: (prompt: string) => void
}

export default function StartScreen({ onStart }: Props) {
  const [prompt, setPrompt] = useState('')

  const handleStart = () => {
    if (!prompt.trim()) return
    onStart(prompt.trim())
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">pre-spec</h1>
          <p className="text-sm text-stone-500 mt-1">LDD Interview Workbench</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700">
              どんな機能を作りますか?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStart()
              }}
              placeholder="例: ユーザーが音声メモを録音して、AIが文字起こしと要約を行う機能"
              rows={4}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
            <p className="text-xs text-stone-400">⌘Enter でも開始できます</p>
          </div>

          <button
            onClick={handleStart}
            disabled={!prompt.trim()}
            className="w-full py-2.5 bg-stone-800 text-white text-sm font-medium rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            pre-spec を始める
          </button>
        </div>

        <p className="text-xs text-stone-400 text-center">
          状態は localStorage に保存されます
        </p>
      </div>
    </div>
  )
}
