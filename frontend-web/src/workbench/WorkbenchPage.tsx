'use client'

import { useWorkbenchController } from './useWorkbenchController'
import { StartScreen } from '@/components/workspace/StartScreen'
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar'
import { SpecEditor } from '@/components/spec/SpecEditor'
import { InterviewPanel } from '@/components/interview/InterviewPanel'
import { UI_TEXT } from '@/text/uiText'
import type { Question } from './workbenchState'

export function WorkbenchPage() {
  const ctrl = useWorkbenchController()
  const { state } = ctrl

  if (!state.workspace) {
    return (
      <StartScreen
        isLoading={state.isCreatingWorkspace}
        error={state.error}
        onCreateWorkspace={ctrl.handleCreateWorkspace}
        onOpenWorkspace={ctrl.handleOpenWorkspace}
        onClearError={ctrl.clearError}
      />
    )
  }

  const activeFeature = state.workspace.features.find(
    (f) => f.id === state.workspace?.activeFeatureId,
  )
  const currentSection = activeFeature?.sections.find(
    (s) => s.id === activeFeature.currentSectionId,
  ) ?? null
  const timeline = activeFeature?.timeline ?? []

  const skipReasons: Array<{ reason: string; label: string; isCustom: boolean; instruction?: string }> =
    state.config
      ? [
          ...Object.entries(state.config.skipReasons).map(([k, v]) => ({
            reason: k,
            label: v.label,
            isCustom: false,
            instruction: undefined,
          })),
          { reason: 'custom', label: UI_TEXT.skipReasons.customLabel, isCustom: true },
        ]
      : [{ reason: 'custom', label: UI_TEXT.skipReasons.customLabel, isCustom: true }]

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-2 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-700">{UI_TEXT.app.name}</span>
          <span className="text-stone-400 text-sm">{UI_TEXT.app.tagline}</span>
          {state.workspace.slug && (
            <span className="text-stone-500 text-sm">— {state.workspace.slug}</span>
          )}
        </div>
        <button
          onClick={ctrl.handleExport}
          className="text-sm px-3 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
        >
          {UI_TEXT.app.exportButton}
        </button>
      </header>

      {state.error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          <span>{state.error}</span>
          <button onClick={ctrl.clearError} className="text-red-400 hover:text-red-600 ml-2">✕</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r border-stone-200 flex flex-col overflow-hidden">
          <WorkspaceSidebar
            workspace={state.workspace}
            config={state.config}
            isCreatingFeature={state.isCreatingFeature}
            onCreateFeature={ctrl.handleCreateFeature}
            onSelectFeature={ctrl.handleSelectFeature}
            onRenameFeature={ctrl.handleRenameFeature}
            onDeleteFeature={ctrl.handleDeleteFeature}
            onAddReference={ctrl.handleAddReference}
          />
        </div>

        <div className="w-1/3 border-r border-stone-200 flex flex-col overflow-hidden">
          <SpecEditor
            spec={activeFeature?.spec ?? ''}
            specDraft={state.specDraft}
            editMode={state.specEditMode}
            onEnterEdit={ctrl.enterSpecEditMode}
            onCancelEdit={ctrl.cancelSpecEditMode}
            onDraftChange={ctrl.setSpecDraft}
            onSave={ctrl.handleSpecEdit}
          />
        </div>

        <div className="w-1/3 flex flex-col overflow-hidden">
          <InterviewPanel
            currentSection={currentSection}
            timeline={timeline}
            isGenerating={state.isGeneratingQuestion}
            formattingQuestionId={state.formattingQuestionId}
            skippingQuestionId={state.skippingQuestionId}
            retryingQuestionId={state.retryingQuestionId}
            skipReasons={skipReasons}
            onAddQuestions={ctrl.handleGenerateQuestion}
            onAnswerQuestion={ctrl.handleAnswerQuestion}
            onSkipQuestion={ctrl.handleSkipQuestion}
            onRetryQuestion={ctrl.handleRetryQuestion}
          />
        </div>
      </div>
    </div>
  )
}
