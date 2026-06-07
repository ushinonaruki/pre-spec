import type { Request, Response } from 'express'
import { editSpec } from '@/src/usecases/editSpec'

export const specController = {
  async edit(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug, newSpec } = req.body as { workspaceSlug?: string; newSpec?: string }
      if (!workspaceSlug || newSpec === undefined) {
        res.status(400).json({ error: 'workspaceSlug と newSpec は必須です' })
        return
      }
      const result = await editSpec({ workspaceSlug, newSpec })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },
}
