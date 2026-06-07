import type { Request, Response } from 'express'
import { checkExport } from '@/src/usecases/checkExport'
import { exportWorkspaceUsecase } from '@/src/usecases/exportWorkspace'

export const exportController = {
  async check(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug } = req.body as { workspaceSlug?: string }
      if (!workspaceSlug) {
        res.status(400).json({ error: 'workspaceSlug は必須です' })
        return
      }
      const result = await checkExport({ workspaceSlug })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },

  async run(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug } = req.body as { workspaceSlug?: string }
      if (!workspaceSlug) {
        res.status(400).json({ error: 'workspaceSlug は必須です' })
        return
      }
      const zip = await exportWorkspaceUsecase({ workspaceSlug })
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="specs.zip"`,
        'Content-Length': zip.length.toString(),
      })
      res.send(zip)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },
}
