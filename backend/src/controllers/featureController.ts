import type { Request, Response } from 'express'
import { createFeatureUsecase } from '@/src/usecases/createFeature'
import { selectFeature } from '@/src/usecases/selectFeature'
import { renameFeatureUsecase } from '@/src/usecases/renameFeature'
import { deleteFeatureUsecase } from '@/src/usecases/deleteFeature'

export const featureController = {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug, featureSlug, relatedSources } = req.body as {
        workspaceSlug?: string
        featureSlug?: string
        relatedSources?: unknown[]
      }
      if (!workspaceSlug || !featureSlug) {
        res.status(400).json({ error: 'workspaceSlug と featureSlug は必須です' })
        return
      }
      const result = await createFeatureUsecase({
        workspaceSlug,
        featureSlug,
        relatedSources: (relatedSources ?? []) as Parameters<typeof createFeatureUsecase>[0]['relatedSources'],
      })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },

  async select(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug, featureId } = req.body as { workspaceSlug?: string; featureId?: string }
      if (!workspaceSlug || !featureId) {
        res.status(400).json({ error: 'workspaceSlug と featureId は必須です' })
        return
      }
      const result = await selectFeature({ workspaceSlug, featureId })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },

  async rename(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug, featureId, newSlug } = req.body as {
        workspaceSlug?: string
        featureId?: string
        newSlug?: string
      }
      if (!workspaceSlug || !featureId || !newSlug) {
        res.status(400).json({ error: 'workspaceSlug, featureId, newSlug は必須です' })
        return
      }
      const result = await renameFeatureUsecase({ workspaceSlug, featureId, newSlug })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug, featureId } = req.body as { workspaceSlug?: string; featureId?: string }
      if (!workspaceSlug || !featureId) {
        res.status(400).json({ error: 'workspaceSlug と featureId は必須です' })
        return
      }
      const result = await deleteFeatureUsecase({ workspaceSlug, featureId })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },
}
