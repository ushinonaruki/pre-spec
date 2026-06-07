import type { Request, Response } from 'express'
import { getConfig } from '@/src/usecases/getConfig'

export const configController = {
  getConfig(req: Request, res: Response): void {
    try {
      const config = getConfig()
      res.json(config)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'config の取得に失敗しました' })
    }
  },
}
