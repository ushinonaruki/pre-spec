import type { Request, Response } from 'express'
import { generateQuestion } from '@/src/usecases/generateQuestion'
import { answerQuestionUsecase } from '@/src/usecases/answerQuestion'
import { skipQuestionUsecase } from '@/src/usecases/skipQuestion'
import { retryQuestionUsecase } from '@/src/usecases/retryQuestion'

export const questionController = {
  async generate(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug } = req.body as { workspaceSlug?: string }
      if (!workspaceSlug) {
        res.status(400).json({ error: 'workspaceSlug は必須です' })
        return
      }
      const result = await generateQuestion({ workspaceSlug })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },

  async answer(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug, questionId, answer } = req.body as {
        workspaceSlug?: string
        questionId?: string
        answer?: string
      }
      if (!workspaceSlug || !questionId || !answer) {
        res.status(400).json({ error: 'workspaceSlug, questionId, answer は必須です' })
        return
      }
      const result = await answerQuestionUsecase({ workspaceSlug, questionId, answer })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },

  async skip(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug, questionId, skipReason, skipCustomText } = req.body as {
        workspaceSlug?: string
        questionId?: string
        skipReason?: string
        skipCustomText?: string
      }
      if (!workspaceSlug || !questionId || !skipReason) {
        res.status(400).json({ error: 'workspaceSlug, questionId, skipReason は必須です' })
        return
      }
      const result = await skipQuestionUsecase({ workspaceSlug, questionId, skipReason, skipCustomText })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },

  async retry(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug, questionId } = req.body as { workspaceSlug?: string; questionId?: string }
      if (!workspaceSlug || !questionId) {
        res.status(400).json({ error: 'workspaceSlug と questionId は必須です' })
        return
      }
      const result = await retryQuestionUsecase({ workspaceSlug, questionId })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },
}
