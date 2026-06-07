import type { Question, Workspace } from '@/src/types'
import { buildEffectiveReferencesForFeature } from '@/src/domain/references/references'
import { buildTimelineContext, retryQuestion } from '@/src/domain/timeline/timelines'
import { extractMarkerContexts } from '@/src/domain/markers/markers'
import { loadMarkerDefinitions } from '@/src/config/loadConfig'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { callLLM } from '@/src/infrastructure/llm/anthropicClient'
import { extractJSON } from '@/src/infrastructure/llm/extractJSON'
import { buildRetryQuestionPrompt, type RetryQuestionResult } from '@/src/infrastructure/llm/prompt-builders/retryPrompt'
import { ERROR_TEXT } from '@/src/text/errorText'
import { v4 as uuidv4 } from 'uuid'

export async function retryQuestionUsecase(params: {
  workspaceSlug: string
  questionId: string
}): Promise<{ workspace: Workspace }> {
  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const featureId = workspace.activeFeatureId
  if (!featureId) throw new Error(ERROR_TEXT.featureNotFound)

  let feature = workspace.features.find((f) => f.id === featureId)
  if (!feature) throw new Error(ERROR_TEXT.featureNotFound)

  const question = feature.timeline.find(
    (item): item is Question => item.type === 'question' && item.id === params.questionId,
  )
  if (!question) throw new Error(ERROR_TEXT.questionNotFound)

  const effectiveRefs = buildEffectiveReferencesForFeature(workspace, feature)
  const timelineContext = buildTimelineContext(feature.timeline)
  const markerDefinitions = loadMarkerDefinitions()
  const markerContexts = extractMarkerContexts(feature.spec, markerDefinitions)

  const prompt = buildRetryQuestionPrompt({
    sectionTitle: question.sectionTitle,
    originalQuestion: question,
    spec: feature.spec,
    referencesMarkdown: effectiveRefs,
    timelineContext,
    markerContexts,
  })

  const text = await callLLM(prompt)
  const result = extractJSON<RetryQuestionResult>(text)

  if (!result) {
    const updated = { ...workspace }
    return { workspace: updated }
  }

  const now = new Date().toISOString()
  const newQuestion: Question = {
    id: uuidv4(),
    type: 'question' as const,
    questionType: question.questionType,
    sectionId: question.sectionId,
    sectionTitle: question.sectionTitle,
    text: result.text,
    kinds: result.kinds as Question['kinds'],
    priority: result.priority as Question['priority'],
    aiGuess: result.aiGuess,
    proposedMarkdown: result.proposedMarkdown,
    status: 'open' as const,
    createdAt: now,
    updatedAt: now,
  }

  feature = retryQuestion(feature, { questionId: params.questionId, newQuestion })
  const updated = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
  await saveWorkspace(updated)
  return { workspace: updated }
}
