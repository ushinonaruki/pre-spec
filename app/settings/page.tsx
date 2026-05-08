'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UI_TEXT } from '@/lib/uiText'

export default function SettingsPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (!confirm(UI_TEXT.settings.resetConfirm)) return
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-lg p-6 space-y-6">
        <h1 className="text-xl font-semibold text-stone-800">{UI_TEXT.settings.title}</h1>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-700">
            {UI_TEXT.settings.apiKeyLabel}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full border border-stone-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <p className="text-xs text-stone-500">{UI_TEXT.settings.apiKeyNote}</p>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-stone-800 text-white text-sm rounded hover:bg-stone-700 transition-colors"
          >
            {saved ? UI_TEXT.settings.saveButtonSaved : UI_TEXT.settings.saveButton}
          </button>
        </div>

        <hr className="border-stone-200" />

        <div className="space-y-2">
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 border border-red-300 text-red-600 text-sm rounded hover:bg-red-50 transition-colors"
          >
            {UI_TEXT.settings.resetButton}
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 border border-stone-300 text-stone-600 text-sm rounded hover:bg-stone-50 transition-colors"
          >
            {UI_TEXT.settings.backButton}
          </button>
        </div>
      </div>
    </div>
  )
}
