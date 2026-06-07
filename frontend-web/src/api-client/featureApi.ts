import { apiPost } from './backendUrl'
import type { Workspace } from '@/workbench/workbenchState'

type FeatureResponse = { workspace: Workspace }

type RawRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

export async function createFeature(
  workspaceSlug: string,
  featureSlug: string,
  relatedSources: RawRelatedSource[],
): Promise<FeatureResponse> {
  return apiPost('/api/features/create', { workspaceSlug, featureSlug, relatedSources })
}

export async function selectFeature(
  workspaceSlug: string,
  featureId: string,
): Promise<FeatureResponse> {
  return apiPost('/api/features/select', { workspaceSlug, featureId })
}

export async function renameFeature(
  workspaceSlug: string,
  featureId: string,
  newSlug: string,
): Promise<FeatureResponse> {
  return apiPost('/api/features/rename', { workspaceSlug, featureId, newSlug })
}

export async function deleteFeature(
  workspaceSlug: string,
  featureId: string,
): Promise<FeatureResponse> {
  return apiPost('/api/features/delete', { workspaceSlug, featureId })
}
