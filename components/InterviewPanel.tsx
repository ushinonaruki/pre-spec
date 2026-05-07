'use client'

import { useState } from 'react'
import type { Heading, Question, QuestionKind, QuestionPriority, QuestionTimeline, SkipReason } from '@/types'
import { SKIP_REASON_LABELS } from '@/types'

const KIND_LABELS: Record<QuestionKind, string> = {
  decision: '意思決定',
  constraint: '制約',
  risk: 'リスク',
  scope: 'スコープ',
  data: 'データ',
  flow: 'フロー',
  assumption: '前提',
}

const PRIORITY_COLORS: Record<QuestionPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-stone-100 text-stone-500',
}

type Props = {
  heading: Heading | null
  timeline: QuestionTimeline | null
  isGenerating: boolean
  onGenerateTimeline: () => void
  onAnswerQuestion: (questionId: string, answer: string) => void
  onSkipQuestion: (questionId: string, reason: SkipReason, detail?: string) => void
  onDone: () => void
}

function QuestionCard({
  question,
  onAnswer,
  onSkip,
}: {
  question: Question
  onAnswer: (answer: string) => void
  onSkip: (reason: SkipReason, detail?: string) => void
}) {
  const [answer, setAnswer] = useState('')
  const [showSkip, setShowSkip] = useState(false)
  const [skipReason, setSkipReason] = useState<SkipReason>('thinking')
  const [skipDetail, setSkipDetail] = useState('')

  const kindPriorityLabels = (
    <div className="flex gap-1 flex-wrap">
      {question.kind && (
        <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
          {KIND_LABELS[question.kind]}
        </span>
      )}
      {question.priority && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${PRIORITY_COLORS[question.priority]}`}>
          {question.priority}
        </span>
      )}
    </div>
  )

  if (question.status === 'answered') {
    return (
      <div className="border border-green-200 rounded-lg p-3 bg-green-50 space-y-1">
        <div className="flex items-start gap-2">
          <span className="text-xs text-green-700 font-medium shrink-0 mt-0.5">✓ 回答済</span>
          <div className="space-y-1 min-w-0">
            {kindPriorityLabels}
            <p className="text-sm text-stone-700">{question.text}</p>
          </div>
        </div>
        <p className="text-xs text-stone-500 ml-6">{question.answer}</p>
      </div>
    )
  }

  if (question.status === 'skipped') {
    return (
      <div className="border border-stone-200 rounded-lg p-3 bg-stone-50 opacity-60">
        <div className="flex items-start gap-2">
          <span className="text-xs text-stone-500 font-medium shrink-0 mt-0.5">— スキップ</span>
          <div className="space-y-1 min-w-0">
            {kindPriorityLabels}
            <p className="text-sm text-stone-400 line-through">{question.text}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-stone-200 rounded-lg p-3 space-y-2">
      {kindPriorityLabels}
      <p className="text-sm text-stone-800">{question.text}</p>
      {question.reason && (
        <p className="text-xs text-stone-400 italic">{question.reason}</p>
      )}
      {question.aiGuess && (
        <div className="bg-blue-50 border border-blue-100 rounded p-2 space-y-0.5">
          <p className="text-xs text-blue-600 font-medium">AI推定</p>
          <p className="text-xs text-blue-800">{question.aiGuess.value}</p>
          <p className="text-xs text-blue-500 italic">{question.aiGuess.rationale}</p>
        </div>
      )}
      {!showSkip ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="回答を入力…"
            className="w-full resize-none border border-stone-300 rounded p-2 text-sm h-16 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!answer.trim()) return
                onAnswer(answer.trim())
                setAnswer('')
              }}
              disabled={!answer.trim()}
              className="flex-1 py-1.5 bg-stone-800 text-white text-xs rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              回答して反映
            </button>
            <button
              onClick={() => setShowSkip(true)}
              className="px-3 py-1.5 border border-stone-300 text-stone-600 text-xs rounded hover:bg-stone-50 transition-colors"
            >
              スキップ ▾
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-600">スキップ理由</p>
          <div className="space-y-1">
            {(Object.keys(SKIP_REASON_LABELS) as SkipReason[]).map((r) => (
              <label key={r} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name={`skip-${question.id}`}
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
            className="w-full resize-none border border-stone-300 rounded p-2 text-xs h-12 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSkip(skipReason, skipDetail.trim() || undefined)
                setShowSkip(false)
                setSkipDetail('')
                setSkipReason('thinking')
              }}
              className="flex-1 py-1.5 bg-stone-600 text-white text-xs rounded hover:bg-stone-500 transition-colors"
            >
              スキップして記録
            </button>
            <button
              onClick={() => setShowSkip(false)}
              className="px-3 py-1.5 border border-stone-300 text-stone-600 text-xs rounded hover:bg-stone-50 transition-colors"
            >
              戻る
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InterviewPanel({
  heading,
  timeline,
  isGenerating,
  onGenerateTimeline,
  onAnswerQuestion,
  onSkipQuestion,
  onDone,
}: Props) {
  if (!heading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-stone-400 p-6 text-center">
        左の見出し一覧から ## 見出しを選択してください
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="shrink-0">
        <p className="text-xs text-stone-400 mb-1">現在の見出し</p>
        <p className="text-sm font-semibold text-stone-800">## {heading.title}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {timeline ? (
          timeline.questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onAnswer={(answer) => onAnswerQuestion(q.id, answer)}
              onSkip={(reason, detail) => onSkipQuestion(q.id, reason, detail)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400">
            <p className="text-sm">質問タイムラインがまだ生成されていません</p>
            <p className="text-xs">下のボタンで生成してください</p>
          </div>
        )}
      </div>

      <div className="shrink-0 flex gap-2 border-t border-stone-200 pt-3">
        <button
          onClick={onGenerateTimeline}
          disabled={isGenerating}
          className="text-xs text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating ? '生成中…' : timeline ? '↺ 質問を再生成' : '+ 質問タイムラインを生成'}
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
