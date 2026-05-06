'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadState, resetProject, saveApiKey } from '@/lib/storage'

export default function SettingsPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState(() => loadState().apiKey ?? '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveApiKey(apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (!confirm('プロジェクトをリセットしますか？ spec.md・集約ログ・参照メモがすべて消えます。')) return
    resetProject()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-lg p-6 space-y-6">
        <h1 className="text-xl font-semibold text-stone-800">設定</h1>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-700">
            Anthropic API キー
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full border border-stone-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <p className="text-xs text-stone-500">Stage 2 (LLM統合) で使用します。今は未設定でも動作します。</p>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-stone-800 text-white text-sm rounded hover:bg-stone-700 transition-colors"
          >
            {saved ? '✓ 保存しました' : '保存'}
          </button>
        </div>

        <hr className="border-stone-200" />

        <div className="space-y-2">
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 border border-red-300 text-red-600 text-sm rounded hover:bg-red-50 transition-colors"
          >
            プロジェクトをリセット
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 border border-stone-300 text-stone-600 text-sm rounded hover:bg-stone-50 transition-colors"
          >
            ワークベンチに戻る
          </button>
        </div>
      </div>
    </div>
  )
}
