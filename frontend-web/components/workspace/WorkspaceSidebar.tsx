'use client'

import type { Workspace, PublicConfig } from '@/workbench/workbenchState'
import { FeatureList } from './FeatureList'
import { ReferencesPanel } from '@/components/references/ReferencesPanel'

type RawRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

type Props = {
  workspace: Workspace
  config: PublicConfig | null
  isCreatingFeature: boolean
  onCreateFeature: (featureSlug: string, relatedSources: RawRelatedSource[]) => void
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
  config,
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
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Features</p>
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

      <div className="border-t border-stone-200 overflow-y-auto" style={{ maxHeight: '50%' }}>
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
