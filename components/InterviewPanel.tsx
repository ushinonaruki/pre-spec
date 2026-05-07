'use client'

import { useEffect, useRef, useState } from 'react'
import type { Question, QuestionKind, QuestionPriority, Section, SectionMarker, SkipReason, TimelineItem } from '@/types'
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

type SectionBlock = {
  marker: SectionMarker
  questions: Question[]
}

function groupIntoBlocks(timeline: TimelineItem[]): SectionBlock[] {
  const blocks: SectionBlock[] = []
  let current: SectionBlock | null = null

  for (const item of timeline) {
    if (item.type === 'section_marker') {
      if (current) blocks.push(current)
      current = { marker: item, questions: [] }
    } else if (item.type === 'question' && current) {
      current.questions.push(item)
    }
  }
  if (current) blocks.push(current)

  return blocks.reverse()
}

type Props = {
  currentSection: Section | null
  sections: Section[]
  timeline: TimelineItem[]
  isGenerating: boolean
  formattingQuestionId: string | null
  formattingFallback: boolean
  onAddQuestions: () => void
  onAnswerQuestion: (questionId: string, answer: string) => void
  onSkipQuestion: (questionId: string, reason: SkipReason, detail?: string) => void
  onNext: () => void
}

function QuestionCard({
  question,
  isFormatting,
  onAnswer,
  onSkip,
}: {
  question: Question
  isFormatting: boolean
  onAnswer: (answer: string) => void
  onSkip: (reason: SkipReason, detail?: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const [showSkip, setShowSkip] = useState(false)
  const [skipReason, setSkipReason] = useState<SkipReason>('thinking')
  const [skipDetail, setSkipDetail] = useState('')

  const kindPriorityLabels =
    question.kind || question.priority ? (
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
    ) : null

  const statusIcon =
    question.status === 'answered' ? (
      <span className="text-xs text-green-700 font-medium shrink-0">✓</span>
    ) : question.status === 'skipped' ? (
      <span className="text-xs text-stone-400 font-medium shrink-0">—</span>
    ) : (
      <span className="text-xs text-stone-400 font-medium shrink-0">○</span>
    )

  const headerBg =
    question.status === 'answered'
      ? 'border-green-200 bg-green-50'
      : question.status === 'skipped'
        ? 'border-stone-200 bg-stone-50 opacity-60'
        : 'border-stone-200 bg-white'

  return (
    <div className={`border rounded-lg overflow-hidden ${headerBg}`}>
      {/* Collapsed header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full text-left p-3 space-y-1"
      >
        <div className="flex items-start gap-2">
          {statusIcon}
          <div className="flex-1 min-w-0 space-y-1">
            {kindPriorityLabels}
            <p className={`text-sm ${question.status === 'skipped' ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
              {question.text}
            </p>
          </div>
          <span className="text-xs text-stone-400 shrink-0 mt-0.5">{isOpen ? '▲' : '▼'}</span>
        </div>
        {question.status === 'answered' && question.answer && !isOpen && (
          <p className="text-xs text-stone-500 ml-4 truncate">{question.answer}</p>
        )}
      </button>

      {/* Expanded body */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-2 border-t border-stone-100">
          {question.reason && (
            <p className="text-xs text-stone-400 italic pt-2">{question.reason}</p>
          )}
          {question.aiGuess && (
            <div className="bg-blue-50 border border-blue-100 rounded p-2 space-y-0.5">
              <p className="text-xs text-blue-600 font-medium">AI推定</p>
              <p className="text-xs text-blue-800">{question.aiGuess.value}</p>
              <p className="text-xs text-blue-500 italic">{question.aiGuess.rationale}</p>
            </div>
          )}

          {question.status === 'answered' && (
            <p className="text-xs text-stone-600 bg-green-50 rounded p-2">{question.answer}</p>
          )}

          {question.status === 'open' && (
            <>
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
                      disabled={!answer.trim() || isFormatting}
                      className="flex-1 py-1.5 bg-stone-800 text-white text-xs rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isFormatting ? '整形中…' : '回答して反映'}
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
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function InterviewPanel({
  currentSection,
  sections,
  timeline,
  isGenerating,
  formattingQuestionId,
  formattingFallback,
  onAddQuestions,
  onAnswerQuestion,
  onSkipQuestion,
  onNext,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevIsGenerating = useRef(false)

  useEffect(() => {
    if (prevIsGenerating.current && !isGenerating && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    prevIsGenerating.current = isGenerating
  }, [isGenerating])

  const openCount = timeline.filter(
    (item): item is Question => item.type === 'question' && item.status === 'open',
  ).length

  const blocks = groupIntoBlocks(timeline)

  const currentIdx = sections.findIndex((s) => s.id === currentSection?.id)
  const nextSection =
    sections.length > 0
      ? sections[currentIdx === -1 || currentIdx === sections.length - 1 ? 0 : currentIdx + 1]
      : null

  const disabledTitle =
    openCount > 0
      ? '未回答の質問があります。先に回答するか、スキップして Open Questions に送ってください。'
      : undefined

  if (!currentSection) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-stone-400 p-6 text-center">
        セクションが見つかりません
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Header */}
      <div className="shrink-0 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-400 mb-0.5">現在セクション</p>
            <p className="text-sm font-semibold text-stone-800 truncate">## {currentSection.title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span title={disabledTitle}>
              <button
                onClick={onNext}
                disabled={openCount > 0}
                className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                次へ →
              </button>
            </span>
            <span title={disabledTitle}>
              <button
                onClick={onAddQuestions}
                disabled={isGenerating || openCount > 0}
                className="text-xs text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? '生成中…' : '+ 質問を追加'}
              </button>
            </span>
          </div>
        </div>

        {nextSection && (
          <p className="text-xs text-stone-400">次: {nextSection.title}</p>
        )}

        {openCount > 0 && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            未回答の質問があります。先に回答するか、スキップして Open Questions に送ってください。
          </div>
        )}

        {formattingFallback && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            整形に失敗しました。回答をそのまま反映しました。
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4" ref={scrollRef}>
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400">
            <p className="text-sm">質問タイムラインがまだ生成されていません</p>
            <p className="text-xs">「+ 質問を追加」で生成してください</p>
          </div>
        ) : (
          blocks.map((block) => (
            <div key={block.marker.id} className="space-y-2">
              {/* Section marker divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-stone-200" />
                <span className="text-xs text-stone-400 shrink-0 px-1">{block.marker.sectionTitle}</span>
                <div className="flex-1 border-t border-stone-200" />
              </div>
              {/* Questions newest-first within block */}
              {block.questions.slice().reverse().map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  isFormatting={formattingQuestionId === q.id}
                  onAnswer={(ans) => onAnswerQuestion(q.id, ans)}
                  onSkip={(reason, detail) => onSkipQuestion(q.id, reason, detail)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
