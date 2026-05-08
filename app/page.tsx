'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AnswerFormatResult, MarkerDefinitionFile, Project, Question, QuestionKind, QuestionPriority, SkipReason } from '@/types'
import { createProjectFromInputs } from '@/lib/ldd/project'
import type { CreateProjectInputs } from '@/lib/ldd/project'
import { updateProjectSpec, advanceSection } from '@/lib/ldd/headings'
import { applyAnswer, applyFormattedAnswer, applyProposedMarkdown, applySkip } from '@/lib/ldd/specPatch'
import { addManualEdit, addPhaseMarker, addQuestionsToTimeline, addSectionMarkerIfNeeded, answerInitialConfirmation, answerQuestion, skipQuestion } from '@/lib/ldd/timelines'
import { callLLM } from '@/lib/llm/client'
import { buildAnswerFormatPrompt, buildInitialConfirmationQuestionsPrompt, buildQuestionTimelinePrompt } from '@/lib/llm/prompts'
import { extractJSON } from '@/lib/llm/extractJSON'
import { projectToPreSpecProject, generateTimelineMarkdown, getProjectFilenames } from '@/lib/projectFile'
import { runPreflightCheck } from '@/lib/preflight'
import type { PreflightCheckResult } from '@/lib/preflight'
import { EXTENSIBLE_MARKERS } from '@/lib/markers'
import { UI_TEXT } from '@/lib/text/uiText'
import StartScreen from '@/components/StartScreen'
import SpecEditor from '@/components/SpecEditor'
import InterviewPanel from '@/components/InterviewPanel'
import BottomTabs from '@/components/BottomTabs'
import PreflightPanel from '@/components/PreflightPanel'

const LOG_TAIL_CHARS = 1500
const ERROR_BANNER_MS = 5000
const DOWNLOAD_STAGGER_MS = 100

type BottomTab = 'log' | 'memo'

type RawQuestion = {
  text: string
  reason?: string
  kind?: string
  priority?: string
  aiGuess?: { value: string; rationale: string }
}

type RawInitialQuestion = {
  sectionTitle: string
  text: string
  reason?: string
  kind?: string
  priority?: string
  proposedMarkdown?: string
}

function buildDownloadConfirmMessage(
  result: PreflightCheckResult,
  markerDefinitions: MarkerDefinitionFile | null,
): string {
  const lines: string[] = [UI_TEXT.preflight.downloadConfirmTitle, '']
  lines.push(UI_TEXT.preflight.downloadConfirmOpenQuestions(result.openQuestions))
  lines.push(UI_TEXT.preflight.downloadConfirmSkipMarkers(result.skipMarkers))
  for (const marker of EXTENSIBLE_MARKERS) {
    lines.push(UI_TEXT.preflight.downloadConfirmMarkerCount(marker.label, result.markerCounts[marker.id] ?? 0))
  }
  if (markerDefinitions) {
    for (const [name, def] of Object.entries(markerDefinitions.markers)) {
      lines.push(UI_TEXT.preflight.downloadConfirmMarkerCount(def.label, result.markerCounts[name] ?? 0))
    }
  }
  lines.push('')
  lines.push(UI_TEXT.preflight.downloadConfirmPrompt)
  return lines.join('\n')
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
  const [project, setProject] = useState<Project | null>(null)
  const [markerDefinitions, setMarkerDefinitions] = useState<MarkerDefinitionFile | null>(null)
  const [bottomTab, setBottomTab] = useState<BottomTab>('log')
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false)
  const [formattingQuestionId, setFormattingQuestionId] = useState<string | null>(null)
  const [formattingFallback, setFormattingFallback] = useState(false)
  const [initConfirmFailed, setInitConfirmFailed] = useState(false)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateProject = useCallback(
    (updater: (prev: Project) => Project) => {
      setProject((prev) => {
        if (!prev) return prev
        return updater(prev)
      })
    },
    [],
  )

  const handleCreate = useCallback(async (inputs: CreateProjectInputs) => {
    const p = createProjectFromInputs(inputs)
    try {
      const text = await callLLM(
        buildInitialConfirmationQuestionsPrompt({
          requirementMemo: inputs.requirementMemo,
          baseSpecMarkdown: inputs.baseSpecMarkdown,
          referenceMarkdown: p.memo,
          sections: p.sections,
        }),
      )
      const raw = extractJSON<{ questions: RawInitialQuestion[] }>(text)
      if (!raw?.questions?.length) throw new Error('No questions')

      const now = new Date().toISOString()
      const questions: Question[] = raw.questions
        .map((q): Question | null => {
          const section = p.sections.find((s) => s.title === q.sectionTitle)
          if (!section) return null
          return {
            id: crypto.randomUUID(),
            type: 'question' as const,
            questionType: 'initial_confirmation' as const,
            sectionId: section.id,
            sectionTitle: q.sectionTitle,
            text: q.text,
            reason: q.reason,
            kind: q.kind as QuestionKind | undefined,
            priority: q.priority as QuestionPriority | undefined,
            proposedMarkdown: q.proposedMarkdown,
            status: 'open' as const,
            createdAt: now,
          }
        })
        .filter((q): q is Question => q !== null)

      const withPhase = addPhaseMarker(p)
      const withQuestions = addQuestionsToTimeline(withPhase, questions)
      setProject(withQuestions)
    } catch {
      if (initConfirmTimer.current) clearTimeout(initConfirmTimer.current)
      setInitConfirmFailed(true)
      initConfirmTimer.current = setTimeout(() => setInitConfirmFailed(false), ERROR_BANNER_MS)
      setProject(p)
    }
  }, [])

  const handleConfirmInitial = useCallback(
    (questionId: string, markdown: string, sectionTitle: string) => {
      updateProject((prev) => {
        const withSpec = applyProposedMarkdown(prev, { sectionTitle, markdown })
        return answerInitialConfirmation(withSpec, {
          questionId,
          answerMarkdown: markdown,
          reflectedMarkdown: markdown,
        })
      })
    },
    [updateProject],
  )

  const handleOpenProject = useCallback((p: Project) => {
    setProject(p)
  }, [])

  const handleSpecSave = useCallback((newSpec: string, memo?: string) => {
    updateProject((prev) => {
      const beforeMarkdown = prev.spec
      const withUpdatedSpec = updateProjectSpec(prev, newSpec)
      return addManualEdit(withUpdatedSpec, { beforeMarkdown, afterMarkdown: newSpec, memo })
    })
  }, [updateProject])

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
          recentAggregationLog: project.log.slice(-LOG_TAIL_CHARS),
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
          recentLog: project.log.slice(-LOG_TAIL_CHARS),
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
      fallbackTimer.current = setTimeout(() => setFormattingFallback(false), ERROR_BANNER_MS)
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
    const result = runPreflightCheck(project, markerDefinitions)
    if (result.warnings.length > 0) {
      if (!window.confirm(buildDownloadConfirmMessage(result, markerDefinitions))) return
    }
    const filenames = getProjectFilenames(project.slug)
    downloadFile(filenames.spec, project.spec)
    setTimeout(() => downloadFile(filenames.references, project.memo || '# References\n\n(empty)\n'), DOWNLOAD_STAGGER_MS)
    setTimeout(() => downloadFile(filenames.timeline, generateTimelineMarkdown(project.timeline, project.sections)), DOWNLOAD_STAGGER_MS * 2)
  }

  const handleDownloadProjectJson = () => {
    if (!project) return
    const preSpecProject = projectToPreSpecProject(project)
    downloadJson(getProjectFilenames(project.slug).project, JSON.stringify(preSpecProject, null, 2))
  }

  const preflightResult = useMemo(
    () => (project ? runPreflightCheck(project, markerDefinitions) : null),
    [project, markerDefinitions],
  )

  if (!project) return (
    <StartScreen
      onCreate={(inputs) => handleCreate(inputs)}
      onOpenProject={handleOpenProject}
      onMarkersLoaded={setMarkerDefinitions}
    />
  )

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

      <PreflightPanel result={preflightResult!} markerDefinitions={markerDefinitions} />
      {initConfirmFailed && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
          {UI_TEXT.initialConfirmation.generationError}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column: spec editor + bottom tabs */}
        <div className="flex flex-col w-1/2 min-w-0 border-r border-stone-200">
          <div className="flex-1 min-h-0 overflow-hidden">
            <SpecEditor
              value={project.spec}
              onSave={handleSpecSave}
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
            onConfirmInitial={handleConfirmInitial}
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
    () => generateTimelineMarkdown(project.timeline, project.sections),
    [project.timeline, project.sections],
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
