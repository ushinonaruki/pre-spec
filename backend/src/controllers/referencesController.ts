import type { Request, Response } from 'express'
import { getWorkspace } from '@/src/usecases/getWorkspace'
import { addReference } from '@/src/usecases/addReference'
import { buildEffectiveReferencesForFeature } from '@/src/domain/references/references'

export const referencesController = {
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug } = req.query as { workspaceSlug?: string }
      if (!workspaceSlug) {
        res.status(400).json({ error: 'workspaceSlug は必須です' })
        return
      }
      const { workspace } = await getWorkspace(workspaceSlug)
      const activeFeature = workspace.features.find((f) => f.id === workspace.activeFeatureId)
      const effective = activeFeature
        ? buildEffectiveReferencesForFeature(workspace, activeFeature)
        : workspace.references

      res.json({
        global: workspace.references,
        local: activeFeature?.references ?? '',
        effective,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(404).json({ error: message })
    }
  },

  async add(req: Request, res: Response): Promise<void> {
    try {
      const { workspaceSlug, featureId, kind, name, content, note } = req.body as {
        workspaceSlug?: string
        featureId?: string
        kind?: string
        name?: string
        content?: string
        note?: string
      }
      if (!workspaceSlug || !kind || !name || !content) {
        res.status(400).json({ error: 'workspaceSlug, kind, name, content は必須です' })
        return
      }
      const result = await addReference({
        workspaceSlug,
        featureId,
        kind: kind as 'file' | 'url',
        name,
        content,
        note,
      })
      res.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      res.status(400).json({ error: message })
    }
  },
}
