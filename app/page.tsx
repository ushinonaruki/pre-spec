'use client'

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AnswerFormatResult, Project, Question, QuestionKind, QuestionPriority, SkipReason } from '@/types'
import { loadState, saveProject } from '@/lib/storage'
import { createProject, createProjectWithSpec } from '@/lib/ldd/project'
import { updateProjectSpec, advanceSection } from '@/lib/ldd/headings'
import { applyAnswer, applyFormattedAnswer, applySkip } from '@/lib/ldd/specPatch'
import { addSectionMarkerIfNeeded, addQuestionsToTimeline, answerQuestion, skipQuestion } from '@/lib/ldd/timelines'
import { callLLM } from '@/lib/llm/client'
import { buildAnswerFormatPrompt, buildInitialSpecPrompt, buildQuestionTimelinePrompt } from '@/lib/llm/prompts'
import { extractJSON } from '@/lib/llm/extractJSON'
import { projectToPreSpecProject, generateTimelineMarkdown } from '@/lib/projectFile'
import { runPreflightCheck } from '@/lib/preflight'
import { UI_TEXT } from '@/lib/uiText'
import StartScreen from '@/components/StartScreen'
import SpecEditor from '@/components/SpecEditor'
import InterviewPanel from '@/components/InterviewPanel'
import BottomTabs from '@/components/BottomTabs'
import PreflightPanel from '@/components/PreflightPanel'

type BottomTab = 'log' | 'memo'

type RawQuestion = {
  text: string
  reason?: string
  kind?: string
  priority?: string
  aiGuess?: { value: string; rationale: string }
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

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Home() {
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)
  const isHydratedRef = useRef(false)
  const [project, setProject] = useState<Project | null>(null)
  const [specMode, setSpecMode] = useState<'edit' | 'preview'>('edit')
  const [bottomTab, setBottomTab] = useState<BottomTab>('log')
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false)
  const [formattingQuestionId, setFormattingQuestionId] = useState<string | null>(null)
  const [formattingFallback, setFormattingFallback] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const state = loadState()
    startTransition(() => {
      setProject(state.project)
      setIsHydrated(true)
    })
    isHydratedRef.current = true
  }, [])

  const scheduleProjectSave = useCallback((p: Project) => {
    if (!isHydratedRef.current) return
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

  const handleOpenProject = useCallback((p: Project) => {
    saveProject(p)
    setProject(p)
  }, [])

  const handleSpecChange = (value: string) => {
    updateProject((prev) => updateProjectSpec(prev, value))
  }

  const handleGenerateTimeline = useCallback(async () => {
    if (!project || !project.currentSectionId || isGeneratingTimeline) return
    const section = project.sections.find((s) => s.id === project.currentSectionId)
    if (!section) return

    const existingQuestions = project.timeline
      .filter((item): item is Question => item.type === 'question' && item.sectionId === project.currentSectionId)
      .map((q) => q.text)

    setIsGeneratingTimeline(true)
    try {
      const text = await callLLM(
        buildQuestionTimelinePrompt({
          sectionTitle: section.title,
          spec: project.spec,
          memo: project.memo,
          existingQuestions,
          recentAggregationLog: project.log.slice(-1500),
        }),
      )
      const raw = extractJSON<{ questions: RawQuestion[] }>(text)
      if (!raw?.questions?.length) throw new Error('Invalid LLM response')

      const now = new Date().toISOString()
      const newQuestions: Question[] = raw.questions.map((q) => ({
        id: crypto.randomUUID(),
        type: 'question' as const,
        sectionId: section.id,
        sectionTitle: section.title,
        text: q.text,
        reason: q.reason,
        kind: q.kind as QuestionKind | undefined,
        priority: q.priority as QuestionPriority | undefined,
        aiGuess: q.aiGuess,
        status: 'open' as const,
        createdAt: now,
      }))

      updateProject((prev) => {
        const withMarker = addSectionMarkerIfNeeded(prev)
        return addQuestionsToTimeline(withMarker, newQuestions)
      })
    } catch {
      alert(UI_TEXT.app.generateTimelineError)
    } finally {
      setIsGeneratingTimeline(false)
    }
  }, [project, isGeneratingTimeline, updateProject])

  const handleAnswerQuestion = useCallback(async (questionId: string, answer: string) => {
    if (!project) return
    const questionItem = project.timeline.find(
      (item): item is Question => item.type === 'question' && item.id === questionId,
    )
    if (!questionItem) return
    const { sectionTitle, text: questionText } = questionItem

    setFormattingQuestionId(questionId)
    setFormattingFallback(false)
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current)

    try {
      const text = await callLLM(
        buildAnswerFormatPrompt({
          currentHeading: sectionTitle,
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
        const withSpec = applyFormattedAnswer(prev, { sectionTitle, question: questionText, answer, formatResult })
        return answerQuestion(withSpec, { questionId, answer })
      })
    } catch {
      setFormattingFallback(true)
      fallbackTimer.current = setTimeout(() => setFormattingFallback(false), 5000)
      updateProject((prev) => {
        const withSpec = applyAnswer(prev, { sectionTitle, question: questionText, answer })
        return answerQuestion(withSpec, { questionId, answer })
      })
    } finally {
      setFormattingQuestionId(null)
    }
  }, [project, updateProject])

  const handleSkipQuestion = (questionId: string, reason: SkipReason, detail?: string) => {
    updateProject((prev) => {
      const questionItem = prev.timeline.find(
        (item): item is Question => item.type === 'question' && item.id === questionId,
      )
      if (!questionItem) return prev
      const { sectionTitle, text: questionText } = questionItem
      const { project: withSpec, reflectedMarkdown } = applySkip(prev, { sectionTitle, question: questionText, reason, detail })
      return skipQuestion(withSpec, { questionId, skipReason: reason, skipDetail: detail, reflectedMarkdown })
    })
  }

  const handleNext = () => {
    updateProject((prev) => advanceSection(prev))
  }

  const handleMemoChange = (v: string) => {
    updateProject((prev) => ({ ...prev, memo: v }))
  }

  const handleDownloadAll = () => {
    if (!project) return
    downloadFile(UI_TEXT.specEditor.fileLabel, project.spec)
    setTimeout(() => downloadFile(UI_TEXT.app.downloadMemoFilename, project.memo || UI_TEXT.app.downloadMemoFallback), 100)
    setTimeout(() => downloadFile(UI_TEXT.app.downloadTimelineFilename, generateTimelineMarkdown(project.timeline)), 200)
  }

  const handleDownloadProjectJson = () => {
    if (!project) return
    const preSpecProject = projectToPreSpecProject(project)
    downloadJson(UI_TEXT.app.downloadProjectJsonFilename, JSON.stringify(preSpecProject, null, 2))
  }

  const preflightResult = useMemo(
    () => (project ? runPreflightCheck(project) : null),
    [project],
  )

  if (!isHydrated) return <div className="h-screen bg-stone-50" />
  if (!project) return <StartScreen onStart={handleStart} onOpenProject={handleOpenProject} />

  const currentSection = project.sections.find((s) => s.id === project.currentSectionId) ?? null

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-stone-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b border-stone-200">
        <span className="font-semibold text-stone-800 text-sm">{UI_TEXT.app.name}</span>
        <span className="text-xs text-stone-400">
          {UI_TEXT.app.sectionCount(project.sections.length)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleDownloadAll}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
          >
            {UI_TEXT.app.downloadAll}
          </button>
          <button
            onClick={handleDownloadProjectJson}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
          >
            {UI_TEXT.app.downloadProjectJson}
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
          >
            {UI_TEXT.app.settings}
          </button>
        </div>
      </header>

      <PreflightPanel result={preflightResult!} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column: spec editor + bottom tabs */}
        <div className="flex flex-col w-1/2 min-w-0 border-r border-stone-200">
          <div className="flex-1 min-h-0 overflow-hidden">
            <SpecEditor
              value={project.spec}
              onChange={handleSpecChange}
              mode={specMode}
              onModeChange={setSpecMode}
            />
          </div>
          <div className="shrink-0 h-48 border-t border-stone-200 overflow-hidden">
            <TimelineBottomTabs
              project={project}
              bottomTab={bottomTab}
              setBottomTab={setBottomTab}
              onMemoChange={handleMemoChange}
            />
          </div>
        </div>

        {/* Right column: interview panel */}
        <div className="flex flex-col w-1/2 min-w-0 overflow-hidden">
          <InterviewPanel
            currentSection={currentSection}
            sections={project.sections}
            timeline={project.timeline}
            isGenerating={isGeneratingTimeline}
            formattingQuestionId={formattingQuestionId}
            formattingFallback={formattingFallback}
            onAddQuestions={() => { void handleGenerateTimeline() }}
            onAnswerQuestion={(qId, ans) => { void handleAnswerQuestion(qId, ans) }}
            onSkipQuestion={handleSkipQuestion}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  )
}

function TimelineBottomTabs({
  project,
  bottomTab,
  setBottomTab,
  onMemoChange,
}: {
  project: Project
  bottomTab: BottomTab
  setBottomTab: (t: BottomTab) => void
  onMemoChange: (v: string) => void
}) {
  const timelineMarkdown = useMemo(
    () => generateTimelineMarkdown(project.timeline),
    [project.timeline],
  )
  return (
    <BottomTabs
      activeTab={bottomTab}
      onTabChange={setBottomTab}
      log={timelineMarkdown}
      memo={project.memo}
      onMemoChange={onMemoChange}
    />
  )
}
