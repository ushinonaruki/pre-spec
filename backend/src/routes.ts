import { Router } from 'express'
import { configController } from './controllers/configController'
import { workspaceController } from './controllers/workspaceController'
import { featureController } from './controllers/featureController'
import { referencesController } from './controllers/referencesController'
import { questionController } from './controllers/questionController'
import { specController } from './controllers/specController'
import { exportController } from './controllers/exportController'

export function createRouter(): Router {
  const router = Router()

  router.get('/api/config', configController.getConfig)

  router.get('/api/workspaces', workspaceController.list)
  router.post('/api/workspaces/create', workspaceController.create)
  router.post('/api/workspaces/open', workspaceController.open)
  router.get('/api/workspaces/:workspaceSlug', workspaceController.get)

  router.post('/api/features/create', featureController.create)
  router.post('/api/features/select', featureController.select)
  router.post('/api/features/rename', featureController.rename)
  router.post('/api/features/delete', featureController.delete)
  router.post('/api/features/next-section', featureController.nextSection)

  router.get('/api/references', referencesController.get)
  router.post('/api/references/add', referencesController.add)

  router.post('/api/questions/generate', questionController.generate)
  router.post('/api/questions/answer', questionController.answer)
  router.post('/api/questions/skip', questionController.skip)
  router.post('/api/questions/retry', questionController.retry)

  router.post('/api/spec/edit', specController.edit)

  router.post('/api/export/check', exportController.check)
  router.post('/api/export/run', exportController.run)

  return router
}
