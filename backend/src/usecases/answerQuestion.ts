import type { Question, Workspace } from '@/src/types'
import { buildEffectiveReferencesForFeature } from '@/src/domain/references/references'
import { buildTimelineContext, answerQuestion, failQuestion } from '@/src/domain/timeline/timelines'
import { applyFormattedAnswer } from '@/src/domain/spec/specPatch'
import { hasSectionHeading } from '@/src/domain/spec/markdown'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { callLLM } from '@/src/infrastructure/llm/anthropicClient'
import { extractJSON } from '@/src/infrastructure/llm/extractJSON'
import { buildAnswerFormatPrompt, buildInitialConfirmationAnswerFormatPrompt } from '@/src/infrastructure/llm/prompt-builders/answerPrompt'
import { ERROR_TEXT } from '@/src/text/errorText'
import type { AnswerFormatResult } from '@/src/types'

export async function answerQuestionUsecase(params: {
  workspaceSlug: string
  questionId: string
  answer: string
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
    feature = failQuestion(feature, { questionId: params.questionId, attemptedAnswer: params.answer })
    const updated = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
    await saveWorkspace(updated)
    return { workspace: updated }
  }

  const effectiveRefs = buildEffectiveReferencesForFeature(workspace, feature)
  const timelineContext = buildTimelineContext(feature.timeline)

  let formatText: string
  if (question.questionType === 'initial_confirmation') {
    const prompt = buildInitialConfirmationAnswerFormatPrompt({
      sectionTitle: question.sectionTitle,
      questionText: question.text,
      proposedMarkdown: question.proposedMarkdown,
      answer: params.answer,
      currentSpec: feature.spec,
      referencesMarkdown: effectiveRefs,
      timelineContext,
    })
    formatText = await callLLM(prompt)
  } else {
    const prompt = buildAnswerFormatPrompt({
      currentHeading: question.sectionTitle,
      question: question.text,
      answer: params.answer,
      currentSpec: feature.spec,
      referencesMarkdown: effectiveRefs,
      timelineContext,
    })
    formatText = await callLLM(prompt)
  }

  const formatResult = extractJSON<AnswerFormatResult>(formatText)
  if (!formatResult) {
    feature = failQuestion(feature, { questionId: params.questionId, attemptedAnswer: params.answer })
    const updated = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
    await saveWorkspace(updated)
    return { workspace: updated }
  }

  if (formatResult.specInsertionMarkdown.trim()) {
    try {
      feature = applyFormattedAnswer(feature, { sectionTitle: question.sectionTitle, formatResult })
    } catch {
      feature = failQuestion(feature, { questionId: params.questionId, attemptedAnswer: params.answer })
      const updated = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
      await saveWorkspace(updated)
      return { workspace: updated }
    }
  }

  feature = answerQuestion(feature, {
    questionId: params.questionId,
    answer: params.answer,
    reflectedMarkdown: formatResult.specInsertionMarkdown.trim() || undefined,
  })

  const updated = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
  await saveWorkspace(updated)
  return { workspace: updated }
}
