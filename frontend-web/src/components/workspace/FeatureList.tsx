'use client'

import { useState } from 'react'
import type { Feature } from '@/workbench/workbenchState'
import { UI_TEXT } from '@/text/uiText'

type RawRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

type Props = {
  features: Feature[]
  activeFeatureId?: string
  isCreatingFeature: boolean
  onSelectFeature: (featureId: string) => void
  onCreateFeature: (featureSlug: string, relatedSources: RawRelatedSource[]) => void
  onRenameFeature: (featureId: string, newSlug: string) => void
  onDeleteFeature: (featureId: string) => void
}

export function FeatureList({
  features,
  activeFeatureId,
  isCreatingFeature,
  onSelectFeature,
  onCreateFeature,
  onRenameFeature,
  onDeleteFeature,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleCreate = () => {
    if (!newSlug.trim()) {
      setSlugError(UI_TEXT.featurePanel.slugRequired)
      return
    }
    if (features.some((f) => f.slug === newSlug.trim())) {
      setSlugError(UI_TEXT.featurePanel.slugDuplicate)
      return
    }
    setSlugError('')
    onCreateFeature(newSlug.trim(), [])
    setNewSlug('')
    setShowForm(false)
  }

  const startRename = (feature: Feature) => {
    setRenamingId(feature.id)
    setRenameValue(feature.slug)
  }

  const confirmRename = (featureId: string) => {
    if (renameValue.trim()) {
      onRenameFeature(featureId, renameValue.trim())
    }
    setRenamingId(null)
  }

  const handleDelete = (feature: Feature) => {
    if (window.confirm(UI_TEXT.featurePanel.deleteConfirm(feature.slug))) {
      onDeleteFeature(feature.id)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {features.map((feature) => (
        <div
          key={feature.id}
          className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer group ${
            feature.id === activeFeatureId
              ? 'bg-stone-200 text-stone-900'
              : 'hover:bg-stone-100 text-stone-700'
          }`}
          onClick={() => onSelectFeature(feature.id)}
        >
          {renamingId === feature.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename(feature.id)
                if (e.key === 'Escape') setRenamingId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 border border-stone-300 rounded px-1 py-0.5 text-sm focus:outline-none"
            />
          ) : (
            <span className="flex-1 text-sm truncate">{feature.slug}</span>
          )}

          <div className="hidden group-hover:flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            {renamingId === feature.id ? (
              <>
                <button onClick={() => confirmRename(feature.id)} className="text-xs text-stone-500 hover:text-stone-800 px-1">
                  {UI_TEXT.featurePanel.renameConfirm}
                </button>
                <button onClick={() => setRenamingId(null)} className="text-xs text-stone-400 hover:text-stone-600 px-1">
                  {UI_TEXT.featurePanel.renameCancel}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => startRename(feature)} className="text-xs text-stone-400 hover:text-stone-600 px-1">
                  {UI_TEXT.featurePanel.renameButton}
                </button>
                <button onClick={() => handleDelete(feature)} className="text-xs text-stone-400 hover:text-red-600 px-1">
                  {UI_TEXT.featurePanel.deleteButton}
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="mt-2 flex flex-col gap-1">
          <input
            autoFocus
            type="text"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setShowForm(false)
            }}
            placeholder={UI_TEXT.featurePanel.slugPlaceholder}
            className="border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none"
          />
          {slugError && <p className="text-red-600 text-xs">{slugError}</p>}
          <div className="flex gap-1">
            <button
              onClick={handleCreate}
              disabled={isCreatingFeature}
              className="flex-1 py-1 text-xs rounded bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {isCreatingFeature ? UI_TEXT.featurePanel.createButtonLoading : UI_TEXT.featurePanel.createButton}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-1 text-xs rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
            >
              {UI_TEXT.featurePanel.cancelButton}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-1 text-left text-sm text-stone-400 hover:text-stone-600 px-2 py-1"
        >
          {UI_TEXT.featurePanel.addButton}
        </button>
      )}
    </div>
  )
}
