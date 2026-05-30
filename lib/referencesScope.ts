import type { Feature, Workspace } from '@/types'

export function appendGlobalReference(workspace: Workspace, block: string): Workspace {
  const refs = workspace.references.replace(/\n+$/, '')
  const separator = refs ? '\n\n' : ''
  return { ...workspace, references: refs + separator + block + '\n' }
}

export function appendLocalReference(
  workspace: Workspace,
  featureId: string,
  block: string,
): Workspace {
  const features = workspace.features.map((f) => {
    if (f.id !== featureId) return f
    const refs = f.references.replace(/\n+$/, '')
    const separator = refs ? '\n\n' : ''
    return { ...f, references: refs + separator + block + '\n' }
  })
  return { ...workspace, features }
}

export function buildEffectiveReferencesForFeature(
  workspace: Workspace,
  feature: Feature,
): string {
  const global = workspace.references.trim()
  const local = feature.references.trim()
  if (!global && !local) return ''
  if (!global) return local
  if (!local) return global
  return global + '\n\n' + local
}

export function buildOutputGlobalReferences(workspace: Workspace): string {
  const lines: string[] = ['# References', '', '## Global References', '']
  const global = workspace.references.trim()
  if (global) lines.push(global, '')
  return lines.join('\n') + '\n'
}

export function buildOutputLocalReferences(feature: Feature): string {
  const lines: string[] = ['# References', '', '## Local References', '']
  const local = feature.references.trim()
  if (local) lines.push(local, '')
  return lines.join('\n') + '\n'
}
