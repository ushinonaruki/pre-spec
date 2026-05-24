'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnswerFormatResult, Feature, MarkerDefinitionFile, Question, QuestionKind, QuestionPriority, RelatedSourceKind, SkipReasonDefinitionFile, Workspace } from '@/types'
import type { WorkspaceSaveTarget } from '@/lib/storage/saveTarget'
import { pickSaveTarget } from '@/lib/storage/fsaSaveTarget'
import { replaceSpecMarkdownAndRefreshSections, advanceCurrentSection } from '@/lib/ldd/headings'
import { applyFormattedAnswer, applySkip } from '@/lib/ldd/specPatch'
import { addManualEdit, addPhaseMarker, addQuestionsToTimeline, addSectionMarkerIfNeeded, answerQuestion, buildRecentLogFromTimeline, failQuestion, retryQuestion, skipQuestion } from '@/lib/ldd/timelines'
import { callLLM } from '@/lib/llm/client'
import { buildAnswerFormatPrompt, buildInitialConfirmationAnswerFormatPrompt, buildInitialConfirmationQuestionsPrompt, buildQuestionTimelinePrompt, buildRelatedSourceReviewPrompt, buildRetryQuestionPrompt, buildSkipMarkerBodyPrompt } from '@/lib/llm/prompts'
import type { RelatedSourceReviewResult, RetryQuestionResult } from '@/lib/llm/prompts'
import { extractJSON } from '@/lib/llm/extractJSON'
import { hasSectionHeading } from '@/lib/markdown'
import { generateTimelineMarkdown, PRE_SPEC_PROJECT_FILE_SUFFIX } from '@/lib/projectFile'
import { runWorkspacePreflightCheck } from '@/lib/preflight'
import { extractMarkerContexts, validateMarkerDefinitionFile } from '@/lib/markers'
import { CUSTOM_REASON, validateSkipReasonDefinitionFile, getEffectiveSkipReasons } from '@/lib/skipReasons'
import type { EffectiveSkipReason } from '@/lib/skipReasons'
import { buildRelatedSourceBlock, extractImportedNames, resolveSourceName, URL_SOURCE_NAME } from '@/lib/relatedSources'
import { buildCheckedAt } from '@/lib/locale'
import { buildEffectiveReferencesForFeature, buildOutputReferencesForFeature, appendGlobalReference, appendLocalReference } from '@/lib/referencesScope'
import { buildInitialRequirementMemoBlock } from '@/lib/references'
import { createWorkspace, validateWorkspaceSlug } from '@/lib/workspace'
import { createFeature, deleteFeature, findFeatureBySlug, renameFeature, setActiveFeature, sortFeatures, validateFeatureSlug } from '@/lib/feature'
import type { InitialRelatedSource } from '@/lib/feature'
import { UI_TEXT } from '@/lib/text/uiText'
import StartScreen from '@/components/StartScreen'
import type { CreateWorkspaceInputs } from '@/components/StartScreen'
import SpecEditor from '@/components/SpecEditor'
import InterviewPanel from '@/components/InterviewPanel'
import ReferencesPanel from '@/components/ReferencesPanel'

const LOG_TAIL_CHARS = 1500
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

type RelatedEntryMode = 'file' | 'url'

type RelatedEntry = {
  id: string
  mode: RelatedEntryMode
  fileContent: string | null
  fileName: string | null
  url: string
  note: string
}

function emptyRelatedEntry(): RelatedEntry {
  return { id: crypto.randomUUID(), mode: 'file', fileContent: null, fileName: null, url: '', note: '' }
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

async function writeFileToDir(dir: FileSystemDirectoryHandle, name: string, content: string): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

function buildExportConfirmMessage(
  features: Array<{ featureSlug: string; openQuestions: number; skipMarkers: number; markerCounts: Record<string, number> }>,
  markerDefinitions: MarkerDefinitionFile | null,
): string {
  const lines: string[] = [UI_TEXT.export.preflightTitle, '']
  for (const f of features) {
    lines.push(UI_TEXT.export.preflightFeatureHeader(f.featureSlug))
    lines.push(UI_TEXT.export.preflightOpenQuestions(f.openQuestions))
    lines.push(UI_TEXT.export.preflightMarkerItem('skip', f.skipMarkers))
    if (markerDefinitions) {
      for (const [name] of Object.entries(markerDefinitions.markers)) {
        lines.push(UI_TEXT.export.preflightMarkerItem(name, f.markerCounts[name] ?? 0))
      }
    }
  }
  lines.push('')
  lines.push(UI_TEXT.export.preflightWarning)
  lines.push(UI_TEXT.export.preflightPrompt)
  return lines.join('\n')
}

export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
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
  const [saveTarget, setSaveTarget] = useState<WorkspaceSaveTarget | null>(null)
  const [autosaveError, setAutosaveError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [showFeatureCreateForm, setShowFeatureCreateForm] = useState(false)
  const [renamingFeatureId, setRenamingFeatureId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeFeature = workspace?.features.find((f) => f.id === workspace.activeFeatureId) ?? null
  const hasFeatures = (workspace?.features.length ?? 0) > 0
  const hasOpenQuestions = activeFeature?.timeline.some(
    (item) => item.type === 'question' && (item as Question).status === 'open',
  ) ?? false

  useEffect(() => {
    fetch('/pre-spec.markers.json')
      .then((res) => { if (!res.ok) return; return res.json() as Promise<unknown> })
      .then((raw) => {
        if (!raw) return
        try { setMarkerDefinitions(validateMarkerDefinitionFile(raw)) } catch { }
      })
      .catch(() => { })
  }, [])

  useEffect(() => {
    fetch('/pre-spec.skip-reasons.json')
      .then((res) => { if (!res.ok) return; return res.json() as Promise<unknown> })
      .then((raw) => {
        if (!raw) return
        try { setSkipReasonDefinitions(validateSkipReasonDefinitionFile(raw)) } catch { }
      })
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!workspace || !saveTarget) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTarget.write(workspace).catch(() => {
        setAutosaveError(UI_TEXT.app.autosaveError)
      })
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [workspace, saveTarget])

  const updateWorkspace = useCallback((updater: (prev: Workspace) => Workspace) => {
    setWorkspace((prev) => (prev ? updater(prev) : prev))
  }, [])

  const updateActiveFeature = useCallback((updater: (prev: Feature) => Feature) => {
    updateWorkspace((ws) => {
      if (!ws.activeFeatureId) return ws
      return {
        ...ws,
        features: ws.features.map((f) => f.id === ws.activeFeatureId ? updater(f) : f),
      }
    })
  }, [updateWorkspace])

  // ─── Workspace 作成 ───────────────────────────────────────────────────────
  const handleCreateWorkspace = useCallback(
    async (inputs: CreateWorkspaceInputs): Promise<{ ok: true } | { ok: false; error?: string }> => {
      const { slug, relatedSources } = inputs

      let pickedTarget: WorkspaceSaveTarget
      try {
        pickedTarget = await pickSaveTarget(`${slug}${PRE_SPEC_PROJECT_FILE_SUFFIX}`)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return { ok: false }
        return { ok: false, error: UI_TEXT.startScreen.createErrorSaveTarget }
      }

      let globalRefs = ''
      for (const src of relatedSources ?? []) {
        const rawName = src.kind === 'file' ? src.filename : URL_SOURCE_NAME
        const content = src.kind === 'file' ? src.content : src.url
        const source = src.kind === 'file' ? rawName : src.url
        const result = await runRelatedSourceReview(src.kind, rawName, content, src.note)
        if (!result || result.status === 'unreadable' || !result.content) {
          return {
            ok: false,
            error: result?.status === 'unreadable' && result.reason
              ? UI_TEXT.startScreen.createErrorRelatedSourceUnreadable(result.reason)
              : UI_TEXT.startScreen.createErrorRelatedSource,
          }
        }
        const existingNames = extractImportedNames(globalRefs)
        const name = resolveSourceName(existingNames, rawName)
        const block = buildRelatedSourceBlock({ name, source, content: result.content, note: src.note }, buildCheckedAt())
        globalRefs = globalRefs.replace(/\n+$/, '') + (globalRefs ? '\n\n' : '') + block + '\n'
      }

      const ws = createWorkspace(slug, globalRefs)
      try {
        await pickedTarget.write(ws)
      } catch {
        return { ok: false, error: UI_TEXT.startScreen.createErrorSaveTarget }
      }
      setWorkspace(ws)
      setSaveTarget(pickedTarget)
      return { ok: true }
    },
    [],
  )

  const handleOpenWorkspace = useCallback((ws: Workspace, target: WorkspaceSaveTarget) => {
    setWorkspace(ws)
    setSaveTarget(target)
  }, [])

  // ─── Feature 作成 ─────────────────────────────────────────────────────────
  const handleCreateFeature = useCallback(
    async (params: {
      slug: string
      requirementMemo: string
      requirementMemoFilename?: string
      relatedSources?: InitialRelatedSource[]
    }): Promise<{ ok: true } | { ok: false; error?: string }> => {
      if (!workspace || !saveTarget) return { ok: false }

      if (!validateFeatureSlug(params.slug)) return { ok: false, error: UI_TEXT.featurePanel.slugInvalid }
      if (findFeatureBySlug(workspace.features, params.slug)) return { ok: false, error: UI_TEXT.featurePanel.slugDuplicate }

      // Build feature.references from memo + related sources
      let featureRefs = buildInitialRequirementMemoBlock(
        params.requirementMemo,
        buildCheckedAt(),
        params.requirementMemoFilename ?? 'initial.md',
      )

      for (const src of params.relatedSources ?? []) {
        const rawName = src.kind === 'file' ? src.filename : URL_SOURCE_NAME
        const content = src.kind === 'file' ? src.content : src.url
        const source = src.kind === 'file' ? rawName : src.url
        const result = await runRelatedSourceReview(src.kind, rawName, content, src.note)
        if (!result || result.status === 'unreadable' || !result.content) {
          return { ok: false, error: UI_TEXT.featurePanel.createErrorRelatedSource }
        }
        const existingNames = extractImportedNames(featureRefs)
        const name = resolveSourceName(existingNames, rawName)
        const block = buildRelatedSourceBlock({ name, source, content: result.content, note: src.note }, buildCheckedAt())
        featureRefs = featureRefs.replace(/\n+$/, '') + '\n\n' + block + '\n'
      }

      let newFeature = createFeature(params.slug, featureRefs)

      // LLM: initial 質問生成
      const effectiveRefs = buildEffectiveReferencesForFeature(workspace, newFeature)
      let raw: { questions: RawInitialQuestion[] } | null = null
      try {
        const text = await callLLM(
          buildInitialConfirmationQuestionsPrompt({
            requirementMemo: params.requirementMemo,
            referencesMarkdown: effectiveRefs,
            sections: newFeature.sections,
          }),
        )
        raw = extractJSON<{ questions: RawInitialQuestion[] }>(text)
      } catch {
        return { ok: false, error: UI_TEXT.featurePanel.createErrorGeneration }
      }

      if (!Array.isArray(raw?.questions)) {
        return { ok: false, error: UI_TEXT.featurePanel.createErrorGeneration }
      }

      const now = new Date().toISOString()
      const questions: Question[] = raw.questions
        .map((q): Question | null => {
          const section = newFeature.sections.find((s) => s.title === q.sectionTitle)
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
        return { ok: false, error: UI_TEXT.featurePanel.createErrorNoInitialQuestions }
      }

      newFeature = addQuestionsToTimeline(addPhaseMarker(newFeature), questions)

      const updatedWs: Workspace = {
        ...workspace,
        features: sortFeatures([...workspace.features, newFeature]),
        activeFeatureId: newFeature.id,
      }

      try {
        await saveTarget.write(updatedWs)
      } catch {
        return { ok: false, error: UI_TEXT.app.autosaveError }
      }

      setWorkspace(updatedWs)
      return { ok: true }
    },
    [workspace, saveTarget],
  )

  // ─── Feature 選択 ─────────────────────────────────────────────────────────
  const handleSelectFeature = useCallback(
    async (featureId: string) => {
      if (!workspace || !saveTarget || workspace.activeFeatureId === featureId) return
      try {
        await saveTarget.write(workspace)
        setWorkspace(setActiveFeature(workspace, featureId))
      } catch {
        setAutosaveError(UI_TEXT.featurePanel.selectFeatureSaveError)
      }
    },
    [workspace, saveTarget],
  )

  // ─── Feature rename ───────────────────────────────────────────────────────
  const handleRenameFeature = useCallback(
    async (featureId: string, newSlug: string): Promise<{ ok: boolean; error?: string }> => {
      if (!workspace || !saveTarget) return { ok: false }
      if (!validateFeatureSlug(newSlug)) return { ok: false, error: UI_TEXT.featurePanel.slugInvalid }
      if (findFeatureBySlug(workspace.features, newSlug)) return { ok: false, error: UI_TEXT.featurePanel.slugDuplicate }
      const updated = renameFeature(workspace, featureId, newSlug)
      try {
        await saveTarget.write(updated)
        setWorkspace(updated)
        return { ok: true }
      } catch {
        return { ok: false, error: UI_TEXT.app.autosaveError }
      }
    },
    [workspace, saveTarget],
  )

  // ─── Feature 削除 ─────────────────────────────────────────────────────────
  const handleDeleteFeature = useCallback(
    async (featureId: string) => {
      if (!workspace || !saveTarget) return
      const feature = workspace.features.find((f) => f.id === featureId)
      if (!feature) return
      if (!window.confirm(UI_TEXT.featurePanel.deleteConfirm(feature.slug))) return
      const updated = deleteFeature(workspace, featureId)
      try {
        await saveTarget.write(updated)
        setWorkspace(updated)
      } catch {
        setAutosaveError(UI_TEXT.app.autosaveError)
      }
    },
    [workspace, saveTarget],
  )

  // ─── spec 保存 ────────────────────────────────────────────────────────────
  const handleSpecSave = useCallback((newSpec: string) => {
    updateActiveFeature((prev) => {
      const withUpdatedSpec = replaceSpecMarkdownAndRefreshSections(prev, newSpec)
      return addManualEdit(withUpdatedSpec)
    })
  }, [updateActiveFeature])

  // ─── 質問生成 ────────────────────────────────────────────────────────────
  const handleGenerateTimeline = useCallback(async () => {
    if (!workspace || !activeFeature || !activeFeature.currentSectionId || isGeneratingTimeline) return
    const section = activeFeature.sections.find((s) => s.id === activeFeature.currentSectionId)
    if (!section) return

    const existingQuestions = activeFeature.timeline
      .filter((item): item is Question => item.type === 'question' && item.sectionId === activeFeature.currentSectionId)
      .map((q) => q.text)

    setAddQuestionError(false)
    setIsGeneratingTimeline(true)
    try {
      const effectiveRefs = buildEffectiveReferencesForFeature(workspace, activeFeature)
      const markerContexts = extractMarkerContexts(activeFeature.spec, markerDefinitions)
      const text = await callLLM(
        buildQuestionTimelinePrompt({
          sectionTitle: section.title,
          spec: activeFeature.spec,
          referencesMarkdown: effectiveRefs,
          existingQuestions,
          recentTimelineLog: buildRecentLogFromTimeline(activeFeature.timeline, LOG_TAIL_CHARS),
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

      updateActiveFeature((prev) => {
        const withMarker = addSectionMarkerIfNeeded(prev)
        return addQuestionsToTimeline(withMarker, newQuestions)
      })
    } catch {
      setAddQuestionError(true)
    } finally {
      setIsGeneratingTimeline(false)
    }
  }, [workspace, activeFeature, isGeneratingTimeline, updateActiveFeature, markerDefinitions])

  // ─── 回答整形 ────────────────────────────────────────────────────────────
  const handleAnswerQuestion = useCallback(async (questionId: string, answer: string): Promise<boolean> => {
    if (!workspace || !activeFeature) return false
    const questionItem = activeFeature.timeline.find(
      (item): item is Question => item.type === 'question' && item.id === questionId,
    )
    if (!questionItem) return false
    const { sectionTitle, text: questionText, questionType, proposedMarkdown } = questionItem

    setAnswerLLMErrorId(null)

    if (!hasSectionHeading(activeFeature.spec, sectionTitle)) {
      updateActiveFeature((prev) => failQuestion(prev, { questionId, attemptedAnswer: answer }))
      return true
    }

    setFormattingQuestionId(questionId)
    try {
      const effectiveRefs = buildEffectiveReferencesForFeature(workspace, activeFeature)
      const text = await callLLM(
        questionType === 'initial_confirmation'
          ? buildInitialConfirmationAnswerFormatPrompt({
              sectionTitle,
              questionText,
              proposedMarkdown,
              answer,
              currentSpec: activeFeature.spec,
              referencesMarkdown: effectiveRefs,
            })
          : buildAnswerFormatPrompt({
              currentHeading: sectionTitle,
              question: questionText,
              answer,
              currentSpec: activeFeature.spec,
              referencesMarkdown: effectiveRefs,
              recentTimelineLog: buildRecentLogFromTimeline(activeFeature.timeline, LOG_TAIL_CHARS),
            }),
      )
      const formatResult = extractJSON<AnswerFormatResult>(text)
      const specInsertionMarkdown = formatResult?.specInsertionMarkdown
      if (typeof specInsertionMarkdown !== 'string') throw new Error('Invalid format result')

      updateActiveFeature((prev) => {
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
  }, [workspace, activeFeature, updateActiveFeature])

  // ─── スキップ ────────────────────────────────────────────────────────────
  const handleSkipQuestion = useCallback(
    async (questionId: string, reason: string, customText?: string) => {
      if (!workspace || !activeFeature) return
      const questionItem = activeFeature.timeline.find(
        (item): item is Question => item.type === 'question' && item.id === questionId,
      )
      if (!questionItem) return

      const { sectionTitle, text: questionText, proposedMarkdown, aiGuess } = questionItem
      setSkipLLMErrorId(null)

      if (!hasSectionHeading(activeFeature.spec, sectionTitle)) {
        updateActiveFeature((prev) => failQuestion(prev, { questionId, attemptedSkip: { reason, customText } }))
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

      updateActiveFeature((prev) => {
        if (!hasSectionHeading(prev.spec, sectionTitle)) {
          return failQuestion(prev, { questionId, attemptedSkip: { reason, customText } })
        }
        const { feature: withSpec, reflectedMarkdown } = applySkip(prev, { sectionTitle, markerBody, reason })
        return skipQuestion(withSpec, { questionId, skipReason: reason, skipCustomText: isCustom ? customText : undefined, reflectedMarkdown })
      })
    },
    [workspace, activeFeature, updateActiveFeature, skipReasonDefinitions],
  )

  // ─── リトライ ────────────────────────────────────────────────────────────
  const handleRetryQuestion = useCallback(
    async (questionId: string) => {
      if (!workspace || !activeFeature) return
      const questionItem = activeFeature.timeline.find(
        (item): item is Question => item.type === 'question' && item.id === questionId,
      )
      if (!questionItem) return

      setRetryLLMErrorQuestionId(null)
      setRetryingQuestionId(questionId)
      try {
        const effectiveRefs = buildEffectiveReferencesForFeature(workspace, activeFeature)
        const text = await callLLM(
          buildRetryQuestionPrompt({
            sectionTitle: questionItem.sectionTitle,
            originalQuestion: questionItem,
            spec: activeFeature.spec,
            referencesMarkdown: effectiveRefs,
            markerContexts: extractMarkerContexts(activeFeature.spec, markerDefinitions),
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
        updateActiveFeature((prev) => retryQuestion(prev, { questionId, newQuestion }))
      } catch {
        setRetryLLMErrorQuestionId(questionId)
      } finally {
        setRetryingQuestionId(null)
      }
    },
    [workspace, activeFeature, updateActiveFeature, markerDefinitions],
  )

  const handleNext = () => {
    updateActiveFeature((prev) => advanceCurrentSection(prev))
  }

  // ─── References 追加 ──────────────────────────────────────────────────────
  const handleAppendGlobal = useCallback(
    async (kind: RelatedSourceKind, rawName: string, content: string, note?: string): Promise<{ ok: boolean; reason?: string }> => {
      const result = await runRelatedSourceReview(kind, rawName, content, note)
      if (!result) return { ok: false }
      if (result.status === 'unreadable') return { ok: false, reason: result.reason }
      const aiContent = result.content
      if (!aiContent) return { ok: false }

      updateWorkspace((prev) => {
        const existingNames = extractImportedNames(prev.references)
        const name = resolveSourceName(existingNames, rawName)
        const source = kind === 'url' ? content : rawName
        const block = buildRelatedSourceBlock({ name, source, content: aiContent, note }, buildCheckedAt())
        return appendGlobalReference(prev, block)
      })
      return { ok: true }
    },
    [updateWorkspace],
  )

  const handleAppendLocal = useCallback(
    async (kind: RelatedSourceKind, rawName: string, content: string, note?: string): Promise<{ ok: boolean; reason?: string }> => {
      if (!activeFeature) return { ok: false }
      const result = await runRelatedSourceReview(kind, rawName, content, note)
      if (!result) return { ok: false }
      if (result.status === 'unreadable') return { ok: false, reason: result.reason }
      const aiContent = result.content
      if (!aiContent) return { ok: false }

      const featureId = activeFeature.id
      updateWorkspace((prev) => {
        const feature = prev.features.find((f) => f.id === featureId)
        if (!feature) return prev
        const existingNames = extractImportedNames(feature.references)
        const name = resolveSourceName(existingNames, rawName)
        const source = kind === 'url' ? content : rawName
        const block = buildRelatedSourceBlock({ name, source, content: aiContent, note }, buildCheckedAt())
        return appendLocalReference(prev, featureId, block)
      })
      return { ok: true }
    },
    [activeFeature, updateWorkspace],
  )

  // ─── Workspace 出力 ───────────────────────────────────────────────────────
  const handleExportWorkspace = useCallback(async () => {
    if (!workspace || workspace.features.length === 0) return
    setExportError(null)

    const preflightResult = runWorkspacePreflightCheck(workspace, markerDefinitions)
    if (preflightResult.hasWarnings) {
      const message = buildExportConfirmMessage(preflightResult.features, markerDefinitions)
      if (!window.confirm(message)) return
    }

    let dirHandle: FileSystemDirectoryHandle
    try {
      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setExportError(UI_TEXT.export.errorPicker)
      return
    }

    try {
      const specsDir = await dirHandle.getDirectoryHandle('specs', { create: true })
      for (const feature of workspace.features) {
        const featureDir = await specsDir.getDirectoryHandle(feature.slug, { create: true })
        await writeFileToDir(featureDir, 'spec.md', feature.spec)
        await writeFileToDir(featureDir, 'references.md', buildOutputReferencesForFeature(workspace, feature))
        await writeFileToDir(featureDir, 'timeline.md', generateTimelineMarkdown(feature.timeline))
      }
    } catch {
      setExportError(UI_TEXT.export.errorWrite)
    }
  }, [workspace, markerDefinitions])

  // ─── StartScreen ─────────────────────────────────────────────────────────
  if (!workspace) {
    return (
      <StartScreen
        onCreate={handleCreateWorkspace}
        onOpenWorkspace={handleOpenWorkspace}
      />
    )
  }

  const currentSection = activeFeature?.sections.find((s) => s.id === activeFeature.currentSectionId) ?? null
  const effectiveSkipReasons: EffectiveSkipReason[] = getEffectiveSkipReasons(skipReasonDefinitions)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-stone-50">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b border-stone-200">
        <span className="font-semibold text-stone-800 text-sm">{UI_TEXT.app.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { void handleExportWorkspace() }}
            disabled={!hasFeatures}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {UI_TEXT.app.exportButton}
          </button>
        </div>
      </header>

      {/* Autosave / export error banner */}
      {(autosaveError || exportError) && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          <span className="flex-1">{autosaveError ?? exportError}</span>
          <button
            onClick={() => { setAutosaveError(null); setExportError(null) }}
            className="shrink-0 text-red-400 hover:text-red-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column */}
        <div className="flex flex-col w-1/2 min-w-0 border-r border-stone-200">

          {/* Feature 一覧 */}
          <div className="shrink-0 border-b border-stone-200 bg-stone-50 px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-600">
                {UI_TEXT.featurePanel.title}
                <span className="ml-1 text-stone-400 font-normal">{workspace.slug}</span>
              </span>
            </div>

            {workspace.features.length === 0 && (
              <p className="text-xs text-stone-400">{UI_TEXT.featurePanel.noFeatures}</p>
            )}

            {workspace.features.map((feature) => {
              const isActive = feature.id === workspace.activeFeatureId
              const isRenaming = renamingFeatureId === feature.id

              return (
                <div
                  key={feature.id}
                  className={`flex items-center gap-1 text-xs rounded px-1 py-0.5 ${isActive ? 'bg-stone-200' : 'hover:bg-stone-100'}`}
                >
                  {isRenaming ? (
                    <>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => { setRenameValue(e.target.value); setRenameError(null) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { void handleRenameFeature(feature.id, renameValue.trim()).then((r) => { if (r.ok) { setRenamingFeatureId(null) } else { setRenameError(r.error ?? null) } }) }
                          if (e.key === 'Escape') { setRenamingFeatureId(null); setRenameError(null) }
                        }}
                        className="flex-1 border border-stone-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
                      />
                      <button
                        onClick={() => { void handleRenameFeature(feature.id, renameValue.trim()).then((r) => { if (r.ok) { setRenamingFeatureId(null) } else { setRenameError(r.error ?? null) } }) }}
                        className="text-stone-500 hover:text-stone-800 transition-colors"
                        title={UI_TEXT.featurePanel.renameConfirm}
                      >
                        {UI_TEXT.featurePanel.renameConfirm}
                      </button>
                      <button
                        onClick={() => { setRenamingFeatureId(null); setRenameError(null) }}
                        className="text-stone-400 hover:text-stone-700 transition-colors"
                        title={UI_TEXT.featurePanel.renameCancel}
                      >
                        {UI_TEXT.featurePanel.renameCancel}
                      </button>
                      {renameError && <span className="text-red-500 text-xs">{renameError}</span>}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { void handleSelectFeature(feature.id) }}
                        className={`flex-1 text-left text-xs truncate ${isActive ? 'text-stone-800 font-medium' : 'text-stone-600'} cursor-pointer`}
                      >
                        {feature.slug}
                      </button>
                      <button
                        onClick={() => { setRenamingFeatureId(feature.id); setRenameValue(feature.slug); setRenameError(null) }}
                        className="text-stone-400 hover:text-stone-700 transition-colors shrink-0"
                        title={UI_TEXT.featurePanel.renameButton}
                      >
                        {UI_TEXT.featurePanel.renameButton}
                      </button>
                      <button
                        onClick={() => { void handleDeleteFeature(feature.id) }}
                        className="text-stone-400 hover:text-red-600 transition-colors shrink-0"
                        title={UI_TEXT.featurePanel.deleteButton}
                      >
                        {UI_TEXT.featurePanel.deleteButton}
                      </button>
                    </>
                  )}
                </div>
              )
            })}

            {/* Feature 作成フォーム */}
            {showFeatureCreateForm ? (
              <FeatureCreateForm
                workspace={workspace}
                onCreate={async (params) => {
                  const result = await handleCreateFeature(params)
                  if (result.ok) setShowFeatureCreateForm(false)
                  return result
                }}
                onCancel={() => setShowFeatureCreateForm(false)}
              />
            ) : (
              <button
                onClick={() => setShowFeatureCreateForm(true)}
                className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
              >
                {UI_TEXT.featurePanel.addButton}
              </button>
            )}
          </div>

          {/* spec editor */}
          <div className="flex-[2] min-h-0 overflow-hidden">
            <SpecEditor
              value={activeFeature?.spec ?? ''}
              onSave={handleSpecSave}
              disabled={!activeFeature}
            />
          </div>

          {/* References */}
          <div className="flex-1 min-h-0 border-t border-stone-200 overflow-hidden">
            <ReferencesPanel
              globalReferences={workspace.references}
              localReferences={activeFeature?.references ?? ''}
              onAppendGlobal={handleAppendGlobal}
              onAppendLocal={handleAppendLocal}
              localDisabled={!activeFeature}
            />
          </div>
        </div>

        {/* Right column: interview panel */}
        <div className="flex flex-col w-1/2 min-w-0 overflow-hidden">
          <InterviewPanel
            currentSection={currentSection}
            timeline={activeFeature?.timeline ?? []}
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
            disabled={!activeFeature}
            nextDisabled={hasOpenQuestions}
            addQuestionsDisabled={hasOpenQuestions}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Feature 作成フォーム（インライン）────────────────────────────────────────
function FeatureCreateForm({
  workspace,
  onCreate,
  onCancel,
}: {
  workspace: Workspace
  onCreate: (params: {
    slug: string
    requirementMemo: string
    requirementMemoFilename?: string
    relatedSources?: InitialRelatedSource[]
  }) => Promise<{ ok: true } | { ok: false; error?: string }>
  onCancel: () => void
}) {
  const [slug, setSlug] = useState('')
  const [requirementMemoContent, setRequirementMemoContent] = useState<string | null>(null)
  const [requirementMemoFilename, setRequirementMemoFilename] = useState<string | null>(null)
  const [relatedEntries, setRelatedEntries] = useState<RelatedEntry[]>([])
  const [slugError, setSlugError] = useState<string | null>(null)
  const [memoError, setMemoError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const requirementMemoFileInputRef = useRef<HTMLInputElement>(null)

  const handleMemoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      if (!text.trim()) {
        setMemoError(UI_TEXT.file.emptyFile(file.name))
        return
      }
      setRequirementMemoContent(text)
      setRequirementMemoFilename(file.name)
      setMemoError(null)
    } catch {
      setMemoError(UI_TEXT.featurePanel.requirementMemoReadError)
    }
  }

  const handleAddRelated = () => setRelatedEntries((prev) => [...prev, emptyRelatedEntry()])
  const handleChangeRelated = (id: string, patch: Partial<RelatedEntry>) =>
    setRelatedEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const handleRemoveRelated = (id: string) =>
    setRelatedEntries((prev) => prev.filter((e) => e.id !== id))

  const handleSubmit = async () => {
    const trimmedSlug = slug.trim()
    if (!trimmedSlug) { setSlugError(UI_TEXT.featurePanel.slugRequired); return }
    if (!validateFeatureSlug(trimmedSlug)) { setSlugError(UI_TEXT.featurePanel.slugInvalid); return }
    if (findFeatureBySlug(workspace.features, trimmedSlug)) { setSlugError(UI_TEXT.featurePanel.slugDuplicate); return }
    if (!requirementMemoContent?.trim()) { setMemoError(UI_TEXT.featurePanel.requirementMemoRequired); return }

    setSlugError(null)
    setMemoError(null)
    setCreateError(null)
    setIsCreating(true)
    try {
      const relatedSources: InitialRelatedSource[] = relatedEntries.flatMap((entry): InitialRelatedSource[] => {
        if (entry.mode === 'file' && entry.fileContent && entry.fileName) {
          return [{ kind: 'file', filename: entry.fileName, content: entry.fileContent, note: entry.note || undefined }]
        }
        if (entry.mode === 'url' && entry.url.trim()) {
          return [{ kind: 'url', url: entry.url.trim(), note: entry.note || undefined }]
        }
        return []
      })
      const result = await onCreate({
        slug: trimmedSlug,
        requirementMemo: requirementMemoContent,
        requirementMemoFilename: requirementMemoFilename ?? undefined,
        relatedSources: relatedSources.length > 0 ? relatedSources : undefined,
      })
      if (!result.ok && result.error) setCreateError(result.error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="border border-stone-300 rounded p-2 space-y-2 bg-white mt-1">
      <fieldset disabled={isCreating} className="border-0 p-0 m-0 min-w-0 space-y-2">
        {/* slug */}
        <div>
          <input
            type="text"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugError(null) }}
            placeholder={UI_TEXT.featurePanel.slugPlaceholder}
            className="w-full border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-50"
          />
          {slugError && <p className="text-xs text-red-600 mt-0.5">{slugError}</p>}
        </div>

        {/* 要件メモ */}
        <div>
          <input
            ref={requirementMemoFileInputRef}
            type="file"
            accept=".md,.txt"
            onChange={(e) => { void handleMemoFileChange(e) }}
            className="hidden"
          />
          {requirementMemoFilename ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-stone-500 truncate flex-1">
                {UI_TEXT.featurePanel.requirementMemoFileSelected(requirementMemoFilename)}
              </span>
              <button
                onClick={() => { setRequirementMemoContent(null); setRequirementMemoFilename(null) }}
                className="text-xs text-stone-400 hover:text-stone-700 shrink-0"
              >
                {UI_TEXT.featurePanel.relatedRemoveButton}
              </button>
            </div>
          ) : (
            <button
              onClick={() => requirementMemoFileInputRef.current?.click()}
              className="text-xs px-2 py-1 border border-stone-300 text-stone-600 rounded hover:bg-stone-50"
            >
              {UI_TEXT.featurePanel.requirementMemoLabel} {UI_TEXT.featurePanel.requirementMemoFileButton}
            </button>
          )}
          {memoError && <p className="text-xs text-red-600 mt-0.5">{memoError}</p>}
        </div>

        {/* 関連資料 */}
        <div className="space-y-1">
          {relatedEntries.map((entry) => (
            <FeatureRelatedRow
              key={entry.id}
              entry={entry}
              onChange={handleChangeRelated}
              onRemove={handleRemoveRelated}
            />
          ))}
          <button
            onClick={handleAddRelated}
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            {UI_TEXT.featurePanel.relatedAddButton}
          </button>
        </div>
      </fieldset>

      <div className="flex gap-1 items-center">
        <button
          onClick={() => { void handleSubmit() }}
          disabled={isCreating}
          className="text-xs px-2 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? UI_TEXT.featurePanel.createButtonLoading : UI_TEXT.featurePanel.createButton}
        </button>
        <button
          onClick={onCancel}
          disabled={isCreating}
          className="text-xs px-2 py-1 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 disabled:opacity-40"
        >
          {UI_TEXT.featurePanel.cancelButton}
        </button>
        {createError && <span className="text-xs text-red-600">{createError}</span>}
      </div>
    </div>
  )
}

function FeatureRelatedRow({
  entry,
  onChange,
  onRemove,
}: {
  entry: RelatedEntry
  onChange: (id: string, patch: Partial<RelatedEntry>) => void
  onRemove: (id: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileReadError, setFileReadError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const content = await file.text()
      if (!content.trim()) { setFileReadError(UI_TEXT.file.emptyFile(file.name)); return }
      onChange(entry.id, { fileContent: content, fileName: file.name })
      setFileReadError(null)
    } catch {
      setFileReadError(UI_TEXT.featurePanel.relatedFileReadError)
    }
  }

  return (
    <div className="border border-stone-200 rounded p-2 space-y-1">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(entry.id, { mode: 'file' })}
          className={`text-xs px-1.5 py-0.5 rounded ${entry.mode === 'file' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          {UI_TEXT.featurePanel.relatedFileMode}
        </button>
        <button
          onClick={() => onChange(entry.id, { mode: 'url' })}
          className={`text-xs px-1.5 py-0.5 rounded ${entry.mode === 'url' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          {UI_TEXT.featurePanel.relatedUrlMode}
        </button>
        <button onClick={() => onRemove(entry.id)} className="ml-auto text-xs text-stone-400 hover:text-stone-700">
          {UI_TEXT.featurePanel.relatedRemoveButton}
        </button>
      </div>

      {entry.mode === 'file' && (
        <>
          <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={(e) => { void handleFileChange(e) }} className="hidden" />
          {entry.fileName ? (
            <p className="text-xs text-stone-500">{UI_TEXT.featurePanel.relatedFileSelected(entry.fileName)}</p>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="text-xs px-2 py-0.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50">
              {UI_TEXT.featurePanel.relatedFileButton}
            </button>
          )}
          {fileReadError && <p className="text-xs text-red-600">{fileReadError}</p>}
        </>
      )}

      {entry.mode === 'url' && (
        <input
          type="text"
          value={entry.url}
          onChange={(e) => onChange(entry.id, { url: e.target.value })}
          placeholder={UI_TEXT.featurePanel.relatedUrlPlaceholder}
          className="w-full text-xs px-2 py-0.5 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
        />
      )}

      <textarea
        value={entry.note}
        onChange={(e) => onChange(entry.id, { note: e.target.value })}
        placeholder={UI_TEXT.featurePanel.relatedNotePlaceholder}
        rows={1}
        className="w-full text-xs px-2 py-0.5 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
      />
    </div>
  )
}
