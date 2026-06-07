'use client'

import { useEffect, useRef, useState } from 'react'
import type { Feature } from '@/workbench/workbenchState'
import { UI_TEXT } from '@/text/uiText'

type RelatedEntryMode = 'file' | 'url'

type RelatedEntry = {
  id: string
  mode: RelatedEntryMode
  fileContent: string | null
  fileName: string | null
  url: string
  note: string
}

function emptyRelatedEntry(): RelatedEntry {
  return { id: crypto.randomUUID(), mode: 'file', fileContent: null, fileName: null, url: '', note: '' }
}

type CreateFeatureParams = {
  featureSlug: string
  requirementMemo: string
  requirementMemoFilename?: string
  relatedSources: Array<
    | { kind: 'file'; filename: string; content: string; note?: string }
    | { kind: 'url'; url: string; note?: string }
  >
}

type Props = {
  features: Feature[]
  activeFeatureId?: string
  isCreatingFeature: boolean
  onSelectFeature: (featureId: string) => void
  onCreateFeature: (params: CreateFeatureParams) => void
  onRenameFeature: (featureId: string, newSlug: string) => void
  onDeleteFeature: (featureId: string) => void
}

function FeatureRelatedRow({
  entry,
  onChange,
  onRemove,
}: {
  entry: RelatedEntry
  onChange: (id: string, patch: Partial<RelatedEntry>) => void
  onRemove: (id: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileReadError, setFileReadError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const content = await file.text()
      onChange(entry.id, { fileContent: content, fileName: file.name })
      setFileReadError(null)
    } catch {
      setFileReadError(UI_TEXT.featurePanel.relatedFileReadError)
    }
  }

  return (
    <div className="border border-stone-200 rounded p-2 space-y-1">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(entry.id, { mode: 'file' })}
          className={`text-xs px-1.5 py-0.5 rounded ${entry.mode === 'file' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          {UI_TEXT.featurePanel.relatedFileMode}
        </button>
        <button
          onClick={() => onChange(entry.id, { mode: 'url' })}
          className={`text-xs px-1.5 py-0.5 rounded ${entry.mode === 'url' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
        >
          {UI_TEXT.featurePanel.relatedUrlMode}
        </button>
        <button onClick={() => onRemove(entry.id)} className="ml-auto text-xs text-stone-400 hover:text-stone-700">
          {UI_TEXT.featurePanel.relatedRemoveButton}
        </button>
      </div>

      {entry.mode === 'file' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            onChange={(e) => { void handleFileChange(e) }}
            className="hidden"
          />
          {entry.fileName ? (
            <p className="text-xs text-stone-500">{UI_TEXT.featurePanel.relatedFileSelected(entry.fileName)}</p>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-2 py-0.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50"
            >
              {UI_TEXT.featurePanel.relatedFileButton}
            </button>
          )}
          {fileReadError && <p className="text-xs text-red-600">{fileReadError}</p>}
        </>
      )}

      {entry.mode === 'url' && (
        <input
          type="text"
          value={entry.url}
          onChange={(e) => onChange(entry.id, { url: e.target.value })}
          placeholder={UI_TEXT.featurePanel.relatedUrlPlaceholder}
          className="w-full text-xs px-2 py-0.5 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
        />
      )}

      <textarea
        value={entry.note}
        onChange={(e) => onChange(entry.id, { note: e.target.value })}
        placeholder={UI_TEXT.featurePanel.relatedNotePlaceholder}
        rows={2}
        className="w-full text-xs px-2 py-0.5 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
      />
    </div>
  )
}

function FeatureCreateForm({
  features,
  isCreatingFeature,
  onCreate,
  onCancel,
}: {
  features: Feature[]
  isCreatingFeature: boolean
  onCreate: (params: CreateFeatureParams) => void
  onCancel: () => void
}) {
  const [slug, setSlug] = useState('')
  const [memoContent, setMemoContent] = useState<string | null>(null)
  const [memoFilename, setMemoFilename] = useState<string | null>(null)
  const [relatedEntries, setRelatedEntries] = useState<RelatedEntry[]>([])
  const [slugError, setSlugError] = useState<string | null>(null)
  const [memoError, setMemoError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const memoFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (submitted && !isCreatingFeature) {
      onCancel()
    }
  }, [isCreatingFeature, submitted, onCancel])

  const handleMemoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      setMemoContent(text)
      setMemoFilename(file.name)
      setMemoError(null)
    } catch {
      setMemoError(UI_TEXT.featurePanel.requirementMemoReadError)
    }
  }

  const handleAddRelated = () => setRelatedEntries((prev) => [...prev, emptyRelatedEntry()])
  const handleChangeRelated = (id: string, patch: Partial<RelatedEntry>) =>
    setRelatedEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const handleRemoveRelated = (id: string) =>
    setRelatedEntries((prev) => prev.filter((e) => e.id !== id))

  const handleSubmit = () => {
    const trimmedSlug = slug.trim()
    if (!trimmedSlug) { setSlugError(UI_TEXT.featurePanel.slugRequired); return }
    if (features.some((f) => f.slug === trimmedSlug)) { setSlugError(UI_TEXT.featurePanel.slugDuplicate); return }
    if (memoContent === null) { setMemoError(UI_TEXT.featurePanel.requirementMemoRequired); return }

    setSlugError(null)
    setMemoError(null)

    const relatedSources = relatedEntries.flatMap(
      (entry): CreateFeatureParams['relatedSources'] => {
        if (entry.mode === 'file' && entry.fileContent && entry.fileName) {
          return [{ kind: 'file', filename: entry.fileName, content: entry.fileContent, note: entry.note || undefined }]
        }
        if (entry.mode === 'url' && entry.url.trim()) {
          return [{ kind: 'url', url: entry.url.trim(), note: entry.note || undefined }]
        }
        return []
      },
    )

    setSubmitted(true)
    onCreate({
      featureSlug: trimmedSlug,
      requirementMemo: memoContent,
      requirementMemoFilename: memoFilename ?? undefined,
      relatedSources,
    })
  }

  return (
    <div className="border border-stone-300 rounded p-2 space-y-2 bg-white mt-1">
      <fieldset disabled={isCreatingFeature} className="border-0 p-0 m-0 min-w-0 space-y-2">
        <div>
          <input
            type="text"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugError(null) }}
            placeholder={UI_TEXT.featurePanel.slugPlaceholder}
            className="w-full border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-50"
          />
          {slugError && <p className="text-xs text-red-600 mt-0.5">{slugError}</p>}
        </div>

        <div>
          <input
            ref={memoFileInputRef}
            type="file"
            accept=".md,.txt"
            onChange={(e) => { void handleMemoFileChange(e) }}
            className="hidden"
          />
          {memoFilename ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-stone-500 truncate flex-1">
                {UI_TEXT.featurePanel.requirementMemoFileSelected(memoFilename)}
              </span>
              <button
                onClick={() => { setMemoContent(null); setMemoFilename(null) }}
                className="text-xs text-stone-400 hover:text-stone-700 shrink-0"
              >
                {UI_TEXT.featurePanel.relatedRemoveButton}
              </button>
            </div>
          ) : (
            <button
              onClick={() => memoFileInputRef.current?.click()}
              className="text-xs px-2 py-1 border border-stone-300 text-stone-600 rounded hover:bg-stone-50"
            >
              {UI_TEXT.featurePanel.requirementMemoLabel} {UI_TEXT.featurePanel.requirementMemoFileButton}
            </button>
          )}
          {memoError && <p className="text-xs text-red-600 mt-0.5">{memoError}</p>}
        </div>

        <div className="space-y-1">
          {relatedEntries.map((entry) => (
            <FeatureRelatedRow
              key={entry.id}
              entry={entry}
              onChange={handleChangeRelated}
              onRemove={handleRemoveRelated}
            />
          ))}
          <button onClick={handleAddRelated} className="text-xs text-stone-500 hover:text-stone-800">
            {UI_TEXT.featurePanel.relatedAddButton}
          </button>
        </div>
      </fieldset>

      <div className="flex gap-1 items-center">
        <button
          onClick={handleSubmit}
          disabled={isCreatingFeature}
          className="text-xs px-2 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreatingFeature ? UI_TEXT.featurePanel.createButtonLoading : UI_TEXT.featurePanel.createButton}
        </button>
        <button
          onClick={onCancel}
          disabled={isCreatingFeature}
          className="text-xs px-2 py-1 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 disabled:opacity-40"
        >
          {UI_TEXT.featurePanel.cancelButton}
        </button>
      </div>
    </div>
  )
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
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  const startRename = (feature: Feature) => {
    setRenamingId(feature.id)
    setRenameValue(feature.slug)
    setRenameError(null)
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
      {features.map((feature) => {
        const isActive = feature.id === activeFeatureId
        const isRenaming = renamingId === feature.id

        return (
          <div
            key={feature.id}
            className={`flex items-center gap-1 text-xs rounded px-1 py-0.5 ${isActive ? 'bg-stone-200' : 'hover:bg-stone-100'}`}
          >
            {isRenaming ? (
              <>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => { setRenameValue(e.target.value); setRenameError(null) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename(feature.id)
                    if (e.key === 'Escape') { setRenamingId(null); setRenameError(null) }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 border border-stone-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
                />
                <button
                  onClick={() => confirmRename(feature.id)}
                  className="text-stone-500 hover:text-stone-800 transition-colors"
                  title={UI_TEXT.featurePanel.renameConfirm}
                >
                  {UI_TEXT.featurePanel.renameConfirm}
                </button>
                <button
                  onClick={() => { setRenamingId(null); setRenameError(null) }}
                  className="text-stone-400 hover:text-stone-700 transition-colors"
                  title={UI_TEXT.featurePanel.renameCancel}
                >
                  {UI_TEXT.featurePanel.renameCancel}
                </button>
                {renameError && <span className="text-red-500 text-xs">{renameError}</span>}
              </>
            ) : (
              <>
                <button
                  onClick={() => onSelectFeature(feature.id)}
                  className={`flex-1 text-left text-xs truncate ${isActive ? 'text-stone-800 font-medium' : 'text-stone-600'} cursor-pointer`}
                >
                  {feature.slug}
                </button>
                <button
                  onClick={() => startRename(feature)}
                  className="text-stone-400 hover:text-stone-700 transition-colors shrink-0"
                  title={UI_TEXT.featurePanel.renameButton}
                >
                  {UI_TEXT.featurePanel.renameButton}
                </button>
                <button
                  onClick={() => handleDelete(feature)}
                  className="text-stone-400 hover:text-red-600 transition-colors shrink-0"
                  title={UI_TEXT.featurePanel.deleteButton}
                >
                  {UI_TEXT.featurePanel.deleteButton}
                </button>
              </>
            )}
          </div>
        )
      })}

      {showForm ? (
        <FeatureCreateForm
          features={features}
          isCreatingFeature={isCreatingFeature}
          onCreate={onCreateFeature}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
        >
          {UI_TEXT.featurePanel.addButton}
        </button>
      )}
    </div>
  )
}
