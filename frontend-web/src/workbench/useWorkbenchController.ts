'use client'

import { useState, useCallback, useEffect } from 'react'
import { INITIAL_STATE, type WorkbenchState, type Workspace } from './workbenchState'
import { fetchConfig } from '@/api-client/configApi'
import { createWorkspace, openWorkspace, exportWorkspace } from '@/api-client/workspaceApi'
import { createFeature, selectFeature, renameFeature, deleteFeature } from '@/api-client/featureApi'
import { addReference } from '@/api-client/referencesApi'
import { generateQuestion, answerQuestion, skipQuestion, retryQuestion } from '@/api-client/questionApi'
import { editSpec } from '@/api-client/specApi'
import { checkExport } from '@/api-client/exportApi'
import { UI_TEXT } from '@/text/uiText'

type RawRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

export function useWorkbenchController() {
  const [state, setState] = useState<WorkbenchState>(INITIAL_STATE)

  const setWorkspace = useCallback((workspace: Workspace, slug?: string) => {
    setState((prev) => ({
      ...prev,
      workspace,
      workspaceSlug: slug ?? workspace.slug,
      error: null,
    }))
  }, [])

  useEffect(() => {
    fetchConfig()
      .then((config) => setState((prev) => ({ ...prev, config })))
      .catch(() => {})
  }, [])

  const handleCreateWorkspace = useCallback(
    async (slug: string, relatedSources: RawRelatedSource[]) => {
      setState((prev) => ({ ...prev, isCreatingWorkspace: true, error: null }))
      try {
        const { workspace } = await createWorkspace(slug)
        setWorkspace(workspace)
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : UI_TEXT.startScreen.createErrorRelatedSource,
        }))
      } finally {
        setState((prev) => ({ ...prev, isCreatingWorkspace: false }))
      }
      void relatedSources
    },
    [setWorkspace],
  )

  const handleOpenWorkspace = useCallback(
    async (filename: string, content: string) => {
      setState((prev) => ({ ...prev, error: null }))
      try {
        const { workspace } = await openWorkspace(filename, content)
        setWorkspace(workspace)
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : UI_TEXT.startScreen.openWorkFileError,
        }))
      }
    },
    [setWorkspace],
  )

  const handleCreateFeature = useCallback(
    async (featureSlug: string, relatedSources: RawRelatedSource[]) => {
      if (!state.workspaceSlug) return
      setState((prev) => ({ ...prev, isCreatingFeature: true, error: null }))
      try {
        const { workspace } = await createFeature(state.workspaceSlug, featureSlug, relatedSources)
        setWorkspace(workspace)
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : UI_TEXT.featurePanel.createErrorRelatedSource,
        }))
      } finally {
        setState((prev) => ({ ...prev, isCreatingFeature: false }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleSelectFeature = useCallback(
    async (featureId: string) => {
      if (!state.workspaceSlug) return
      try {
        const { workspace } = await selectFeature(state.workspaceSlug, featureId)
        setWorkspace(workspace)
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Feature の切り替えに失敗しました',
        }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleRenameFeature = useCallback(
    async (featureId: string, newSlug: string) => {
      if (!state.workspaceSlug) return
      try {
        const { workspace } = await renameFeature(state.workspaceSlug, featureId, newSlug)
        setWorkspace(workspace)
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Feature のリネームに失敗しました',
        }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleDeleteFeature = useCallback(
    async (featureId: string) => {
      if (!state.workspaceSlug) return
      try {
        const { workspace } = await deleteFeature(state.workspaceSlug, featureId)
        setWorkspace(workspace)
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Feature の削除に失敗しました',
        }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleAddReference = useCallback(
    async (params: {
      featureId?: string
      kind: 'file' | 'url'
      name: string
      content: string
      note?: string
    }) => {
      if (!state.workspaceSlug) return
      try {
        const result = await addReference({ workspaceSlug: state.workspaceSlug, ...params })
        if (result.status === 'ok') {
          setWorkspace(result.workspace)
        }
        return result
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : UI_TEXT.referencesPanel.addRefError,
        }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleGenerateQuestion = useCallback(async () => {
    if (!state.workspaceSlug) return
    setState((prev) => ({ ...prev, isGeneratingQuestion: true, error: null }))
    try {
      const { workspace } = await generateQuestion(state.workspaceSlug)
      setWorkspace(workspace)
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : UI_TEXT.interview.generateQuestionsError,
      }))
    } finally {
      setState((prev) => ({ ...prev, isGeneratingQuestion: false }))
    }
  }, [state.workspaceSlug, setWorkspace])

  const handleAnswerQuestion = useCallback(
    async (questionId: string, answer: string) => {
      if (!state.workspaceSlug) return
      setState((prev) => ({ ...prev, formattingQuestionId: questionId, error: null }))
      try {
        const { workspace } = await answerQuestion(state.workspaceSlug, questionId, answer)
        setWorkspace(workspace)
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : UI_TEXT.interview.answerLLMError,
        }))
      } finally {
        setState((prev) => ({ ...prev, formattingQuestionId: null }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleSkipQuestion = useCallback(
    async (questionId: string, reason: string, customText?: string) => {
      if (!state.workspaceSlug) return
      setState((prev) => ({ ...prev, skippingQuestionId: questionId, error: null }))
      try {
        const { workspace } = await skipQuestion(state.workspaceSlug, questionId, reason, customText)
        setWorkspace(workspace)
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : UI_TEXT.interview.skipLLMError,
        }))
      } finally {
        setState((prev) => ({ ...prev, skippingQuestionId: null }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleRetryQuestion = useCallback(
    async (questionId: string) => {
      if (!state.workspaceSlug) return
      setState((prev) => ({ ...prev, retryingQuestionId: questionId, error: null }))
      try {
        const { workspace } = await retryQuestion(state.workspaceSlug, questionId)
        setWorkspace(workspace)
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : UI_TEXT.interview.retryLLMError,
        }))
      } finally {
        setState((prev) => ({ ...prev, retryingQuestionId: null }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleSpecEdit = useCallback(
    async (newSpec: string) => {
      if (!state.workspaceSlug) return
      try {
        const { workspace } = await editSpec(state.workspaceSlug, newSpec)
        setWorkspace(workspace)
        setState((prev) => ({ ...prev, specEditMode: false }))
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Spec の保存に失敗しました',
        }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleExport = useCallback(async () => {
    if (!state.workspaceSlug) return
    try {
      const { result } = await checkExport(state.workspaceSlug)
      if (result.hasWarnings) {
        const proceed = window.confirm(
          `${UI_TEXT.export.preflightWarning}\n${UI_TEXT.export.preflightPrompt}`,
        )
        if (!proceed) return
      }
      const blob = await exportWorkspace(state.workspaceSlug)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'specs.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : UI_TEXT.export.errorWrite,
      }))
    }
  }, [state.workspaceSlug])

  const enterSpecEditMode = useCallback(() => {
    const spec = state.workspace?.features.find((f) => f.id === state.workspace?.activeFeatureId)?.spec ?? ''
    setState((prev) => ({ ...prev, specEditMode: true, specDraft: spec }))
  }, [state.workspace])

  const cancelSpecEditMode = useCallback(() => {
    setState((prev) => ({ ...prev, specEditMode: false, specDraft: '' }))
  }, [])

  const setSpecDraft = useCallback((draft: string) => {
    setState((prev) => ({ ...prev, specDraft: draft }))
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    state,
    handleCreateWorkspace,
    handleOpenWorkspace,
    handleCreateFeature,
    handleSelectFeature,
    handleRenameFeature,
    handleDeleteFeature,
    handleAddReference,
    handleGenerateQuestion,
    handleAnswerQuestion,
    handleSkipQuestion,
    handleRetryQuestion,
    handleSpecEdit,
    handleExport,
    enterSpecEditMode,
    cancelSpecEditMode,
    setSpecDraft,
    clearError,
  }
}
