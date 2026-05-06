'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Heading, Project, SkipReason } from '@/types'
import { extractHeadings, insertUnderHeading, mergeHeadings, SPEC_TEMPLATE } from '@/lib/markdown'
import { appendAnswerLog, appendSkipLog, appendStartLog } from '@/lib/logBuilder'
import { loadState, saveProject } from '@/lib/storage'
import { buildSkipEntry, extractOpenQuestions } from '@/lib/openQuestions'
import StartScreen from '@/components/StartScreen'
import SpecEditor from '@/components/SpecEditor'
import HeadingNav from '@/components/HeadingNav'
import InterviewPanel from '@/components/InterviewPanel'
import BottomTabs from '@/components/BottomTabs'

type BottomTab = 'log' | 'memo' | 'openq'

const DUMMY_QUESTION = 'このセクションについて考えていることを入力してください'

function newProject(prompt: string): Project {
  const now = new Date().toISOString()
  const spec = SPEC_TEMPLATE
  const headings = extractHeadings(spec)
  const log = appendStartLog('', { prompt })
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    initialPrompt: prompt,
    uploads: [],
    spec,
    log,
    memo: '',
    headings,
    currentHeadingId: headings[0]?.id ?? null,
    isCompleted: false,
  }
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Home() {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(() => loadState().project)
  const [specMode, setSpecMode] = useState<'edit' | 'preview'>('edit')
  const [bottomTab, setBottomTab] = useState<BottomTab>('log')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleProjectSave = useCallback((p: Project) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveProject(p), 400)
  }, [])

  const updateProject = useCallback(
    (updater: (prev: Project) => Project) => {
      setProject((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        scheduleProjectSave(next)
        return next
      })
    },
    [scheduleProjectSave],
  )

  const handleStart = (prompt: string) => {
    const p = newProject(prompt)
    saveProject(p)
    setProject(p)
  }

  const handleSpecChange = (value: string) => {
    updateProject((prev) => {
      const freshHeadings = extractHeadings(value)
      const merged = mergeHeadings(prev.headings, freshHeadings)
      const currentStillExists = merged.some((h) => h.id === prev.currentHeadingId)
      return {
        ...prev,
        spec: value,
        headings: merged,
        currentHeadingId: currentStillExists ? prev.currentHeadingId : (merged[0]?.id ?? null),
      }
    })
  }

  const handleSelectHeading = (id: string) => {
    updateProject((prev) => {
      const headings = prev.headings.map((h) =>
        h.id === id && h.status === 'unvisited' ? { ...h, status: 'in_progress' as const } : h,
      )
      return { ...prev, headings, currentHeadingId: id }
    })
  }

  const handleAnswer = (answer: string) => {
    updateProject((prev) => {
      const heading = prev.headings.find((h) => h.id === prev.currentHeadingId)
      if (!heading) return prev

      const insertion = `- ${answer}`
      const newSpec = insertUnderHeading(prev.spec, heading.title, insertion)
      const newLog = appendAnswerLog(prev.log, {
        heading: heading.title,
        question: DUMMY_QUESTION,
        answer,
      })
      return { ...prev, spec: newSpec, log: newLog }
    })
  }

  const handleSkip = (reason: SkipReason, detail?: string) => {
    updateProject((prev) => {
      const heading = prev.headings.find((h) => h.id === prev.currentHeadingId)
      if (!heading) return prev

      const entry = buildSkipEntry({
        heading: heading.title,
        question: DUMMY_QUESTION,
        reason,
        detail,
      })
      const newSpec = insertUnderHeading(prev.spec, 'Open Questions', entry)
      const newLog = appendSkipLog(prev.log, {
        heading: heading.title,
        question: DUMMY_QUESTION,
        reason,
        detail,
      })
      return { ...prev, spec: newSpec, log: newLog }
    })
    setBottomTab('openq')
  }

  const handleDone = () => {
    updateProject((prev) => {
      const headings = prev.headings.map((h) =>
        h.id === prev.currentHeadingId ? { ...h, status: 'done' as const } : h,
      )
      const currentIdx = headings.findIndex((h) => h.id === prev.currentHeadingId)
      const next = headings.slice(currentIdx + 1).find((h) => h.status !== 'done' && h.status !== 'skipped')
      const nextId = next?.id ?? null
      const headings2 = headings.map((h) =>
        h.id === nextId && h.status === 'unvisited' ? { ...h, status: 'in_progress' as const } : h,
      )
      return { ...prev, headings: headings2, currentHeadingId: nextId, isCompleted: !nextId }
    })
  }

  const handleRegenerate = () => {
    alert('Stage 2 で LLM による質問再生成が実装されます')
  }

  const handleMemoChange = (v: string) => {
    updateProject((prev) => ({ ...prev, memo: v }))
  }

  const handleDownloadAll = () => {
    if (!project) return
    downloadFile('spec.md', project.spec)
    setTimeout(() => downloadFile('集約ログ.md', project.log), 100)
    setTimeout(() => downloadFile('参照メモ.md', project.memo || '# 参照メモ\n\n(空)\n'), 200)
  }

  if (!project) return <StartScreen onStart={handleStart} />

  const currentHeading: Heading | null =
    project.headings.find((h) => h.id === project.currentHeadingId) ?? null

  const openQuestions = extractOpenQuestions(project.spec)
  const doneCount = project.headings.filter((h) => h.status === 'done').length
  const totalCount = project.headings.length

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-stone-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b border-stone-200">
        <span className="font-semibold text-stone-800 text-sm">pre-spec</span>
        <span className="text-xs text-stone-400">
          {doneCount}/{totalCount} 見出し完了
        </span>
        {project.isCompleted && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
            ✓ 全見出し完了
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleDownloadAll}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
          >
            ↓ 3ファイルダウンロード
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 transition-colors"
          >
            ⚙ 設定
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col w-1/2 min-w-0 border-r border-stone-200">
          <div className="shrink-0 border-b border-stone-200 bg-stone-50 max-h-40 overflow-y-auto">
            <HeadingNav
              headings={project.headings}
              currentId={project.currentHeadingId}
              onSelect={handleSelectHeading}
            />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <SpecEditor
              value={project.spec}
              onChange={handleSpecChange}
              mode={specMode}
              onModeChange={setSpecMode}
            />
          </div>
        </div>

        <div className="w-1/2 min-w-0 overflow-hidden">
          <InterviewPanel
            heading={currentHeading}
            onAnswer={handleAnswer}
            onSkip={handleSkip}
            onDone={handleDone}
            onRegenerateQuestions={handleRegenerate}
          />
        </div>
      </div>

      <div className="shrink-0 h-48 border-t border-stone-200 overflow-hidden">
        <BottomTabs
          activeTab={bottomTab}
          onTabChange={setBottomTab}
          log={project.log}
          memo={project.memo}
          onMemoChange={handleMemoChange}
          openQuestions={openQuestions}
        />
      </div>
    </div>
  )
}
