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

export function buildOutputReferencesForFeature(
  workspace: Workspace,
  feature: Feature,
): string {
  const lines: string[] = ['# References', '']
  lines.push('## Global References', '')
  lines.push(workspace.references.trim() || '')
  lines.push('')
  lines.push('## Local References', '')
  lines.push(feature.references.trim() || '')
  lines.push('')
  return lines.join('\n')
}
