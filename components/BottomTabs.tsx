'use client'

import { useRef, useState } from 'react'
import type { RelatedSourceKind } from '@/types'
import { UI_TEXT } from '@/lib/text/uiText'

type Tab = 'log' | 'memo'
type AddMode = 'text' | 'file'

type Props = {
  activeTab: Tab
  onTabChange: (t: Tab) => void
  log: string
  memo: string
  onAddReference: (kind: RelatedSourceKind, name: string, content: string, note?: string) => void
}

export default function BottomTabs({ activeTab, onTabChange, log, memo, onAddReference }: Props) {
  const [addMode, setAddMode] = useState<AddMode | null>(null)
  const [textInput, setTextInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'log', label: UI_TEXT.bottomTabs.logTab },
    { id: 'memo', label: UI_TEXT.bottomTabs.memoTab },
  ]

  function openAddForm() {
    setAddMode('text')
    setTextInput('')
    setNoteInput('')
    setFileContent(null)
    setFileName(null)
  }

  function closeAddForm() {
    setAddMode(null)
    setTextInput('')
    setNoteInput('')
    setFileContent(null)
    setFileName(null)
  }

  function handleAddText() {
    if (!textInput.trim()) return
    onAddReference('text', 'related-input', textInput.trim(), noteInput.trim() || undefined)
    closeAddForm()
  }

  function handleAddFile() {
    if (!fileContent || !fileName) return
    onAddReference('file', fileName, fileContent, noteInput.trim() || undefined)
    closeAddForm()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const content = await file.text()
      if (!content.trim()) return
      setFileContent(content)
      setFileName(file.name)
    } catch {
      // ignore read errors
    }
  }

  const noteRow = (
    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-stone-100 shrink-0">
      <input
        type="text"
        value={noteInput}
        onChange={(e) => setNoteInput(e.target.value)}
        placeholder={UI_TEXT.bottomTabs.addRefNotePlaceholder}
        className="flex-1 text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-stone-200 bg-stone-50 shrink-0">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { onTabChange(t.id); closeAddForm() }}
              className={`px-4 py-2 text-xs transition-colors border-r border-stone-200 last:border-r-0
                ${activeTab === t.id
                  ? 'bg-white text-stone-800 font-medium -mb-px border-b-2 border-b-white'
                  : 'text-stone-500 hover:text-stone-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {activeTab === 'memo' && addMode === null && (
          <button
            onClick={openAddForm}
            className="ml-auto mr-2 text-xs text-stone-500 hover:text-stone-800 transition-colors"
          >
            {UI_TEXT.bottomTabs.addRefButton}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {addMode !== null ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-stone-100 bg-stone-50 shrink-0">
              <button
                onClick={() => setAddMode('text')}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${addMode === 'text' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {UI_TEXT.bottomTabs.addRefText}
              </button>
              <button
                onClick={() => setAddMode('file')}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${addMode === 'file' ? 'bg-stone-200 text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {UI_TEXT.bottomTabs.addRefFile}
              </button>
              <button
                onClick={closeAddForm}
                className="ml-auto text-xs text-stone-400 hover:text-stone-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {addMode === 'text' && (
              <div className="flex flex-col flex-1 min-h-0">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={UI_TEXT.bottomTabs.addRefTextPlaceholder}
                  className="flex-1 min-h-0 resize-none p-2 text-xs font-mono text-stone-700 bg-white focus:outline-none"
                />
                {noteRow}
                <div className="shrink-0 px-2 py-1.5 border-t border-stone-100">
                  <button
                    onClick={handleAddText}
                    disabled={!textInput.trim()}
                    className="text-xs px-3 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {UI_TEXT.bottomTabs.addRefAddButton}
                  </button>
                </div>
              </div>
            )}

            {addMode === 'file' && (
              fileContent !== null ? (
                <div className="flex flex-col flex-1 min-h-0 justify-end">
                  <div className="px-2 py-1.5 text-xs font-mono text-stone-500 shrink-0">{fileName}</div>
                  {noteRow}
                  <div className="shrink-0 px-2 py-1.5 border-t border-stone-100">
                    <button
                      onClick={handleAddFile}
                      className="text-xs px-3 py-1 bg-stone-800 text-white rounded hover:bg-stone-700 transition-colors"
                    >
                      {UI_TEXT.bottomTabs.addRefAddButton}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt"
                    onChange={(e) => { void handleFileChange(e) }}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
                  >
                    {UI_TEXT.bottomTabs.addRefFileButton}
                  </button>
                </div>
              )
            )}
          </div>
        ) : (
          <>
            {activeTab === 'log' && (
              <textarea
                readOnly
                value={log || UI_TEXT.bottomTabs.logEmpty}
                className="w-full h-full resize-none p-3 text-xs font-mono text-stone-600 bg-white focus:outline-none"
              />
            )}
            {activeTab === 'memo' && (
              <textarea
                readOnly
                value={memo}
                className="w-full h-full resize-none p-3 text-xs font-mono text-stone-700 bg-white focus:outline-none"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
