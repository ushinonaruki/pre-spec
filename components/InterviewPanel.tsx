'use client'

import { useEffect, useRef, useState } from 'react'
import type { ManualEdit, Question, QuestionPriority, Section, SectionMarker, SkipReason, TimelineItem } from '@/types'
import { SKIP_REASON_LABELS } from '@/types'
import { UI_TEXT } from '@/lib/uiText'

const PRIORITY_COLORS: Record<QuestionPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-stone-100 text-stone-500',
}

type SectionBlock = {
  marker: SectionMarker
  questions: Question[]
}

type TimelineSlot =
  | { type: 'block'; id: string; data: SectionBlock }
  | { type: 'manual_edit'; id: string; data: ManualEdit }

function buildTimelineSlots(timeline: TimelineItem[]): TimelineSlot[] {
  const slots: TimelineSlot[] = []
  let current: SectionBlock | null = null

  for (const item of timeline) {
    if (item.type === 'section_marker') {
      if (current) slots.push({ type: 'block', id: current.marker.id, data: current })
      current = { marker: item, questions: [] }
    } else if (item.type === 'question') {
      if (current) current.questions.push(item)
    } else if (item.type === 'manual_edit') {
      if (current) {
        slots.push({ type: 'block', id: current.marker.id, data: current })
        current = null
      }
      slots.push({ type: 'manual_edit', id: item.id, data: item })
    }
  }
  if (current) slots.push({ type: 'block', id: current.marker.id, data: current })

  return slots.reverse()
}

function ManualEditCard({ edit, sections }: { edit: ManualEdit; sections: Section[] }) {
  const affectedTitles = edit.affectedSectionIds
    .map((id) => sections.find((s) => s.id === id)?.title ?? id)
    .join(', ')

  return (
    <div className="border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 space-y-0.5">
      <p className="text-xs font-medium text-stone-600">✎ {UI_TEXT.manualEdit.label}</p>
      {edit.memo && (
        <p className="text-xs text-stone-500">
          {UI_TEXT.manualEdit.memo}: {edit.memo}
        </p>
      )}
      {affectedTitles && (
        <p className="text-xs text-stone-400">
          {UI_TEXT.manualEdit.affected}: {affectedTitles}
        </p>
      )}
      <p className="text-xs text-stone-300">
        {new Date(edit.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
      </p>
    </div>
  )
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
            {UI_TEXT.questionKind[question.kind]}
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
      <span className="text-xs text-green-700 font-medium shrink-0">{UI_TEXT.interview.statusAnswered}</span>
    ) : question.status === 'skipped' ? (
      <span className="text-xs text-stone-400 font-medium shrink-0">{UI_TEXT.interview.statusSkipped}</span>
    ) : (
      <span className="text-xs text-stone-400 font-medium shrink-0">{UI_TEXT.interview.statusOpen}</span>
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
              <p className="text-xs text-blue-600 font-medium">{UI_TEXT.interview.aiGuessLabel}</p>
              <p className="text-xs text-blue-800">{question.aiGuess.value}</p>
              <p className="text-xs text-blue-500 italic">{question.aiGuess.rationale}</p>
            </div>
          )}

          {question.status === 'answered' && (
            <p className="text-xs text-stone-600 bg-green-50 rounded p-2">{question.answer}</p>
          )}

          {question.status === 'skipped' && (
            <div className="space-y-1 pt-2">
              {question.skipReason && (
                <p className="text-xs text-stone-500">
                  {UI_TEXT.interview.skipReasonLabel}: {SKIP_REASON_LABELS[question.skipReason]}
                </p>
              )}
              {question.skipDetail && (
                <p className="text-xs text-stone-500 italic">{question.skipDetail}</p>
              )}
              {question.reflectedMarkdown && (
                <p className="text-xs font-mono text-stone-400 bg-stone-50 rounded px-2 py-1">
                  {question.reflectedMarkdown}
                </p>
              )}
            </div>
          )}

          {question.status === 'open' && (
            <>
              {!showSkip ? (
                <>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={UI_TEXT.interview.answerPlaceholder}
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
                      {isFormatting ? UI_TEXT.interview.answerButtonFormatting : UI_TEXT.interview.answerButton}
                    </button>
                    <button
                      onClick={() => setShowSkip(true)}
                      className="px-3 py-1.5 border border-stone-300 text-stone-600 text-xs rounded hover:bg-stone-50 transition-colors"
                    >
                      {UI_TEXT.interview.skipButton}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-stone-600">{UI_TEXT.interview.skipReasonLabel}</p>
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
                    placeholder={UI_TEXT.interview.skipDetailPlaceholder}
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
                      {UI_TEXT.interview.skipConfirmButton}
                    </button>
                    <button
                      onClick={() => setShowSkip(false)}
                      className="px-3 py-1.5 border border-stone-300 text-stone-600 text-xs rounded hover:bg-stone-50 transition-colors"
                    >
                      {UI_TEXT.interview.skipCancelButton}
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

  const slots = buildTimelineSlots(timeline)

  const currentIdx = sections.findIndex((s) => s.id === currentSection?.id)
  const nextSection =
    sections.length > 0
      ? sections[currentIdx === -1 || currentIdx === sections.length - 1 ? 0 : currentIdx + 1]
      : null

  const disabledTitle =
    openCount > 0 ? UI_TEXT.interview.openQuestionsWarning : undefined

  if (!currentSection) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-stone-400 p-6 text-center">
        {UI_TEXT.interview.sectionNotFound}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Header */}
      <div className="shrink-0 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-400 mb-0.5">{UI_TEXT.interview.currentSectionLabel}</p>
            <p className="text-sm font-semibold text-stone-800 truncate">## {currentSection.title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span title={disabledTitle}>
              <button
                onClick={onNext}
                disabled={openCount > 0}
                className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {UI_TEXT.interview.nextButton}
              </button>
            </span>
            <span title={disabledTitle}>
              <button
                onClick={onAddQuestions}
                disabled={isGenerating || openCount > 0}
                className="text-xs text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? UI_TEXT.interview.addQuestionsLoading : UI_TEXT.interview.addQuestionsButton}
              </button>
            </span>
          </div>
        </div>

        {nextSection && (
          <p className="text-xs text-stone-400">{UI_TEXT.interview.nextSectionHint(nextSection.title)}</p>
        )}

        {openCount > 0 && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            {UI_TEXT.interview.openQuestionsWarning}
          </div>
        )}

        {formattingFallback && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            {UI_TEXT.interview.formattingFallbackWarning}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4" ref={scrollRef}>
        {slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400">
            <p className="text-sm">{UI_TEXT.interview.timelineEmpty}</p>
            <p className="text-xs">{UI_TEXT.interview.timelineEmptyHint}</p>
          </div>
        ) : (
          slots.map((slot) =>
            slot.type === 'manual_edit' ? (
              <ManualEditCard key={slot.id} edit={slot.data} sections={sections} />
            ) : (
              <div key={slot.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-stone-200" />
                  <span className="text-xs text-stone-400 shrink-0 px-1">{slot.data.marker.sectionTitle}</span>
                  <div className="flex-1 border-t border-stone-200" />
                </div>
                {slot.data.questions.slice().reverse().map((q: Question) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    isFormatting={formattingQuestionId === q.id}
                    onAnswer={(ans) => onAnswerQuestion(q.id, ans)}
                    onSkip={(reason, detail) => onSkipQuestion(q.id, reason, detail)}
                  />
                ))}
              </div>
            ),
          )
        )}
      </div>
    </div>
  )
}
