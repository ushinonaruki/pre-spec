import { apiPost } from './backendUrl'
import type { Workspace } from '@/workbench/workbenchState'

type QuestionResponse = { workspace: Workspace }

export async function generateQuestion(workspaceSlug: string): Promise<QuestionResponse> {
  return apiPost('/api/questions/generate', { workspaceSlug })
}

export async function answerQuestion(
  workspaceSlug: string,
  questionId: string,
  answer: string,
): Promise<QuestionResponse> {
  return apiPost('/api/questions/answer', { workspaceSlug, questionId, answer })
}

export async function skipQuestion(
  workspaceSlug: string,
  questionId: string,
  skipReason: string,
  skipCustomText?: string,
): Promise<QuestionResponse> {
  return apiPost('/api/questions/skip', { workspaceSlug, questionId, skipReason, skipCustomText })
}

export async function retryQuestion(
  workspaceSlug: string,
  questionId: string,
): Promise<QuestionResponse> {
  return apiPost('/api/questions/retry', { workspaceSlug, questionId })
}
