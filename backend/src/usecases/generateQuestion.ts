import type { Question, Workspace } from '@/src/types'
import { buildEffectiveReferencesForFeature } from '@/src/domain/references/references'
import { buildTimelineContext, addSectionMarkerIfNeeded, addQuestionsToTimeline } from '@/src/domain/timeline/timelines'
import { extractMarkerContexts } from '@/src/domain/markers/markers'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { loadMarkerDefinitions } from '@/src/config/loadConfig'
import { callLLM } from '@/src/infrastructure/llm/anthropicClient'
import { extractJSON } from '@/src/infrastructure/llm/extractJSON'
import { buildQuestionTimelinePrompt } from '@/src/infrastructure/llm/prompt-builders/sectionQuestionPrompt'
import { ERROR_TEXT } from '@/src/text/errorText'
import { v4 as uuidv4 } from 'uuid'

type RawQuestion = {
  text: string
  kinds?: string[]
  priority?: string
  aiGuess?: { value: string; rationale: string }
}

export async function generateQuestion(params: {
  workspaceSlug: string
}): Promise<{ workspace: Workspace }> {
  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const featureId = workspace.activeFeatureId
  if (!featureId) throw new Error(ERROR_TEXT.featureNotFound)

  let feature = workspace.features.find((f) => f.id === featureId)
  if (!feature) throw new Error(ERROR_TEXT.featureNotFound)

  const section = feature.sections.find((s) => s.id === feature!.currentSectionId)
  if (!section) throw new Error('セクションが見つかりません')

  feature = addSectionMarkerIfNeeded(feature)

  const effectiveRefs = buildEffectiveReferencesForFeature(workspace, feature)
  const timelineContext = buildTimelineContext(feature.timeline)
  const markerDefinitions = loadMarkerDefinitions()
  const markerContexts = extractMarkerContexts(feature.spec, markerDefinitions)

  const existingQuestions = feature.timeline
    .filter((item): item is Question => item.type === 'question' && item.status === 'open')
    .map((q) => q.text)

  const prompt = buildQuestionTimelinePrompt({
    sectionTitle: section.title,
    spec: feature.spec,
    referencesMarkdown: effectiveRefs,
    existingQuestions,
    timelineContext,
    markerContexts,
  })

  const text = await callLLM(prompt)
  const result = extractJSON<{ questions: RawQuestion[] }>(text)

  if (!result?.questions?.length) {
    const ws = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
    await saveWorkspace(ws)
    return { workspace: ws }
  }

  const now = new Date().toISOString()
  const questions: Question[] = result.questions.map((q) => ({
    id: uuidv4(),
    type: 'question' as const,
    questionType: 'section_question' as const,
    sectionId: section.id,
    sectionTitle: section.title,
    text: q.text,
    kinds: q.kinds as Question['kinds'],
    priority: q.priority as Question['priority'],
    aiGuess: q.aiGuess,
    status: 'open' as const,
    createdAt: now,
    updatedAt: now,
  }))

  feature = addQuestionsToTimeline(feature, questions)
  const updated = { ...workspace, features: workspace.features.map((f) => (f.id === feature!.id ? feature! : f)) }
  await saveWorkspace(updated)
  return { workspace: updated }
}
