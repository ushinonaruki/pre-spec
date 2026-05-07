'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AnswerFormatResult, Heading, Project, QuestionKind, QuestionPriority, QuestionTimeline, SkipReason } from '@/types'
import { loadState, saveProject } from '@/lib/storage'
import { extractOpenQuestions } from '@/lib/openQuestions'
import { createProject, createProjectWithSpec } from '@/lib/ldd/project'
import { updateProjectSpec, selectHeading, completeCurrentHeading, uncompleteHeading } from '@/lib/ldd/headings'
import { applyAnswer, applyFormattedAnswer, applySkip, DUMMY_QUESTION } from '@/lib/ldd/specPatch'
import { setTimeline, answerQuestion, skipQuestion } from '@/lib/ldd/timelines'
import { callLLM } from '@/lib/llm/client'
import { buildAnswerFormatPrompt, buildInitialSpecPrompt, buildQuestionTimelinePrompt } from '@/lib/llm/prompts'
import { extractJSON } from '@/lib/llm/extractJSON'
import StartScreen from '@/components/StartScreen'
import SpecEditor from '@/components/SpecEditor'
import HeadingNav from '@/components/HeadingNav'
import InterviewPanel from '@/components/InterviewPanel'
import BottomTabs from '@/components/BottomTabs'

type BottomTab = 'log' | 'memo' | 'openq'

type RawQuestion = {
  id: string
  text: string
  reason?: string
  kind?: string
  priority?: string
  aiGuess?: { value: string; rationale: string }
  options?: string[]
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function getQuestionText(project: Project, questionId: string): string {
  const timeline = project.questionTimelines[project.currentHeadingId ?? '']
  return timeline?.questions.find((q) => q.id === questionId)?.text ?? DUMMY_QUESTION
}

export default function Home() {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(() => loadState().project)
  const [specMode, setSpecMode] = useState<'edit' | 'preview'>('edit')
  const [bottomTab, setBottomTab] = useState<BottomTab>('log')
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false)
  const [formattingQuestionId, setFormattingQuestionId] = useState<string | null>(null)
  const [formattingFallback, setFormattingFallback] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleProjectSave = useCallback((p: Project) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveProject(p), 400)
  }, [])

  const updateProject = useCallback(
    (updater: (prev: Project) => Project) => {
      setProject((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        scheduleProjectSave(next)
        return next
      })
    },
    [scheduleProjectSave],
  )

  const handleStart = async (prompt: string) => {
    try {
      const specText = await callLLM(buildInitialSpecPrompt(prompt))
      const p = createProjectWithSpec(prompt, specText)
      saveProject(p)
      setProject(p)
    } catch {
      const p = createProject(prompt)
      saveProject(p)
      setProject(p)
    }
  }

  const handleSpecChange = (value: string) => {
    updateProject((prev) => updateProjectSpec(prev, value))
  }

  const handleSelectHeading = (id: string) => {
    updateProject((prev) => selectHeading(prev, id))
  }

  const handleGenerateTimeline = useCallback(async () => {
    if (!project || !project.currentHeadingId || isGeneratingTimeline) return
    const heading = project.headings.find((h) => h.id === project.currentHeadingId)
    if (!heading) return
    const headingId = project.currentHeadingId
    const existingTimeline = project.questionTimelines[headingId]
    const existingQuestions = existingTimeline?.questions.map((q) => q.text) ?? []

    setIsGeneratingTimeline(true)
    try {
      const text = await callLLM(
        buildQuestionTimelinePrompt({
          headingTitle: heading.title,
          spec: project.spec,
          memo: project.memo,
          existingQuestions,
          recentAggregationLog: project.log.slice(-1500),
        }),
      )
      const raw = extractJSON<{ questions: RawQuestion[] }>(text)
      if (!raw?.questions?.length) throw new Error('Invalid LLM response')

      const now = new Date().toISOString()
      const timeline: QuestionTimeline = {
        headingId,
        generatedAt: now,
        questions: raw.questions.map((q) => ({
          id: crypto.randomUUID(),
          headingId,
          text: q.text,
          reason: q.reason,
          kind: q.kind as QuestionKind | undefined,
          priority: q.priority as QuestionPriority | undefined,
          aiGuess: q.aiGuess,
          options: q.options,
          status: 'open' as const,
          createdAt: now,
        })),
      }
      updateProject((prev) => setTimeline(prev, timeline))
    } catch {
      alert('質問タイムラインの生成に失敗しました。APIキーを確認してください。')
    } finally {
      setIsGeneratingTimeline(false)
    }
  }, [project, isGeneratingTimeline, updateProject])

  const handleAnswerQuestion = useCallback(async (questionId: string, answer: string) => {
    if (!project) return
    const heading = project.headings.find((h) => h.id === project.currentHeadingId)
    if (!heading) return
    const headingTitle = heading.title
    const headingId = project.currentHeadingId ?? ''
    const questionText = getQuestionText(project, questionId)

    setFormattingQuestionId(questionId)
    setFormattingFallback(false)
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current)

    try {
      const text = await callLLM(
        buildAnswerFormatPrompt({
          currentHeading: headingTitle,
          question: questionText,
          answer,
          currentSpec: project.spec,
          referenceMemo: project.memo,
          recentLog: project.log.slice(-1500),
        }),
      )
      const formatResult = extractJSON<AnswerFormatResult>(text)
      if (!formatResult?.specInsertionMarkdown) throw new Error('Invalid format result')

      updateProject((prev) => {
        const withSpec = applyFormattedAnswer(prev, { headingTitle, question: questionText, answer, formatResult })
        return answerQuestion(withSpec, { headingId, questionId, answer })
      })
    } catch {
      setFormattingFallback(true)
      fallbackTimer.current = setTimeout(() => setFormattingFallback(false), 5000)
      updateProject((prev) => {
        const withSpec = applyAnswer(prev, { question: questionText, answer })
        return answerQuestion(withSpec, { headingId, questionId, answer })
      })
    } finally {
      setFormattingQuestionId(null)
    }
  }, [project, updateProject])

  const handleSkipQuestion = (questionId: string, reason: SkipReason, detail?: string) => {
    updateProject((prev) => {
      const headingId = prev.currentHeadingId ?? ''
      const questionText = getQuestionText(prev, questionId)
      const withSpec = applySkip(prev, { question: questionText, reason, detail })
      return skipQuestion(withSpec, { headingId, questionId, skipReason: reason, skipDetail: detail })
    })
    setBottomTab('openq')
  }

  const handleDone = () => {
    updateProject((prev) => completeCurrentHeading(prev))
  }

  const handleUncompleteHeading = (id: string) => {
    updateProject((prev) => uncompleteHeading(prev, id))
  }

  const handleMemoChange = (v: string) => {
    updateProject((prev) => ({ ...prev, memo: v }))
  }

  const handleDownloadAll = () => {
    if (!project) return
    downloadFile('spec.md', project.spec)
    setTimeout(() => downloadFile('集約ログ.md', project.log), 100)
    setTimeout(() => downloadFile('参照メモ.md', project.memo || '# 参照メモ\n\n(空)\n'), 200)
  }

  if (!project) return <StartScreen onStart={handleStart} />

  const currentHeading: Heading | null =
    project.headings.find((h) => h.id === project.currentHeadingId) ?? null

  const currentTimeline: QuestionTimeline | null =
    project.currentHeadingId ? (project.questionTimelines[project.currentHeadingId] ?? null) : null

  const openQuestions = extractOpenQuestions(project.spec)
  const doneCount = project.headings.filter((h) => h.status === 'done').length
  const totalCount = project.headings.length

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-stone-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b border-stone-200">
        <span className="font-semibold text-stone-800 text-sm">pre-spec</span>
        <span className="text-xs text-stone-400">
          {doneCount}/{totalCount} 見出し完了
        </span>
        {project.isCompleted && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
            ✓ 全見出し完了
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleDownloadAll}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
          >
            ↓ 3ファイルダウンロード
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
          >
            ⚙ 設定
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col w-1/2 min-w-0 border-r border-stone-200">
          <div className="shrink-0 border-b border-stone-200 bg-stone-50 max-h-40 overflow-y-auto">
            <HeadingNav
              headings={project.headings}
              currentId={project.currentHeadingId}
              onSelect={handleSelectHeading}
              onUncomplete={handleUncompleteHeading}
            />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <SpecEditor
              value={project.spec}
              onChange={handleSpecChange}
              mode={specMode}
              onModeChange={setSpecMode}
            />
          </div>
          <div className="shrink-0 h-48 border-t border-stone-200 overflow-hidden">
            <BottomTabs
              activeTab={bottomTab}
              onTabChange={setBottomTab}
              log={project.log}
              memo={project.memo}
              onMemoChange={handleMemoChange}
              openQuestions={openQuestions}
            />
          </div>
        </div>

        <div className="flex flex-col w-1/2 min-w-0 overflow-hidden">
          <InterviewPanel
            heading={currentHeading}
            timeline={currentTimeline}
            isGenerating={isGeneratingTimeline}
            formattingQuestionId={formattingQuestionId}
            formattingFallback={formattingFallback}
            onGenerateTimeline={() => void handleGenerateTimeline()}
            onAnswerQuestion={(qId, ans) => { void handleAnswerQuestion(qId, ans) }}
            onSkipQuestion={handleSkipQuestion}
            onDone={handleDone}
          />
        </div>
      </div>
    </div>
  )
}
