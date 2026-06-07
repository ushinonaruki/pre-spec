'use client'

import { useState } from 'react'
import { UI_TEXT } from '@/text/uiText'

type View = 'preview' | 'source' | 'edit'

type Props = {
  spec: string
  specDraft: string
  editMode: boolean
  onEnterEdit: () => void
  onCancelEdit: () => void
  onDraftChange: (draft: string) => void
  onSave: (newSpec: string) => void
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

export function SpecEditor({
  spec,
  specDraft,
  editMode,
  onEnterEdit,
  onCancelEdit,
  onDraftChange,
  onSave,
}: Props) {
  const [view, setView] = useState<View>('preview')

  const handleSave = () => {
    onSave(specDraft)
    setView('preview')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 bg-white">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          {UI_TEXT.specEditor.fileLabel}
        </span>
        <div className="flex items-center gap-1">
          {editMode ? (
            <>
              <button
                onClick={handleSave}
                className="text-xs px-2 py-0.5 rounded bg-stone-800 text-white hover:bg-stone-700"
              >
                {UI_TEXT.specEditor.saveButton}
              </button>
              <button
                onClick={() => { onCancelEdit(); setView('preview') }}
                className="text-xs px-2 py-0.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                {UI_TEXT.specEditor.cancelButton}
              </button>
            </>
          ) : (
            <>
              {(['preview', 'source'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`text-xs px-2 py-0.5 rounded ${view === v ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:bg-stone-100'}`}
                >
                  {v === 'preview' ? UI_TEXT.specEditor.previewButton : UI_TEXT.specEditor.sourceButton}
                </button>
              ))}
              <button
                onClick={() => { onEnterEdit(); setView('edit') }}
                className="text-xs px-2 py-0.5 rounded text-stone-500 hover:bg-stone-100"
              >
                {UI_TEXT.specEditor.editButton}
              </button>
            </>
          )}
        </div>
      </div>

      {editMode && (
        <div className="px-3 py-1 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
          {UI_TEXT.specEditor.editModeNote}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {editMode ? (
          <textarea
            value={specDraft}
            onChange={(e) => onDraftChange(e.target.value)}
            className="w-full h-full p-3 text-sm font-mono resize-none focus:outline-none bg-white"
            spellCheck={false}
          />
        ) : view === 'source' ? (
          <pre className="p-3 text-xs font-mono text-stone-700 whitespace-pre-wrap break-all">{spec}</pre>
        ) : (
          <div
            className="p-4 text-sm text-stone-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(spec) }}
          />
        )}
      </div>
    </div>
  )
}
