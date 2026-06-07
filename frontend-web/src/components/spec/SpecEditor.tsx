'use client'

import { useState } from 'react'
import { UI_TEXT } from '@/text/uiText'

type ViewMode = 'preview' | 'source' | 'edit'

type Props = {
  spec: string
  onSave: (value: string) => void
  disabled?: boolean
}

function findDuplicateSectionTitles(md: string): string[] {
  const headings = md.match(/^## .+/gm)?.map((h) => h.slice(3).trim()) ?? []
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const h of headings) {
    if (seen.has(h)) duplicates.add(h)
    seen.add(h)
  }
  return [...duplicates]
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let inUl = false
  let inOl = false

  const closeList = () => {
    if (inUl) { result.push('</ul>'); inUl = false }
    if (inOl) { result.push('</ol>'); inOl = false }
  }

  const isSafeHref = (href: string): boolean => {
    if (/[\x00-\x1f\x7f]/.test(href)) return false
    const schemeMatch = href.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*):/)
    if (schemeMatch) {
      const scheme = schemeMatch[1].toLowerCase()
      return scheme === 'http' || scheme === 'https' || scheme === 'mailto'
    }
    return true
  }

  const inline = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code class="bg-stone-100 px-1 rounded text-sm font-mono">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_: string, linkText: string, href: string) => {
        if (!isSafeHref(href)) return linkText
        const escapedHref = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        return `<a href="${escapedHref}" class="text-blue-600 underline" target="_blank">${linkText}</a>`
      })

  for (const line of lines) {
    if (line.match(/^# /)) {
      closeList()
      result.push(`<h1 class="text-2xl font-bold mt-6 mb-2">${inline(line.slice(2))}</h1>`)
    } else if (line.match(/^## /)) {
      closeList()
      result.push(`<h2 class="text-xl font-semibold mt-5 mb-2 border-b border-stone-200 pb-1">${inline(line.slice(3))}</h2>`)
    } else if (line.match(/^### /)) {
      closeList()
      result.push(`<h3 class="text-lg font-medium mt-4 mb-1">${inline(line.slice(4))}</h3>`)
    } else if (line.match(/^- /)) {
      if (!inUl) { result.push('<ul class="list-disc list-inside space-y-1 my-2 ml-2">'); inUl = true }
      result.push(`<li>${inline(line.slice(2))}</li>`)
    } else if (line.match(/^\d+\. /)) {
      if (!inOl) { result.push('<ol class="list-decimal list-inside space-y-1 my-2 ml-2">'); inOl = true }
      result.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`)
    } else if (line.trim() === '') {
      closeList()
      result.push('<br />')
    } else {
      closeList()
      result.push(`<p class="my-1">${inline(line)}</p>`)
    }
  }
  closeList()
  return result.join('\n')
}

export function SpecEditor({ spec, onSave, disabled = false }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('source')
  const [draft, setDraft] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleEnterEdit() {
    setDraft(spec)
    setSaveError(null)
    setViewMode('edit')
  }

  function handleSave() {
    const duplicates = findDuplicateSectionTitles(draft)
    if (duplicates.length > 0) {
      setSaveError(UI_TEXT.specEditor.duplicateSectionTitles(duplicates))
      return
    }
    setSaveError(null)
    onSave(draft)
    setViewMode('source')
  }

  function handleCancel() {
    setSaveError(null)
    setViewMode('source')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 border-b border-stone-200 bg-stone-50 shrink-0 h-10">
        <span className="text-xs font-medium text-stone-500 mr-auto">{UI_TEXT.specEditor.fileLabel}</span>
        {viewMode === 'edit' ? (
          <>
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 transition-colors cursor-pointer"
            >
              {UI_TEXT.specEditor.saveButton}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-2 py-1 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            >
              {UI_TEXT.specEditor.cancelButton}
            </button>
          </>
        ) : (
          <>
            <div className="flex border border-stone-200 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('preview')}
                disabled={disabled}
                className={`text-xs px-2 py-1 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${viewMode === 'preview' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:bg-stone-100'}`}
              >
                {UI_TEXT.specEditor.previewButton}
              </button>
              <button
                onClick={() => setViewMode('source')}
                disabled={disabled}
                className={`text-xs px-2 py-1 border-l border-stone-200 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${viewMode === 'source' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:bg-stone-100'}`}
              >
                {UI_TEXT.specEditor.sourceButton}
              </button>
            </div>
            <button
              onClick={handleEnterEdit}
              disabled={disabled}
              className="text-xs px-2 py-1 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {UI_TEXT.specEditor.editButton}
            </button>
          </>
        )}
      </div>

      {viewMode === 'edit' && (
        <div className="shrink-0 px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
          {UI_TEXT.specEditor.editModeNote}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'preview' && (
          <div
            className="h-full overflow-y-auto p-4 text-sm text-stone-800"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(spec) }}
          />
        )}
        {viewMode === 'source' && (
          <textarea
            readOnly
            disabled={disabled}
            value={spec}
            className="w-full h-full resize-none p-3 text-sm font-mono text-stone-800 bg-white focus:outline-none"
            spellCheck={false}
          />
        )}
        {viewMode === 'edit' && (
          <div className="flex flex-col h-full">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 min-h-0 resize-none p-3 text-sm font-mono text-stone-800 bg-white focus:outline-none"
              spellCheck={false}
            />
            {saveError && (
              <div className="shrink-0 border-t border-red-200 bg-red-50 px-3 py-2">
                <p className="text-xs text-red-600">{saveError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
