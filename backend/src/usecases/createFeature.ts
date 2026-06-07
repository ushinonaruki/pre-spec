import type { Workspace } from '@/src/types'
import { validateFeatureSlug, createFeature, sortFeatures, setActiveFeature } from '@/src/domain/feature/feature'
import { appendLocalReference } from '@/src/domain/references/references'
import { buildReferenceBlock } from '@/src/domain/references/references'
import { extractImportIds } from '@/src/domain/references/references'
import { addPhaseMarker, addQuestionsToTimeline } from '@/src/domain/timeline/timelines'
import { buildEffectiveReferencesForFeature } from '@/src/domain/references/references'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { callLLM } from '@/src/infrastructure/llm/anthropicClient'
import { extractJSON } from '@/src/infrastructure/llm/extractJSON'
import { buildInitialConfirmationQuestionsPrompt } from '@/src/infrastructure/llm/prompt-builders/initialQuestionPrompt'
import { generateImportId } from '@/src/infrastructure/clock/clock'
import { ERROR_TEXT } from '@/src/text/errorText'
import type { RelatedSourceKind, Question } from '@/src/types'
import { buildRelatedSourceReviewPrompt, type RelatedSourceReviewResult } from '@/src/infrastructure/llm/prompt-builders/referenceReviewPrompt'
import { v4 as uuidv4 } from 'uuid'

type RawRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

type InitialQuestion = {
  sectionTitle: string
  text: string
  kinds?: string[]
  priority?: string
  proposedMarkdown?: string
}

export async function createFeatureUsecase(params: {
  workspaceSlug: string
  featureSlug: string
  relatedSources: RawRelatedSource[]
}): Promise<{ workspace: Workspace }> {
  if (!validateFeatureSlug(params.featureSlug)) {
    throw new Error(ERROR_TEXT.featureSlugRequired)
  }

  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  let feature = createFeature(params.featureSlug, '')
  feature = addPhaseMarker(feature)

  let ws = { ...workspace, features: sortFeatures([...workspace.features, feature]) }
  ws = setActiveFeature(ws, feature.id)

  const existingIds = extractImportIds(feature.references)

  for (const src of params.relatedSources) {
    const name = src.kind === 'file' ? src.filename : src.url
    const content = src.kind === 'file' ? src.content : src.url
    const kind: RelatedSourceKind = src.kind

    const reviewPrompt = buildRelatedSourceReviewPrompt({ name, kind, content, note: src.note })
    const reviewText = await callLLM(reviewPrompt, { enableWebFetch: kind === 'url' })
    const reviewResult = extractJSON<RelatedSourceReviewResult>(reviewText)

    if (reviewResult?.status !== 'ok') continue

    const importId = generateImportId(existingIds)
    existingIds.push(importId)

    const source = kind === 'url' ? (src as { url: string }).url : (src as { filename: string }).filename
    const block = buildReferenceBlock({
      importId,
      source,
      note: src.note,
      content: reviewResult.content ?? '',
    })

    const featureIdx = ws.features.findIndex((f) => f.id === feature.id)
    if (featureIdx !== -1) {
      ws = appendLocalReference(ws, feature.id, block)
      feature = ws.features[featureIdx]
    }
  }

  const featureIdx = ws.features.findIndex((f) => f.id === feature.id)
  if (featureIdx !== -1) feature = ws.features[featureIdx]

  const effectiveRefs = buildEffectiveReferencesForFeature(ws, feature)
  const questionsPrompt = buildInitialConfirmationQuestionsPrompt({
    referencesMarkdown: effectiveRefs,
    spec: feature.spec,
    sections: feature.sections,
  })
  const questionsText = await callLLM(questionsPrompt)
  const questionsResult = extractJSON<{ questions: InitialQuestion[] }>(questionsText)

  if (questionsResult?.questions?.length) {
    const now = new Date().toISOString()
    const questions: Question[] = questionsResult.questions
      .filter((q) => feature.sections.some((s) => s.title === q.sectionTitle))
      .map((q) => {
        const section = feature.sections.find((s) => s.title === q.sectionTitle)!
        return {
          id: uuidv4(),
          type: 'question' as const,
          questionType: 'initial_confirmation' as const,
          sectionId: section.id,
          sectionTitle: section.title,
          text: q.text,
          kinds: q.kinds as Question['kinds'],
          priority: q.priority as Question['priority'],
          proposedMarkdown: q.proposedMarkdown,
          status: 'open' as const,
          createdAt: now,
          updatedAt: now,
        }
      })
    feature = addQuestionsToTimeline(feature, questions)
    ws = {
      ...ws,
      features: ws.features.map((f) => (f.id === feature.id ? feature : f)),
    }
  }

  await saveWorkspace(ws)
  return { workspace: ws }
}
