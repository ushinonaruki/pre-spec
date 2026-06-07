import type { RelatedSourceKind, Workspace } from '@/src/types'
import { appendGlobalReference, appendLocalReference, buildReferenceBlock, extractImportIds } from '@/src/domain/references/references'
import { loadWorkspace, saveWorkspace } from '@/src/infrastructure/storage/workspaceStorage'
import { callLLM } from '@/src/infrastructure/llm/anthropicClient'
import { extractJSON } from '@/src/infrastructure/llm/extractJSON'
import { buildRelatedSourceReviewPrompt, type RelatedSourceReviewResult } from '@/src/infrastructure/llm/prompt-builders/referenceReviewPrompt'
import { generateImportId } from '@/src/infrastructure/clock/clock'
import { ERROR_TEXT } from '@/src/text/errorText'

export async function addReference(params: {
  workspaceSlug: string
  featureId?: string
  kind: RelatedSourceKind
  name: string
  content: string
  note?: string
}): Promise<{ workspace: Workspace; status: 'ok' | 'unreadable'; reason?: string }> {
  const workspace = await loadWorkspace(params.workspaceSlug)
  if (!workspace) throw new Error(ERROR_TEXT.workspaceNotFound)

  const reviewPrompt = buildRelatedSourceReviewPrompt({
    name: params.name,
    kind: params.kind,
    content: params.content,
    note: params.note,
  })
  const reviewText = await callLLM(reviewPrompt, { enableWebFetch: params.kind === 'url' })
  const reviewResult = extractJSON<RelatedSourceReviewResult>(reviewText)

  if (reviewResult?.status !== 'ok') {
    return { workspace, status: 'unreadable', reason: reviewResult?.reason }
  }

  const existingIds = params.featureId
    ? extractImportIds(workspace.features.find((f) => f.id === params.featureId)?.references ?? '')
    : extractImportIds(workspace.references)

  const importId = generateImportId(existingIds)
  const block = buildReferenceBlock({
    importId,
    source: params.name,
    note: params.note,
    content: reviewResult.content ?? '',
  })

  const updated = params.featureId
    ? appendLocalReference(workspace, params.featureId, block)
    : appendGlobalReference(workspace, block)

  await saveWorkspace(updated)
  return { workspace: updated, status: 'ok' }
}
