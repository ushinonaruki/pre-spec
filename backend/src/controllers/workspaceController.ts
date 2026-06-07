import type { Request, Response } from 'express'
import { listWorkspaces } from '@/src/usecases/listWorkspaces'
import { createWorkspaceUsecase } from '@/src/usecases/createWorkspace'
import { openWorkspace } from '@/src/usecases/openWorkspace'
import { getWorkspace } from '@/src/usecases/getWorkspace'

export const workspaceController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const result = await listWorkspaces()
      res.json(result)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Workspace 一覧の取得に失敗しました' })
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.body as { slug?: string }
      if (!slug) {
        res.status(400).json({ error: 'slug は必須です' })
        return
      }
      const result = await createWorkspaceUsecase({ slug })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },

  async open(req: Request, res: Response): Promise<void> {
    try {
      const { filename, content } = req.body as { filename?: string; content?: string }
      if (!filename || !content) {
        res.status(400).json({ error: 'filename と content は必須です' })
        return
      }
      const result = await openWorkspace({ filename, content })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },

  async get(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug } = req.params
      const result = await getWorkspace(workspaceSlug)
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(404).json({ error: message })
    }
  },
}
