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
  const hasFeatures = state.workspace.features.length > 0
  const hasOpenQuestions =
    activeFeature?.timeline.some(
      (item) => item.type === 'question' && (item as Question).status === 'open',
    ) ?? false

  const currentSection =
    activeFeature?.sections.find((s) => s.id === activeFeature.currentSectionId) ?? null
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
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b border-stone-200">
        <span className="font-semibold text-stone-800 text-sm">{UI_TEXT.app.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { void ctrl.handleExport() }}
            disabled={!hasFeatures}
            className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {UI_TEXT.app.exportButton}
          </button>
        </div>
      </header>

      {state.error && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          <span className="flex-1">{state.error}</span>
          <button
            onClick={ctrl.clearError}
            className="shrink-0 text-red-400 hover:text-red-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col w-1/3 min-w-0 border-r border-stone-200">
          <WorkspaceSidebar
            workspace={state.workspace}
            isCreatingFeature={state.isCreatingFeature}
            onCreateFeature={ctrl.handleCreateFeature}
            onSelectFeature={ctrl.handleSelectFeature}
            onRenameFeature={ctrl.handleRenameFeature}
            onDeleteFeature={ctrl.handleDeleteFeature}
            onAddReference={ctrl.handleAddReference}
          />
        </div>

        <div className="flex flex-col w-1/3 min-w-0 border-r border-stone-200 overflow-hidden">
          <SpecEditor
            spec={activeFeature?.spec ?? ''}
            onSave={ctrl.handleSpecEdit}
            disabled={!activeFeature}
          />
        </div>

        <div className="flex flex-col w-1/3 min-w-0 overflow-hidden">
          <InterviewPanel
            currentSection={currentSection}
            timeline={timeline}
            isGenerating={state.isGeneratingQuestion}
            formattingQuestionId={state.formattingQuestionId}
            skippingQuestionId={state.skippingQuestionId}
            retryingQuestionId={state.retryingQuestionId}
            addQuestionError={state.addQuestionError}
            answerLLMErrorQuestionId={state.answerLLMErrorId}
            skipLLMErrorQuestionId={state.skipLLMErrorId}
            retryLLMErrorQuestionId={state.retryLLMErrorQuestionId}
            skipReasons={skipReasons}
            disabled={!activeFeature}
            nextDisabled={hasOpenQuestions}
            addQuestionsDisabled={hasOpenQuestions}
            onAddQuestions={() => { void ctrl.handleGenerateQuestion() }}
            onAnswerQuestion={ctrl.handleAnswerQuestion}
            onSkipQuestion={ctrl.handleSkipQuestion}
            onRetryQuestion={ctrl.handleRetryQuestion}
            onNext={() => { void ctrl.handleNextSection() }}
            onDismissAddQuestionError={ctrl.dismissAddQuestionError}
            onDismissAnswerLLMError={ctrl.dismissAnswerLLMError}
            onDismissSkipLLMError={ctrl.dismissSkipLLMError}
            onDismissRetryLLMError={ctrl.dismissRetryLLMError}
          />
        </div>
      </div>
    </div>
  )
}
