'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import type { ManualEdit, Question, Section, TimelineItem } from '@/types'
import { CUSTOM_REASON } from '@/lib/skipReasons'
import type { EffectiveSkipReason } from '@/lib/skipReasons'
import { QUESTION_KIND_LABELS, QUESTION_PRIORITY_COLORS, QUESTION_PRIORITY_LABELS } from '@/lib/config/questionTaxonomy'
import { UI_TEXT } from '@/lib/text/uiText'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'

function resolveSkipLabel(skipReason: string | undefined, skipReasons: EffectiveSkipReason[]): string {
  if (!skipReason) return ''
  return skipReasons.find((r) => r.reason === skipReason)?.label ?? skipReason
}

function QuestionErrorBanner({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
      <span className="flex-1">{text}</span>
      <button onClick={onDismiss} className="shrink-0 text-red-400 hover:text-red-600 transition-colors cursor-pointer">✕</button>
    </div>
  )
}

function QuestionStatusBadge({ status, openColor = 'text-stone-400' }: { status: Question['status']; openColor?: string }) {
  if (status === 'answered') return <span className="text-xs text-green-700 font-medium shrink-0">{UI_TEXT.interview.statusAnswered}</span>
  if (status === 'skipped') return <span className="text-xs text-stone-400 font-medium shrink-0">{UI_TEXT.interview.statusSkipped}</span>
  if (status === 'failed') return <span className="text-xs text-red-600 font-medium shrink-0">{UI_TEXT.interview.statusFailed}</span>
  return <span className={`text-xs font-medium shrink-0 ${openColor}`}>{UI_TEXT.interview.statusOpen}</span>
}

function QuestionKindPriorityBadges({ priority, kinds }: { priority?: Question['priority']; kinds?: Question['kinds'] }) {
  if (!priority && !kinds?.length) return null
  return (
    <div className="flex gap-1 flex-wrap">
      {priority && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${QUESTION_PRIORITY_COLORS[priority]}`}>
          {QUESTION_PRIORITY_LABELS[priority]}
        </span>
      )}
      {kinds?.map((k) => (
        <span key={k} className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
          {QUESTION_KIND_LABELS[k]}
        </span>
      ))}
    </div>
  )
}

function QuestionSkippedContent({
  skipReason,
  skipCustomText,
  reflectedMarkdown,
  skipReasons,
}: {
  skipReason?: string
  skipCustomText?: string
  reflectedMarkdown?: string
  skipReasons: EffectiveSkipReason[]
}) {
  return (
    <div className="space-y-1 pt-2">
      {skipReason && (
        <p className="text-xs text-stone-500">
          {UI_TEXT.interview.skipReasonLabel}: {resolveSkipLabel(skipReason, skipReasons)}
        </p>
      )}
      {skipCustomText && (
        <p className="text-xs text-stone-500 italic">{skipCustomText}</p>
      )}
      {reflectedMarkdown && (
        <p className="text-xs font-mono text-stone-400 bg-stone-50 rounded px-2 py-1">
          {reflectedMarkdown}
        </p>
      )}
    </div>
  )
}

function QuestionFailedContent({
  attemptedAnswer,
  attemptedSkip,
  skipReasons,
}: {
  attemptedAnswer?: string
  attemptedSkip?: { reason: string; customText?: string }
  skipReasons: EffectiveSkipReason[]
}) {
  return (
    <div className="space-y-1 pt-2 border-t border-red-100">
      <p className="text-xs font-medium text-red-600">{UI_TEXT.interview.failedBadge}</p>
      <p className="text-xs text-red-500">{UI_TEXT.interview.failedReason}</p>
      {attemptedAnswer && (
        <p className="text-xs text-stone-600 bg-red-50 rounded p-2">{attemptedAnswer}</p>
      )}
      {attemptedSkip && (
        <p className="text-xs text-stone-500 italic">
          {UI_TEXT.interview.skipReasonLabel}: {resolveSkipLabel(attemptedSkip.reason, skipReasons)}
          {attemptedSkip.customText ? ` — ${attemptedSkip.customText}` : ''}
        </p>
      )}
    </div>
  )
}

function ManualEditCard({ edit }: { edit: ManualEdit }) {
  return (
    <div className="border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 space-y-0.5">
      <p className="text-xs font-medium text-stone-600">✎ {UI_TEXT.manualEdit.label}</p>
      <p className="text-xs text-stone-300">
        {new Date(edit.createdAt).toLocaleString(APP_LOCALE, { timeZone: APP_TIMEZONE })}
      </p>
    </div>
  )
}

function SkipPanel({
  questionId,
  skipReasons,
  onSkip,
  onCancel,
}: {
  questionId: string
  skipReasons: EffectiveSkipReason[]
  onSkip: (reason: string, customText?: string) => void
  onCancel: () => void
}) {
  const defaultId = skipReasons[0]?.reason ?? CUSTOM_REASON
  const [selectedId, setSelectedId] = useState(defaultId)
  const [customText, setCustomText] = useState('')

  const isCustom = selectedId === CUSTOM_REASON
  const canConfirm = !isCustom || customText.trim().length > 0

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-stone-600">{UI_TEXT.interview.skipReasonLabel}</p>
      <div className="space-y-1">
        {skipReasons.map((r) => (
          <label key={r.reason} className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="radio"
              name={`skip-${questionId}`}
              value={r.reason}
              checked={selectedId === r.reason}
              onChange={() => setSelectedId(r.reason)}
              className="accent-stone-700"
            />
            {r.label}
          </label>
        ))}
      </div>
      {isCustom && (
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder={UI_TEXT.interview.skipCustomPlaceholder}
          className="w-full resize-none border border-stone-300 rounded p-2 text-xs h-12 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            onSkip(selectedId, isCustom ? customText.trim() || undefined : undefined)
          }}
          disabled={!canConfirm}
          className="flex-1 py-1.5 bg-stone-600 text-white text-xs rounded hover:bg-stone-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {UI_TEXT.interview.skipConfirmButton}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border border-stone-300 text-stone-600 text-xs rounded hover:bg-stone-50 transition-colors cursor-pointer"
        >
          {UI_TEXT.interview.skipCancelButton}
        </button>
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  skipReasons,
  isFormatting,
  isSkipping,
  isRetrying,
  hasAnswerLLMError,
  hasSkipLLMError,
  hasRetryLLMError,
  onDismissAnswerLLMError,
  onDismissSkipLLMError,
  onDismissRetryLLMError,
  onAnswer,
  onSkip,
  onRetry,
}: {
  question: Question
  skipReasons: EffectiveSkipReason[]
  isFormatting: boolean
  isSkipping: boolean
  isRetrying: boolean
  hasAnswerLLMError: boolean
  hasSkipLLMError: boolean
  hasRetryLLMError: boolean
  onDismissAnswerLLMError: () => void
  onDismissSkipLLMError: () => void
  onDismissRetryLLMError: () => void
  onAnswer: (answer: string) => Promise<boolean>
  onSkip: (reason: string, customText?: string) => void
  onRetry: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const [showSkip, setShowSkip] = useState(false)

  const isInitial = question.questionType === 'initial_confirmation'

  const headerBg =
    question.status === 'answered'
      ? 'border-green-200 bg-green-50'
      : question.status === 'skipped'
        ? 'border-stone-200 bg-stone-50 opacity-60'
        : question.status === 'failed'
          ? 'border-red-200 bg-red-50'
          : isInitial
            ? 'border-blue-200 bg-blue-50'
            : 'border-stone-200 bg-white'

  const openBorderColor = isInitial ? 'border-blue-100' : 'border-stone-100'

  return (
    <div className={`border rounded-lg overflow-hidden ${headerBg}`}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full text-left p-3 space-y-1 cursor-pointer"
      >
        <div className="flex items-start gap-2">
          <QuestionStatusBadge status={question.status} openColor={isInitial ? 'text-blue-500' : 'text-stone-400'} />
          <div className="flex-1 min-w-0 space-y-1">
            <QuestionKindPriorityBadges priority={question.priority} kinds={question.kinds} />
            <p className="text-xs text-stone-400">
              {UI_TEXT.interview.targetSectionLabel}: {question.sectionTitle}
            </p>
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

      {isOpen && (
        <div className={`px-3 pb-3 space-y-2 border-t ${openBorderColor}`}>

          {question.proposedMarkdown && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-stone-500">{UI_TEXT.initialConfirmation.proposedMarkdownLabel}</p>
              <pre className="text-xs font-mono bg-stone-50 border border-stone-200 rounded px-2 py-1.5 whitespace-pre-wrap text-stone-700">
                {question.proposedMarkdown}
              </pre>
            </div>
          )}

          {question.aiGuess && (
            <div className="bg-blue-50 border border-blue-100 rounded p-2 space-y-0.5">
              <p className="text-xs text-blue-600 font-medium">{UI_TEXT.interview.aiGuessLabel}</p>
              <p className="text-xs text-blue-800">{question.aiGuess.value}</p>
              <p className="text-xs text-blue-500 italic">{question.aiGuess.rationale}</p>
            </div>
          )}

          {question.status === 'answered' && (
            <>
              <p className="text-xs text-stone-600 bg-green-50 rounded p-2">{question.answer}</p>
              {question.reflectedMarkdown && (
                <div className="text-xs bg-green-50 rounded p-2">
                  <p className="font-medium text-green-700 mb-1">{UI_TEXT.interview.answeredApplyNote}</p>
                  <pre className="font-mono whitespace-pre-wrap text-stone-600">{question.reflectedMarkdown}</pre>
                </div>
              )}
            </>
          )}

          {question.status === 'skipped' && (
            <QuestionSkippedContent
              skipReason={question.skipReason}
              skipCustomText={question.skipCustomText}
              reflectedMarkdown={question.reflectedMarkdown}
              skipReasons={skipReasons}
            />
          )}

          {question.status === 'failed' && (
            <QuestionFailedContent
              attemptedAnswer={question.attemptedAnswer}
              attemptedSkip={question.attemptedSkip}
              skipReasons={skipReasons}
            />
          )}

          {question.status === 'open' && (
            <>
              {hasAnswerLLMError && (
                <QuestionErrorBanner
                  text={isInitial ? UI_TEXT.initialConfirmation.answerLLMError : UI_TEXT.interview.answerLLMError}
                  onDismiss={onDismissAnswerLLMError}
                />
              )}
              {hasSkipLLMError && (
                <QuestionErrorBanner text={UI_TEXT.interview.skipLLMError} onDismiss={onDismissSkipLLMError} />
              )}
              {hasRetryLLMError && (
                <QuestionErrorBanner text={UI_TEXT.interview.retryLLMError} onDismiss={onDismissRetryLLMError} />
              )}
              {!showSkip ? (
                <>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={isInitial ? UI_TEXT.initialConfirmation.answerPlaceholder : UI_TEXT.interview.answerPlaceholder}
                    disabled={isFormatting || isSkipping || isRetrying}
                    className="w-full resize-none border border-stone-300 rounded p-2 text-sm h-16 focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!answer.trim()) return
                        void onAnswer(answer.trim()).then((ok) => { if (ok) setAnswer('') })
                      }}
                      disabled={!answer.trim() || isFormatting || isSkipping || isRetrying}
                      className="flex-1 py-1.5 bg-stone-800 text-white text-xs rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isFormatting ? UI_TEXT.interview.answerButtonFormatting : UI_TEXT.interview.answerButton}
                    </button>
                    <button
                      onClick={() => setShowSkip(true)}
                      disabled={isFormatting || isSkipping || isRetrying}
                      className="px-3 py-1.5 border border-stone-300 text-stone-600 text-xs rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {UI_TEXT.interview.skipButton}
                    </button>
                    <button
                      onClick={onRetry}
                      disabled={isFormatting || isSkipping || isRetrying}
                      title={UI_TEXT.interview.retryButtonTitle}
                      className="px-2.5 py-1.5 border border-stone-300 text-stone-500 text-xs rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isRetrying ? '…' : UI_TEXT.interview.retryButton}
                    </button>
                  </div>
                </>
              ) : (
                <SkipPanel
                  questionId={question.id}
                  skipReasons={skipReasons}
                  onSkip={(reason, customText) => {
                    onSkip(reason, customText)
                    setShowSkip(false)
                  }}
                  onCancel={() => setShowSkip(false)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

type Props = {
  currentSection: Section | null
  timeline: TimelineItem[]
  skipReasons: EffectiveSkipReason[]
  isGenerating: boolean
  addQuestionError: boolean
  onDismissAddQuestionError: () => void
  formattingQuestionId: string | null
  skippingQuestionId: string | null
  retryingQuestionId: string | null
  retryLLMErrorQuestionId: string | null
  onDismissRetryLLMError: () => void
  onAddQuestions: () => void
  onAnswerQuestion: (questionId: string, answer: string) => Promise<boolean>
  onSkipQuestion: (questionId: string, reason: string, customText?: string) => void
  onRetryQuestion: (questionId: string) => void
  answerLLMErrorQuestionId: string | null
  skipLLMErrorQuestionId: string | null
  onDismissAnswerLLMError: () => void
  onDismissSkipLLMError: () => void
  onNext: () => void
  disabled?: boolean
  nextDisabled?: boolean
  addQuestionsDisabled?: boolean
}

export default function InterviewPanel({
  currentSection,
  timeline,
  skipReasons,
  isGenerating,
  addQuestionError,
  onDismissAddQuestionError,
  formattingQuestionId,
  skippingQuestionId,
  retryingQuestionId,
  retryLLMErrorQuestionId,
  onDismissRetryLLMError,
  onAddQuestions,
  onAnswerQuestion,
  onSkipQuestion,
  onRetryQuestion,
  answerLLMErrorQuestionId,
  skipLLMErrorQuestionId,
  onDismissAnswerLLMError,
  onDismissSkipLLMError,
  onNext,
  disabled = false,
  nextDisabled,
  addQuestionsDisabled,
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

  const reversedTimeline = [...timeline].reverse()

  const renderQuestionCard = (q: Question) => (
    <QuestionCard
      question={q}
      skipReasons={skipReasons}
      isFormatting={formattingQuestionId === q.id}
      isSkipping={skippingQuestionId === q.id}
      isRetrying={retryingQuestionId === q.id}
      hasAnswerLLMError={answerLLMErrorQuestionId === q.id}
      hasSkipLLMError={skipLLMErrorQuestionId === q.id}
      hasRetryLLMError={retryLLMErrorQuestionId === q.id}
      onDismissAnswerLLMError={onDismissAnswerLLMError}
      onDismissSkipLLMError={onDismissSkipLLMError}
      onDismissRetryLLMError={onDismissRetryLLMError}
      onAnswer={(ans) => onAnswerQuestion(q.id, ans)}
      onSkip={(reason, customText) => onSkipQuestion(q.id, reason, customText)}
      onRetry={() => onRetryQuestion(q.id)}
    />
  )

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 border-b border-stone-200 bg-stone-50 shrink-0 h-10">
        <span className="text-xs font-medium text-stone-500 shrink-0">Timeline</span>
        <span className="text-xs font-bold text-stone-800 mr-auto truncate">## {currentSection.title}</span>
        <span title={disabledTitle}>
          <button
            onClick={onNext}
            disabled={nextDisabled ?? openCount > 0}
            className="text-xs px-3 py-1 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {UI_TEXT.interview.nextButton}
          </button>
        </span>
        <span title={disabledTitle}>
          <button
            onClick={onAddQuestions}
            disabled={disabled || isGenerating || (addQuestionsDisabled ?? openCount > 0)}
            className="text-xs text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGenerating ? UI_TEXT.interview.addQuestionsLoading : UI_TEXT.interview.addQuestionsButton}
          </button>
        </span>
      </div>
      {addQuestionError && (
        <QuestionErrorBanner text={UI_TEXT.interview.generateQuestionsError} onDismiss={onDismissAddQuestionError} />
      )}

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-full gap-3 text-stone-400">
            <p className="text-sm">{UI_TEXT.interview.timelineEmpty}</p>
            <p className="text-xs">{UI_TEXT.interview.timelineEmptyHint}</p>
          </div>
        ) : (
          reversedTimeline.map((item) => {
            if (item.type === 'manual_edit') {
              return <ManualEditCard key={item.id} edit={item} />
            }
            if (item.type === 'phase_marker') {
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex-1 border-t border-blue-200" />
                  <span className="text-xs text-blue-400 shrink-0 px-1 font-medium">
                    {item.label}
                  </span>
                  <div className="flex-1 border-t border-blue-200" />
                </div>
              )
            }
            if (item.type === 'section_marker') {
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex-1 border-t border-stone-200" />
                  <span className="text-xs text-stone-400 shrink-0 px-1">{item.sectionTitle}</span>
                  <div className="flex-1 border-t border-stone-200" />
                </div>
              )
            }
            return <Fragment key={item.id}>{renderQuestionCard(item)}</Fragment>
          })
        )}
      </div>
    </div>
  )
}
