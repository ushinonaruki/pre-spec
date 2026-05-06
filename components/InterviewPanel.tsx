'use client'

import { useState } from 'react'
import type { Heading, SkipReason } from '@/types'
import { SKIP_REASON_LABELS } from '@/types'

type Props = {
  heading: Heading | null
  onAnswer: (answer: string) => void
  onSkip: (reason: SkipReason, detail?: string) => void
  onDone: () => void
  onRegenerateQuestions: () => void
}

const DUMMY_QUESTION = 'このセクションについて考えていることを入力してください'

export default function InterviewPanel({
  heading,
  onAnswer,
  onSkip,
  onDone,
  onRegenerateQuestions,
}: Props) {
  const [answer, setAnswer] = useState('')
  const [showSkip, setShowSkip] = useState(false)
  const [skipReason, setSkipReason] = useState<SkipReason>('thinking')
  const [skipDetail, setSkipDetail] = useState('')

  if (!heading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-stone-400 p-6 text-center">
        左の見出し一覧から ## 見出しを選択してください
      </div>
    )
  }

  const handleAnswer = () => {
    if (!answer.trim()) return
    onAnswer(answer.trim())
    setAnswer('')
    setShowSkip(false)
  }

  const handleSkip = () => {
    onSkip(skipReason, skipDetail.trim() || undefined)
    setShowSkip(false)
    setSkipDetail('')
    setSkipReason('thinking')
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="shrink-0">
        <p className="text-xs text-stone-400 mb-1">現在の見出し</p>
        <p className="text-sm font-semibold text-stone-800">## {heading.title}</p>
      </div>

      <div className="shrink-0 bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-2">
        <p className="text-xs text-stone-500 font-medium">質問</p>
        <p className="text-sm text-stone-800">{DUMMY_QUESTION}</p>
        <p className="text-xs text-stone-400 italic">
          ※ Stage 2 で LLM が自動生成します
        </p>
      </div>

      {!showSkip && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="回答を入力…"
            className="flex-1 min-h-[80px] resize-none border border-stone-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleAnswer}
              disabled={!answer.trim()}
              className="flex-1 py-2 bg-stone-800 text-white text-sm rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              回答して反映
            </button>
            <button
              onClick={() => setShowSkip(true)}
              className="px-3 py-2 border border-stone-300 text-stone-600 text-sm rounded hover:bg-stone-50 transition-colors"
            >
              スキップ ▾
            </button>
          </div>
        </div>
      )}

      {showSkip && (
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-xs font-medium text-stone-600">スキップ理由</p>
          <div className="space-y-1">
            {(Object.keys(SKIP_REASON_LABELS) as SkipReason[]).map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="skip-reason"
                  value={r}
                  checked={skipReason === r}
                  onChange={() => setSkipReason(r)}
                  className="accent-stone-700"
                />
                {SKIP_REASON_LABELS[r]}
              </label>
            ))}
          </div>
          <textarea
            value={skipDetail}
            onChange={(e) => setSkipDetail(e.target.value)}
            placeholder="メモ (任意)"
            className="resize-none border border-stone-300 rounded p-2 text-sm h-16 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="flex-1 py-2 bg-stone-600 text-white text-sm rounded hover:bg-stone-500 transition-colors"
            >
              スキップして記録
            </button>
            <button
              onClick={() => setShowSkip(false)}
              className="px-3 py-2 border border-stone-300 text-stone-600 text-sm rounded hover:bg-stone-50 transition-colors"
            >
              戻る
            </button>
          </div>
        </div>
      )}

      <div className="shrink-0 flex gap-2 border-t border-stone-200 pt-3">
        <button
          onClick={onRegenerateQuestions}
          className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
        >
          ↺ この見出しでもう少し考える
        </button>
        <button
          onClick={onDone}
          className="ml-auto text-xs text-green-700 hover:text-green-600 font-medium transition-colors"
        >
          この見出しを完了 →
        </button>
      </div>
    </div>
  )
}
