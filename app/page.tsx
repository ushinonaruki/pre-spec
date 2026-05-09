'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnswerFormatResult, MarkerDefinitionFile, Project, Question, QuestionKind, QuestionPriority, RelatedSource, RelatedSourceKind, SkipReasonDefinitionFile, TimelineItem } from '@/types'
import { createProjectFromInputs } from '@/lib/ldd/project'
import type { CreateProjectInputs } from '@/lib/ldd/project'
import { generateProjectSlug } from '@/lib/ldd/slug'
import type { ProjectSaveTarget } from '@/lib/storage/saveTarget'
import { pickSaveTarget } from '@/lib/storage/fsaSaveTarget'
import { updateProjectSpec, advanceSection } from '@/lib/ldd/headings'
import { applyAnswer, applyFormattedAnswer, applyProposedMarkdown, applySkip } from '@/lib/ldd/specPatch'
import { addManualEdit, addPhaseMarker, addQuestionsToTimeline, addSectionMarkerIfNeeded, answerInitialConfirmation, answerQuestion, buildRecentLogFromTimeline, retryQuestion, skipQuestion } from '@/lib/ldd/timelines'
import { callLLM } from '@/lib/llm/client'
import { buildAnswerFormatPrompt, buildInitialConfirmationAnswerFormatPrompt, buildInitialConfirmationQuestionsPrompt, buildQuestionTimelinePrompt, buildRelatedSourceReviewPrompt, buildRetryQuestionPrompt, buildSkipMarkerBodyPrompt } from '@/lib/llm/prompts'
import type { RelatedSourceReviewResult, RetryQuestionResult } from '@/lib/llm/prompts'
import { extractJSON } from '@/lib/llm/extractJSON'
import { generateTimelineMarkdown, getProjectFilenames } from '@/lib/projectFile'
import { runPreflightCheck } from '@/lib/preflight'
import type { PreflightCheckResult } from '@/lib/preflight'
import { extractMarkerContexts, validateMarkerDefinitionFile } from '@/lib/markers'
import { CUSTOM_REASON, CUSTOM_REASON_INSTRUCTION, validateSkipReasonDefinitionFile, getEffectiveSkipReasons } from '@/lib/skipReasons'
import type { EffectiveSkipReason } from '@/lib/skipReasons'
import { buildRelatedSourceBlock, resolveSourceName } from '@/lib/relatedSources'
import { UI_TEXT } from '@/lib/text/uiText'
import StartScreen from '@/components/StartScreen'
import SpecEditor from '@/components/SpecEditor'
import InterviewPanel from '@/components/InterviewPanel'
import BottomTabs from '@/components/BottomTabs'

const LOG_TAIL_CHARS = 1500
const ERROR_BANNER_MS = 5000
const DOWNLOAD_STAGGER_MS = 100

type RawQuestion = {
  text: string
  reason?: string
  kinds?: string[]
  priority?: string
  aiGuess?: { value: string; rationale: string }
}

type RawInitialQuestion = {
  sectionTitle: string
  text: string
  reason?: string
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
      kind === 'url' ? { url: content } : undefined,
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
  const [retryingQuestionId, setRetryingQuestionId] = useState<string | null>(null)
  const [formattingFallback, setFormattingFallback] = useState(false)
  const [initConfirmFailed, setInitConfirmFailed] = useState(false)
  const [saveTarget, setSaveTarget] = useState<ProjectSaveTarget | null>(null)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      .catch(() => {})
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
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!project || !saveTarget) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void saveTarget.write(project)
    }, 500)
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

  const handleCreate = useCallback(async (inputs: CreateProjectInputs) => {
    const slug = generateProjectSlug(inputs.projectName)
    const target = await pickSaveTarget(`${slug}.pre-spec.json`)
    setSaveTarget(target)

    const p = createProjectFromInputs(inputs)

    let baseProject: Project = p
    try {
      const text = await callLLM(
        buildInitialConfirmationQuestionsPrompt({
          requirementMemo: inputs.requirementMemo,
          referenceMarkdown: p.referencesMarkdown,
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
            kinds: q.kinds as QuestionKind[] | undefined,
            priority: q.priority as QuestionPriority | undefined,
            proposedMarkdown: q.proposedMarkdown,
            status: 'open' as const,
            createdAt: now,
          }
        })
        .filter((q): q is Question => q !== null)

      const withPhase = addPhaseMarker(p)
      baseProject = addQuestionsToTimeline(withPhase, questions)
    } catch {
      if (initConfirmTimer.current) clearTimeout(initConfirmTimer.current)
      setInitConfirmFailed(true)
      initConfirmTimer.current = setTimeout(() => setInitConfirmFailed(false), ERROR_BANNER_MS)
    }

    for (const src of inputs.relatedSources ?? []) {
      const rawName = src.kind === 'file' ? src.filename : 'url-source'
      const content = src.kind === 'file' ? src.content : src.url
      const source = src.kind === 'file' ? rawName : src.url
      const result = await runRelatedSourceReview(src.kind, rawName, content, src.note)
      if (result?.status === 'ok' && result.content) {
        const now = new Date().toISOString()
        const existingNames = baseProject.relatedSources.map((s) => s.name)
        const name = resolveSourceName(existingNames, rawName)
        const newSource: RelatedSource = {
          id: crypto.randomUUID(),
          kind: src.kind,
          name,
          note: src.note,
          ...(src.kind === 'url' ? { url: src.url } : {}),
          addedAt: now,
        }
        const block = buildRelatedSourceBlock({ name, source, content: result.content, note: src.note }, now)
        baseProject = {
          ...baseProject,
          referencesMarkdown: baseProject.referencesMarkdown.replace(/\n+$/, '') + '\n\n' + block + '\n',
          relatedSources: [...baseProject.relatedSources, newSource],
        }
      }
    }

    setProject(baseProject)
  }, [])

  const handleConfirmInitial = useCallback(
    async (questionId: string, answer: string, sectionTitle: string) => {
      if (!project) return
      const questionItem = project.timeline.find(
        (item: TimelineItem): item is Question => item.type === 'question' && item.id === questionId,
      )
      if (!questionItem) return

      setFormattingQuestionId(questionId)
      setFormattingFallback(false)
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)

      try {
        const text = await callLLM(
          buildInitialConfirmationAnswerFormatPrompt({
            sectionTitle,
            questionText: questionItem.text,
            proposedMarkdown: questionItem.proposedMarkdown ?? '',
            answer,
            currentSpec: project.spec,
            referenceMemo: project.referencesMarkdown,
          }),
        )
        const formatResult = extractJSON<AnswerFormatResult>(text)
        if (!formatResult) throw new Error('Invalid format result')

        updateProject((prev: Project) => {
          const reflectedMarkdown = formatResult.specInsertionMarkdown ?? ''
          const withSpec = reflectedMarkdown
            ? applyProposedMarkdown(prev, { sectionTitle, markdown: reflectedMarkdown })
            : prev
          return answerInitialConfirmation(withSpec, {
            questionId,
            answerMarkdown: answer,
            reflectedMarkdown,
          })
        })
      } catch {
        setFormattingFallback(true)
        fallbackTimer.current = setTimeout(() => setFormattingFallback(false), ERROR_BANNER_MS)
        updateProject((prev: Project) =>
          answerInitialConfirmation(prev, {
            questionId,
            answerMarkdown: answer,
            reflectedMarkdown: '',
          }),
        )
      } finally {
        setFormattingQuestionId(null)
      }
    },
    [project, updateProject],
  )

  const handleOpenProject = useCallback((p: Project, target: ProjectSaveTarget) => {
    setProject(p)
    setSaveTarget(target)
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
      const markerContexts = extractMarkerContexts(project.spec, markerDefinitions)
      const text = await callLLM(
        buildQuestionTimelinePrompt({
          sectionTitle: section.title,
          spec: project.spec,
          memo: project.referencesMarkdown,
          existingQuestions,
          recentAggregationLog: buildRecentLogFromTimeline(project.timeline, LOG_TAIL_CHARS),
          markerContexts,
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
      alert(UI_TEXT.app.generateTimelineError)
    } finally {
      setIsGeneratingTimeline(false)
    }
  }, [project, isGeneratingTimeline, updateProject, markerDefinitions])

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
          referenceMemo: project.referencesMarkdown,
          recentLog: buildRecentLogFromTimeline(project.timeline, LOG_TAIL_CHARS),
        }),
      )
      const formatResult = extractJSON<AnswerFormatResult>(text)
      if (!formatResult?.specInsertionMarkdown) throw new Error('Invalid format result')

      updateProject((prev) => {
        const withSpec = applyFormattedAnswer(prev, { sectionTitle, question: questionText, answer, formatResult })
        return answerQuestion(withSpec, { questionId, answer, reflectedMarkdown: formatResult.specInsertionMarkdown })
      })
    } catch {
      setFormattingFallback(true)
      fallbackTimer.current = setTimeout(() => setFormattingFallback(false), ERROR_BANNER_MS)
      updateProject((prev) => {
        const fallbackMarkdown = `- ${answer}`
        const withSpec = applyAnswer(prev, { sectionTitle, question: questionText, answer })
        return answerQuestion(withSpec, { questionId, answer, reflectedMarkdown: fallbackMarkdown })
      })
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

      const { sectionTitle, text: questionText, questionType, proposedMarkdown, aiGuess } = questionItem

      const isCustom = reason === CUSTOM_REASON
      const skipInstruction = isCustom
        ? (customText?.trim() ?? CUSTOM_REASON_INSTRUCTION)
        : (skipReasonDefinitions?.skipReasons[reason]?.instruction ?? CUSTOM_REASON_INSTRUCTION)

      const fallbackBody = proposedMarkdown?.trim()
        ? '提案内容を採用するかは未決。'
        : `${questionText}については未決。`

      let markerBody = fallbackBody
      try {
        const text = await callLLM(
          buildSkipMarkerBodyPrompt({ sectionTitle, questionText, questionType, proposedMarkdown, aiGuess, skipReason: reason, skipInstruction, isCustom }),
        )
        const result = extractJSON<{ markerBody: string }>(text)
        if (result?.markerBody?.trim()) {
          markerBody = result.markerBody.trim()
        }
      } catch {
        // use fallback
      }

      updateProject((prev) => {
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

      setRetryingQuestionId(questionId)
      try {
        const text = await callLLM(
          buildRetryQuestionPrompt({
            sectionTitle: questionItem.sectionTitle,
            originalQuestion: questionItem,
            spec: project.spec,
            memo: project.referencesMarkdown,
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
          reason: raw.reason,
          kinds: raw.kinds as Question['kinds'],
          priority: raw.priority as Question['priority'],
          aiGuess: raw.aiGuess,
          proposedMarkdown: raw.proposedMarkdown,
          status: 'open' as const,
          createdAt: now,
        }

        updateProject((prev) => retryQuestion(prev, { questionId, newQuestion }))
      } catch {
        alert(UI_TEXT.app.retryQuestionError)
      } finally {
        setRetryingQuestionId(null)
      }
    },
    [project, updateProject],
  )

  const handleNext = () => {
    updateProject((prev) => advanceSection(prev))
  }

  const handleAddReference = useCallback(
    async (kind: RelatedSourceKind, rawName: string, content: string, note?: string): Promise<{ ok: boolean; reason?: string }> => {
      const result = await runRelatedSourceReview(kind, rawName, content, note)
      if (!result) return { ok: false }
      if (result.status === 'unreadable') return { ok: false, reason: result.reason }
      const aiContent = result.content
      if (!aiContent) return { ok: false }

      updateProject((prev: Project) => {
        const now = new Date().toISOString()
        const existingNames = prev.relatedSources.map((s) => s.name)
        const name = resolveSourceName(existingNames, rawName)
        const source = kind === 'url' ? content : rawName
        const newSource: RelatedSource = {
          id: crypto.randomUUID(),
          kind,
          name,
          note,
          ...(kind === 'url' ? { url: content } : {}),
          addedAt: now,
        }
        const block = buildRelatedSourceBlock({ name, source, content: aiContent, note }, now)
        const newReferencesMarkdown = prev.referencesMarkdown.replace(/\n+$/, '') + '\n\n' + block + '\n'
        return {
          ...prev,
          referencesMarkdown: newReferencesMarkdown,
          relatedSources: [...prev.relatedSources, newSource],
        }
      })
      return { ok: true }
    },
    [updateProject],
  )

  const handleDownloadAll = () => {
    if (!project) return
    const result = runPreflightCheck(project, markerDefinitions)
    if (result.warnings.length > 0) {
      if (!window.confirm(buildDownloadConfirmMessage(result, markerDefinitions))) return
    }
    const filenames = getProjectFilenames(project.slug)
    downloadFile(filenames.spec, project.spec)
    setTimeout(() => downloadFile(filenames.references, project.referencesMarkdown || '# References\n\n(empty)\n'), DOWNLOAD_STAGGER_MS)
    setTimeout(() => downloadFile(filenames.timeline, generateTimelineMarkdown(project.timeline, project.sections)), DOWNLOAD_STAGGER_MS * 2)
  }

  if (!project) return (
    <StartScreen
      onCreate={(inputs) => handleCreate(inputs)}
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

      {initConfirmFailed && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
          {UI_TEXT.initialConfirmation.generationError}
        </div>
      )}

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
            <TimelineBottomTabs
              project={project}
              onAddReference={handleAddReference}
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
            retryingQuestionId={retryingQuestionId}
            onAddQuestions={() => { void handleGenerateTimeline() }}
            onAnswerQuestion={(qId, ans) => { void handleAnswerQuestion(qId, ans) }}
            skipReasons={effectiveSkipReasons}
            onSkipQuestion={handleSkipQuestion}
            onRetryQuestion={(qId) => { void handleRetryQuestion(qId) }}
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
  onAddReference,
}: {
  project: Project
  onAddReference: (kind: RelatedSourceKind, name: string, content: string, note?: string) => Promise<{ ok: boolean; reason?: string }>
}) {
  return (
    <BottomTabs
      referencesMarkdown={project.referencesMarkdown}
      onAddReference={onAddReference}
    />
  )
}
