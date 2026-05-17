'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnswerFormatResult, MarkerDefinitionFile, Project, Question, QuestionKind, QuestionPriority, RelatedSourceKind, SkipReasonDefinitionFile } from '@/types'
import { createProjectFromInputs } from '@/lib/ldd/project'
import type { CreateProjectRequest } from '@/lib/ldd/project'

import type { ProjectSaveTarget } from '@/lib/storage/saveTarget'
import { pickSaveTarget } from '@/lib/storage/fsaSaveTarget'
import { replaceSpecMarkdownAndRefreshSections, advanceCurrentSection } from '@/lib/ldd/headings'
import { applyFormattedAnswer, applySkip } from '@/lib/ldd/specPatch'
import { addManualEdit, addPhaseMarker, addQuestionsToTimeline, addSectionMarkerIfNeeded, answerQuestion, buildRecentLogFromTimeline, failQuestion, retryQuestion, skipQuestion } from '@/lib/ldd/timelines'
import { callLLM } from '@/lib/llm/client'
import { buildAnswerFormatPrompt, buildInitialConfirmationAnswerFormatPrompt, buildInitialConfirmationQuestionsPrompt, buildQuestionTimelinePrompt, buildRelatedSourceReviewPrompt, buildRetryQuestionPrompt, buildSkipMarkerBodyPrompt } from '@/lib/llm/prompts'
import type { RelatedSourceReviewResult, RetryQuestionResult } from '@/lib/llm/prompts'
import { extractJSON } from '@/lib/llm/extractJSON'
import { hasSectionHeading } from '@/lib/markdown'
import { generateTimelineMarkdown, getProjectFilenames, PRE_SPEC_PROJECT_FILE_SUFFIX } from '@/lib/projectFile'
import { runPreflightCheck } from '@/lib/preflight'
import type { PreflightCheckResult } from '@/lib/preflight'
import { extractMarkerContexts, validateMarkerDefinitionFile } from '@/lib/markers'
import { CUSTOM_REASON, validateSkipReasonDefinitionFile, getEffectiveSkipReasons } from '@/lib/skipReasons'
import type { EffectiveSkipReason } from '@/lib/skipReasons'
import { buildRelatedSourceBlock, extractImportedNames, resolveSourceName, URL_SOURCE_NAME } from '@/lib/relatedSources'
import { buildCheckedAt } from '@/lib/locale'
import { UI_TEXT } from '@/lib/text/uiText'
import StartScreen from '@/components/StartScreen'
import SpecEditor from '@/components/SpecEditor'
import InterviewPanel from '@/components/InterviewPanel'
import ReferencesPanel from '@/components/ReferencesPanel'

const LOG_TAIL_CHARS = 1500
const DOWNLOAD_STAGGER_MS = 100
const AUTOSAVE_DEBOUNCE_MS = 500

type RawQuestion = {
  text: string
  kinds?: string[]
  priority?: string
  aiGuess?: { value: string; rationale: string }
}

type RawInitialQuestion = {
  sectionTitle: string
  text: string
  kinds?: string[]
  priority?: string
  proposedMarkdown?: string
}

function buildDownloadConfirmMessage(
  result: PreflightCheckResult,
  markerDefinitions: MarkerDefinitionFile | null,
): string {
  const lines: string[] = [UI_TEXT.preflight.downloadConfirmTitle, '']
  lines.push(UI_TEXT.preflight.downloadConfirmOpenQuestions(result.openQuestions))
  lines.push(UI_TEXT.preflight.downloadConfirmMarkerHeader)
  lines.push(UI_TEXT.preflight.downloadConfirmMarkerItem('skip', result.skipMarkers))
  if (markerDefinitions) {
    for (const [name] of Object.entries(markerDefinitions.markers)) {
      lines.push(UI_TEXT.preflight.downloadConfirmMarkerItem(name, result.markerCounts[name] ?? 0))
    }
  }
  lines.push('')
  lines.push(UI_TEXT.preflight.downloadConfirmWarning)
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


async function runRelatedSourceReview(
  kind: RelatedSourceKind,
  rawName: string,
  content: string,
  note?: string,
): Promise<RelatedSourceReviewResult | null> {
  try {
    const text = await callLLM(
      buildRelatedSourceReviewPrompt({ name: rawName, kind, content, note }),
      kind === 'url' ? { enableWebFetch: true } : undefined,
    )
    return extractJSON<RelatedSourceReviewResult>(text)
  } catch {
    return null
  }
}

export default function Home() {
  const [project, setProject] = useState<Project | null>(null)
  const [markerDefinitions, setMarkerDefinitions] = useState<MarkerDefinitionFile | null>(null)
  const [skipReasonDefinitions, setSkipReasonDefinitions] = useState<SkipReasonDefinitionFile | null>(null)
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false)
  const [formattingQuestionId, setFormattingQuestionId] = useState<string | null>(null)
  const [skippingQuestionId, setSkippingQuestionId] = useState<string | null>(null)
  const [retryingQuestionId, setRetryingQuestionId] = useState<string | null>(null)
  const [answerLLMErrorId, setAnswerLLMErrorId] = useState<string | null>(null)
  const [skipLLMErrorId, setSkipLLMErrorId] = useState<string | null>(null)
  const [addQuestionError, setAddQuestionError] = useState(false)
  const [retryLLMErrorQuestionId, setRetryLLMErrorQuestionId] = useState<string | null>(null)
  const [saveTarget, setSaveTarget] = useState<ProjectSaveTarget | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/pre-spec.markers.json')
      .then((res) => {
        if (!res.ok) return
        return res.json() as Promise<unknown>
      })
      .then((raw) => {
        if (!raw) return
        try {
          setMarkerDefinitions(validateMarkerDefinitionFile(raw))
        } catch {
          // invalid file — ignore silently
        }
      })
      .catch(() => { })
  }, [])

  useEffect(() => {
    fetch('/pre-spec.skip-reasons.json')
      .then((res) => {
        if (!res.ok) return
        return res.json() as Promise<unknown>
      })
      .then((raw) => {
        if (!raw) return
        try {
          setSkipReasonDefinitions(validateSkipReasonDefinitionFile(raw))
        } catch {
          // invalid file — ignore silently
        }
      })
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!project || !saveTarget) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void saveTarget.write(project)
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [project, saveTarget])

  const updateProject = useCallback(
    (updater: (prev: Project) => Project) => {
      setProject((prev) => {
        if (!prev) return prev
        return updater(prev)
      })
    },
    [],
  )

  const handleCreateProject = useCallback(async (inputs: CreateProjectRequest): Promise<{ ok: true } | { ok: false; error?: string }> => {
    let pickedTarget: ProjectSaveTarget
    try {
      pickedTarget = await pickSaveTarget(`${inputs.projectFileBase}${PRE_SPEC_PROJECT_FILE_SUFFIX}`)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return { ok: false }
      return { ok: false, error: UI_TEXT.startScreen.createErrorSaveTarget }
    }

    let baseProject: Project = createProjectFromInputs(inputs)

    for (const src of inputs.relatedSources ?? []) {
      const rawName = src.kind === 'file' ? src.filename : URL_SOURCE_NAME
      const content = src.kind === 'file' ? src.content : src.url
      const source = src.kind === 'file' ? rawName : src.url
      const result = await runRelatedSourceReview(src.kind, rawName, content, src.note)
      if (result === null) {
        return { ok: false, error: UI_TEXT.startScreen.createErrorRelatedSource }
      }
      if (result.status === 'unreadable') {
        const error = result.reason
          ? UI_TEXT.startScreen.createErrorRelatedSourceUnreadable(result.reason)
          : UI_TEXT.startScreen.createErrorRelatedSource
        return { ok: false, error }
      }
      if (!result.content) {
        return { ok: false, error: UI_TEXT.startScreen.createErrorRelatedSource }
      }
      const existingNames = extractImportedNames(baseProject.referencesMarkdown)
      const name = resolveSourceName(existingNames, rawName)
      const block = buildRelatedSourceBlock({ name, source, content: result.content, note: src.note }, buildCheckedAt())
      baseProject = {
        ...baseProject,
        referencesMarkdown: baseProject.referencesMarkdown.replace(/\n+$/, '') + '\n\n' + block + '\n',
      }
    }

    let raw: { questions: RawInitialQuestion[] } | null = null
    try {
      const text = await callLLM(
        buildInitialConfirmationQuestionsPrompt({
          requirementMemo: inputs.requirementMemo,
          referencesMarkdown: baseProject.referencesMarkdown,
          sections: baseProject.sections,
        }),
      )
      raw = extractJSON<{ questions: RawInitialQuestion[] }>(text)
    } catch {
      return { ok: false, error: UI_TEXT.startScreen.createErrorGeneration }
    }

    if (!Array.isArray(raw?.questions)) {
      return { ok: false, error: UI_TEXT.startScreen.createErrorGeneration }
    }

    const now = new Date().toISOString()
    const questions: Question[] = raw.questions
      .map((q): Question | null => {
        const section = baseProject.sections.find((s) => s.title === q.sectionTitle)
        if (!section) return null
        return {
          id: crypto.randomUUID(),
          type: 'question' as const,
          questionType: 'initial_confirmation' as const,
          sectionId: section.id,
          sectionTitle: q.sectionTitle,
          text: q.text,
          kinds: q.kinds as QuestionKind[] | undefined,
          priority: q.priority as QuestionPriority | undefined,
          proposedMarkdown: q.proposedMarkdown,
          status: 'open' as const,
          createdAt: now,
        }
      })
      .filter((q): q is Question => q !== null)

    if (questions.length === 0) {
      return { ok: false, error: UI_TEXT.startScreen.createErrorNoInitialQuestions }
    }

    const withPhase = addPhaseMarker(baseProject)
    baseProject = addQuestionsToTimeline(withPhase, questions)

    setProject(baseProject)
    setSaveTarget(pickedTarget)
    return { ok: true }
  }, [])

  const handleOpenProject = useCallback((p: Project, target: ProjectSaveTarget) => {
    setProject(p)
    setSaveTarget(target)
  }, [])

  const handleSpecSave = useCallback((newSpec: string) => {
    updateProject((prev) => {
      const withUpdatedSpec = replaceSpecMarkdownAndRefreshSections(prev, newSpec)
      return addManualEdit(withUpdatedSpec)
    })
  }, [updateProject])

  const handleGenerateTimeline = useCallback(async () => {
    if (!project || !project.currentSectionId || isGeneratingTimeline) return
    const section = project.sections.find((s) => s.id === project.currentSectionId)
    if (!section) return

    const existingQuestions = project.timeline
      .filter((item): item is Question => item.type === 'question' && item.sectionId === project.currentSectionId)
      .map((q) => q.text)

    setAddQuestionError(false)
    setIsGeneratingTimeline(true)
    try {
      const markerContexts = extractMarkerContexts(project.spec, markerDefinitions)
      const text = await callLLM(
        buildQuestionTimelinePrompt({
          sectionTitle: section.title,
          spec: project.spec,
          referencesMarkdown: project.referencesMarkdown,
          existingQuestions,
          recentTimelineLog: buildRecentLogFromTimeline(project.timeline, LOG_TAIL_CHARS),
          markerContexts,
        }),
      )
      const raw = extractJSON<{ questions: RawQuestion[] }>(text)
      if (!raw?.questions?.length) throw new Error('Invalid LLM response')

      const now = new Date().toISOString()
      const newQuestions: Question[] = raw.questions.map((q) => ({
        id: crypto.randomUUID(),
        type: 'question' as const,
        questionType: 'section_question' as const,
        sectionId: section.id,
        sectionTitle: section.title,
        text: q.text,
        kinds: q.kinds as QuestionKind[] | undefined,
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
      setAddQuestionError(true)
    } finally {
      setIsGeneratingTimeline(false)
    }
  }, [project, isGeneratingTimeline, updateProject, markerDefinitions])

  const handleAnswerQuestion = useCallback(async (questionId: string, answer: string): Promise<boolean> => {
    if (!project) return false
    const questionItem = project.timeline.find(
      (item): item is Question => item.type === 'question' && item.id === questionId,
    )
    if (!questionItem) return false
    const { sectionTitle, text: questionText, questionType, proposedMarkdown } = questionItem

    setAnswerLLMErrorId(null)

    if (!hasSectionHeading(project.spec, sectionTitle)) {
      updateProject((prev) => failQuestion(prev, { questionId, attemptedAnswer: answer }))
      return true
    }

    setFormattingQuestionId(questionId)

    try {
      const text = await callLLM(
        questionType === 'initial_confirmation'
          ? buildInitialConfirmationAnswerFormatPrompt({
              sectionTitle,
              questionText,
              proposedMarkdown,
              answer,
              currentSpec: project.spec,
              referencesMarkdown: project.referencesMarkdown,
            })
          : buildAnswerFormatPrompt({
              currentHeading: sectionTitle,
              question: questionText,
              answer,
              currentSpec: project.spec,
              referencesMarkdown: project.referencesMarkdown,
              recentTimelineLog: buildRecentLogFromTimeline(project.timeline, LOG_TAIL_CHARS),
            }),
      )
      const formatResult = extractJSON<AnswerFormatResult>(text)
      const specInsertionMarkdown = formatResult?.specInsertionMarkdown
      if (typeof specInsertionMarkdown !== 'string') {
        throw new Error('Invalid format result')
      }

      updateProject((prev) => {
        if (specInsertionMarkdown && !hasSectionHeading(prev.spec, sectionTitle)) {
          return failQuestion(prev, { questionId, attemptedAnswer: answer })
        }
        const withSpec = specInsertionMarkdown
          ? applyFormattedAnswer(prev, { sectionTitle, formatResult: { specInsertionMarkdown } })
          : prev
        return answerQuestion(withSpec, { questionId, answer, reflectedMarkdown: specInsertionMarkdown })
      })
      return true
    } catch {
      setAnswerLLMErrorId(questionId)
      return false
    } finally {
      setFormattingQuestionId(null)
    }
  }, [project, updateProject])

  const handleSkipQuestion = useCallback(
    async (questionId: string, reason: string, customText?: string) => {
      if (!project) return
      const questionItem = project.timeline.find(
        (item): item is Question => item.type === 'question' && item.id === questionId,
      )
      if (!questionItem) return

      const { sectionTitle, text: questionText, proposedMarkdown, aiGuess } = questionItem

      setSkipLLMErrorId(null)

      if (!hasSectionHeading(project.spec, sectionTitle)) {
        updateProject((prev) => failQuestion(prev, {
          questionId,
          attemptedSkip: { reason, customText },
        }))
        return
      }

      const isCustom = reason === CUSTOM_REASON
      const skipInstruction = isCustom
        ? customText!
        : skipReasonDefinitions!.skipReasons[reason].instruction

      setSkippingQuestionId(questionId)

      let markerBody: string
      try {
        const text = await callLLM(
          buildSkipMarkerBodyPrompt({ sectionTitle, questionText, proposedMarkdown, aiGuess, skipReason: reason, skipInstruction }),
        )
        const result = extractJSON<{ markerBody: string }>(text)
        if (!result?.markerBody?.trim()) throw new Error('Invalid result')
        markerBody = result.markerBody.trim()
      } catch {
        setSkipLLMErrorId(questionId)
        return
      } finally {
        setSkippingQuestionId(null)
      }

      updateProject((prev) => {
        if (!hasSectionHeading(prev.spec, sectionTitle)) {
          return failQuestion(prev, { questionId, attemptedSkip: { reason, customText } })
        }
        const { project: withSpec, reflectedMarkdown } = applySkip(prev, { sectionTitle, markerBody, reason })
        return skipQuestion(withSpec, { questionId, skipReason: reason, skipCustomText: isCustom ? customText : undefined, reflectedMarkdown })
      })
    },
    [project, updateProject, skipReasonDefinitions],
  )

  const handleRetryQuestion = useCallback(
    async (questionId: string) => {
      if (!project) return
      const questionItem = project.timeline.find(
        (item): item is Question => item.type === 'question' && item.id === questionId,
      )
      if (!questionItem) return

      setRetryLLMErrorQuestionId(null)
      setRetryingQuestionId(questionId)
      try {
        const text = await callLLM(
          buildRetryQuestionPrompt({
            sectionTitle: questionItem.sectionTitle,
            originalQuestion: questionItem,
            spec: project.spec,
            referencesMarkdown: project.referencesMarkdown,
          }),
        )
        const raw = extractJSON<RetryQuestionResult>(text)
        if (!raw?.text?.trim()) throw new Error('Invalid retry result')

        const now = new Date().toISOString()
        const newQuestion: Question = {
          id: crypto.randomUUID(),
          type: 'question' as const,
          questionType: questionItem.questionType,
          sectionId: questionItem.sectionId,
          sectionTitle: questionItem.sectionTitle,
          text: raw.text.trim(),
          kinds: raw.kinds as Question['kinds'],
          priority: raw.priority as Question['priority'],
          aiGuess: raw.aiGuess,
          proposedMarkdown: raw.proposedMarkdown,
          status: 'open' as const,
          createdAt: now,
        }

        updateProject((prev) => retryQuestion(prev, { questionId, newQuestion }))
      } catch {
        setRetryLLMErrorQuestionId(questionId)
      } finally {
        setRetryingQuestionId(null)
      }
    },
    [project, updateProject],
  )

  const handleNext = () => {
    updateProject((prev) => advanceCurrentSection(prev))
  }

  const handleAddReference = useCallback(
    async (kind: RelatedSourceKind, rawName: string, content: string, note?: string): Promise<{ ok: boolean; reason?: string }> => {
      const result = await runRelatedSourceReview(kind, rawName, content, note)
      if (!result) return { ok: false }
      if (result.status === 'unreadable') return { ok: false, reason: result.reason }
      const aiContent = result.content
      if (!aiContent) return { ok: false }

      updateProject((prev: Project) => {
        const existingNames = extractImportedNames(prev.referencesMarkdown)
        const name = resolveSourceName(existingNames, rawName)
        const source = kind === 'url' ? content : rawName
        const block = buildRelatedSourceBlock({ name, source, content: aiContent, note }, buildCheckedAt())
        const newReferencesMarkdown = prev.referencesMarkdown.replace(/\n+$/, '') + '\n\n' + block + '\n'
        return {
          ...prev,
          referencesMarkdown: newReferencesMarkdown,
          updatedAt: new Date().toISOString(),
        }
      })
      return { ok: true }
    },
    [updateProject],
  )

  const handleDownloadAll = () => {
    if (!project) return
    const result = runPreflightCheck(project, markerDefinitions)
    if (result.hasWarnings) {
      if (!window.confirm(buildDownloadConfirmMessage(result, markerDefinitions))) return
    }
    const filenames = getProjectFilenames(project.fileBase)
    downloadFile(filenames.spec, project.spec)
    setTimeout(() => downloadFile(filenames.references, project.referencesMarkdown), DOWNLOAD_STAGGER_MS)
    setTimeout(() => downloadFile(filenames.timeline, generateTimelineMarkdown(project.timeline)), DOWNLOAD_STAGGER_MS * 2)
  }

  if (!project) return (
    <StartScreen
      onCreate={(inputs) => handleCreateProject(inputs)}
      onOpenProject={handleOpenProject}
    />
  )

  const currentSection = project.sections.find((s) => s.id === project.currentSectionId) ?? null
  const effectiveSkipReasons: EffectiveSkipReason[] = getEffectiveSkipReasons(skipReasonDefinitions)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-stone-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b border-stone-200">
        <span className="font-semibold text-stone-800 text-sm">{UI_TEXT.app.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleDownloadAll}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors cursor-pointer"
          >
            {UI_TEXT.app.downloadAll}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column: spec editor + bottom tabs */}
        <div className="flex flex-col w-1/2 min-w-0 border-r border-stone-200">
          <div className="flex-[2] min-h-0 overflow-hidden">
            <SpecEditor
              value={project.spec}
              onSave={handleSpecSave}
            />
          </div>
          <div className="flex-1 min-h-0 border-t border-stone-200 overflow-hidden">
            <ReferencesPanel
              referencesMarkdown={project.referencesMarkdown}
              onAddReference={handleAddReference}
            />
          </div>
        </div>

        {/* Right column: interview panel */}
        <div className="flex flex-col w-1/2 min-w-0 overflow-hidden">
          <InterviewPanel
            currentSection={currentSection}
            timeline={project.timeline}
            isGenerating={isGeneratingTimeline}
            addQuestionError={addQuestionError}
            onDismissAddQuestionError={() => setAddQuestionError(false)}
            formattingQuestionId={formattingQuestionId}
            skippingQuestionId={skippingQuestionId}
            retryingQuestionId={retryingQuestionId}
            retryLLMErrorQuestionId={retryLLMErrorQuestionId}
            onDismissRetryLLMError={() => setRetryLLMErrorQuestionId(null)}
            answerLLMErrorQuestionId={answerLLMErrorId}
            skipLLMErrorQuestionId={skipLLMErrorId}
            onDismissAnswerLLMError={() => setAnswerLLMErrorId(null)}
            onDismissSkipLLMError={() => setSkipLLMErrorId(null)}
            onAddQuestions={() => { void handleGenerateTimeline() }}
            onAnswerQuestion={handleAnswerQuestion}
            skipReasons={effectiveSkipReasons}
            onSkipQuestion={handleSkipQuestion}
            onRetryQuestion={(qId) => { void handleRetryQuestion(qId) }}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  )
}
