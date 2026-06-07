'use client'

import type { Workspace } from '@/workbench/workbenchState'
import { FeatureList } from './FeatureList'
import { ReferencesPanel } from '@/components/references/ReferencesPanel'

type RawRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

type CreateFeatureParams = {
  featureSlug: string
  requirementMemo: string
  requirementMemoFilename?: string
  relatedSources: RawRelatedSource[]
}

type Props = {
  workspace: Workspace
  isCreatingFeature: boolean
  onCreateFeature: (params: CreateFeatureParams) => void
  onSelectFeature: (featureId: string) => void
  onRenameFeature: (featureId: string, newSlug: string) => void
  onDeleteFeature: (featureId: string) => void
  onAddReference: (params: {
    featureId?: string
    kind: 'file' | 'url'
    name: string
    content: string
    note?: string
  }) => void
}

export function WorkspaceSidebar({
  workspace,
  isCreatingFeature,
  onCreateFeature,
  onSelectFeature,
  onRenameFeature,
  onDeleteFeature,
  onAddReference,
}: Props) {
  const activeFeature = workspace.features.find((f) => f.id === workspace.activeFeatureId)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col border-b border-stone-200">
        <div className="flex items-center gap-2 px-3 border-b border-stone-200 bg-stone-50 shrink-0 h-10">
          <span className="text-xs font-medium text-stone-500">Workspace</span>
          <span className="text-xs font-bold text-stone-800">{workspace.slug}</span>
        </div>
        <div className="flex-1 min-h-0 px-3 py-2 space-y-1 overflow-y-auto">
          <FeatureList
            features={workspace.features}
            activeFeatureId={workspace.activeFeatureId}
            isCreatingFeature={isCreatingFeature}
            onSelectFeature={onSelectFeature}
            onCreateFeature={onCreateFeature}
            onRenameFeature={onRenameFeature}
            onDeleteFeature={onDeleteFeature}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ReferencesPanel
          globalReferences={workspace.references}
          localReferences={activeFeature?.references ?? ''}
          activeFeatureId={workspace.activeFeatureId}
          onAddReference={onAddReference}
        />
      </div>
    </div>
  )
}
