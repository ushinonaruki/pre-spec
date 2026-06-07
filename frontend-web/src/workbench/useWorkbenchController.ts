'use client'

import { useState, useCallback, useEffect } from 'react'
import { INITIAL_STATE, type WorkbenchState, type Workspace } from './workbenchState'
import { fetchConfig } from '@/api-client/configApi'
import { createWorkspace, openWorkspace, exportWorkspace } from '@/api-client/workspaceApi'
import { createFeature, selectFeature, renameFeature, deleteFeature, nextSection } from '@/api-client/featureApi'
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
    async (params: {
      featureSlug: string
      requirementMemo: string
      requirementMemoFilename?: string
      relatedSources: RawRelatedSource[]
    }) => {
      if (!state.workspaceSlug) return
      setState((prev) => ({ ...prev, isCreatingFeature: true, error: null }))
      try {
        const { workspace } = await createFeature({
          workspaceSlug: state.workspaceSlug,
          featureSlug: params.featureSlug,
          requirementMemo: params.requirementMemo,
          requirementMemoFilename: params.requirementMemoFilename,
          relatedSources: params.relatedSources,
        })
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

  const handleNextSection = useCallback(async () => {
    if (!state.workspaceSlug) return
    try {
      const { workspace } = await nextSection(state.workspaceSlug)
      setWorkspace(workspace)
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'セクションの移動に失敗しました',
      }))
    }
  }, [state.workspaceSlug, setWorkspace])

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
    setState((prev) => ({ ...prev, isGeneratingQuestion: true, addQuestionError: false }))
    try {
      const { workspace } = await generateQuestion(state.workspaceSlug)
      setWorkspace(workspace)
    } catch {
      setState((prev) => ({ ...prev, addQuestionError: true }))
    } finally {
      setState((prev) => ({ ...prev, isGeneratingQuestion: false }))
    }
  }, [state.workspaceSlug, setWorkspace])

  const handleAnswerQuestion = useCallback(
    async (questionId: string, answer: string) => {
      if (!state.workspaceSlug) return
      setState((prev) => ({ ...prev, formattingQuestionId: questionId, answerLLMErrorId: null }))
      try {
        const { workspace } = await answerQuestion(state.workspaceSlug, questionId, answer)
        setWorkspace(workspace)
      } catch {
        setState((prev) => ({ ...prev, answerLLMErrorId: questionId }))
      } finally {
        setState((prev) => ({ ...prev, formattingQuestionId: null }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleSkipQuestion = useCallback(
    async (questionId: string, reason: string, customText?: string) => {
      if (!state.workspaceSlug) return
      setState((prev) => ({ ...prev, skippingQuestionId: questionId, skipLLMErrorId: null }))
      try {
        const { workspace } = await skipQuestion(state.workspaceSlug, questionId, reason, customText)
        setWorkspace(workspace)
      } catch {
        setState((prev) => ({ ...prev, skipLLMErrorId: questionId }))
      } finally {
        setState((prev) => ({ ...prev, skippingQuestionId: null }))
      }
    },
    [state.workspaceSlug, setWorkspace],
  )

  const handleRetryQuestion = useCallback(
    async (questionId: string) => {
      if (!state.workspaceSlug) return
      setState((prev) => ({ ...prev, retryingQuestionId: questionId, retryLLMErrorQuestionId: null }))
      try {
        const { workspace } = await retryQuestion(state.workspaceSlug, questionId)
        setWorkspace(workspace)
      } catch {
        setState((prev) => ({ ...prev, retryLLMErrorQuestionId: questionId }))
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

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const dismissAddQuestionError = useCallback(() => {
    setState((prev) => ({ ...prev, addQuestionError: false }))
  }, [])

  const dismissAnswerLLMError = useCallback(() => {
    setState((prev) => ({ ...prev, answerLLMErrorId: null }))
  }, [])

  const dismissSkipLLMError = useCallback(() => {
    setState((prev) => ({ ...prev, skipLLMErrorId: null }))
  }, [])

  const dismissRetryLLMError = useCallback(() => {
    setState((prev) => ({ ...prev, retryLLMErrorQuestionId: null }))
  }, [])

  return {
    state,
    handleCreateWorkspace,
    handleOpenWorkspace,
    handleCreateFeature,
    handleSelectFeature,
    handleRenameFeature,
    handleDeleteFeature,
    handleNextSection,
    handleAddReference,
    handleGenerateQuestion,
    handleAnswerQuestion,
    handleSkipQuestion,
    handleRetryQuestion,
    handleSpecEdit,
    handleExport,
    clearError,
    dismissAddQuestionError,
    dismissAnswerLLMError,
    dismissSkipLLMError,
    dismissRetryLLMError,
  }
}
