import type { Question, Workspace } from '@/src/types'
import { buildEffectiveReferencesForFeature } from '@/src/domain/references/references'
import { buildTimelineContext, skipQuestion, failQuestion } from '@/src/domain/timeline/timelines'
import { applySkip } from '@/src/domain/spec/specPatch'
import { hasSectionHeading } from '@/src/domain/spec/markdown'
import { loadSkipReasonDefinitions } from '@/src/config/loadConfig'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { callLLM } from '@/src/infrastructure/llm/anthropicClient'
import { extractJSON } from '@/src/infrastructure/llm/extractJSON'
import { buildSkipMarkerBodyPrompt } from '@/src/infrastructure/llm/prompt-builders/skipPrompt'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function skipQuestionUsecase(params: {
  workspaceSlug: string
  questionId: string
  skipReason: string
  skipCustomText?: string
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

  if (!hasSectionHeading(feature.spec, question.sectionTitle)) {
    feature = failQuestion(feature, {
      questionId: params.questionId,
      attemptedSkip: { reason: params.skipReason, customText: params.skipCustomText },
    })
    const updated = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
    await saveWorkspace(updated)
    return { workspace: updated }
  }

  const skipReasonDefs = loadSkipReasonDefinitions()
  const reasonDef = skipReasonDefs.skipReasons[params.skipReason]
  const skipInstruction = params.skipReason === 'custom'
    ? params.skipCustomText ?? 'スキップ'
    : reasonDef?.instruction ?? params.skipReason

  const effectiveRefs = buildEffectiveReferencesForFeature(workspace, feature)
  const timelineContext = buildTimelineContext(feature.timeline)

  const prompt = buildSkipMarkerBodyPrompt({
    sectionTitle: question.sectionTitle,
    questionText: question.text,
    proposedMarkdown: question.proposedMarkdown,
    aiGuess: question.aiGuess,
    skipReason: params.skipReason,
    skipInstruction,
    spec: feature.spec,
    referencesMarkdown: effectiveRefs,
    timelineContext,
  })

  const text = await callLLM(prompt)
  const result = extractJSON<{ markerBody: string }>(text)
  const markerBody = result?.markerBody ?? question.text

  const { feature: patchedFeature, reflectedMarkdown } = applySkip(feature, {
    sectionTitle: question.sectionTitle,
    markerBody,
    reason: params.skipReason,
  })
  feature = patchedFeature

  feature = skipQuestion(feature, {
    questionId: params.questionId,
    skipReason: params.skipReason,
    skipCustomText: params.skipCustomText,
    reflectedMarkdown,
  })

  const updated = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
  await saveWorkspace(updated)
  return { workspace: updated }
}
