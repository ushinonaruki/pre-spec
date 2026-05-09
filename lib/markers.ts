import type { MarkerContext, MarkerDefinition, MarkerDefinitionFile, MarkerTarget } from '@/types'

const MARKER_KEY_RE = /^[a-z0-9_-]+$/

export function validateMarkerDefinitionFile(value: unknown): MarkerDefinitionFile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid marker definition file: root must be an object')
  }
  const root = value as Record<string, unknown>
  if (!root.markers || typeof root.markers !== 'object' || Array.isArray(root.markers)) {
    throw new Error('Invalid marker definition file: markers must be an object')
  }
  const markers = root.markers as Record<string, unknown>
  const validated: Record<string, MarkerDefinition> = {}
  for (const [name, def] of Object.entries(markers)) {
    if (!name) throw new Error('Invalid marker definition: marker name must not be empty')
    if (!MARKER_KEY_RE.test(name)) throw new Error(`Invalid marker definition: "${name}" contains invalid characters`)
    if (name === 'skip') throw new Error('Invalid marker definition: "skip" is a built-in marker')
    if (!def || typeof def !== 'object' || Array.isArray(def)) {
      throw new Error(`Invalid marker definition for "${name}": must be an object`)
    }
    const d = def as Record<string, unknown>
    if (typeof d.label !== 'string' || !d.label.trim()) {
      throw new Error(`Invalid marker definition for "${name}": label must be a non-empty string`)
    }
    if (typeof d.instruction !== 'string' || !d.instruction.trim()) {
      throw new Error(`Invalid marker definition for "${name}": instruction must be a non-empty string`)
    }
    validated[name] = { label: d.label, instruction: d.instruction }
  }
  return { markers: validated }
}

export function extractMarkerContexts(
  markdown: string,
  markerDefinitions: MarkerDefinitionFile | null,
): MarkerContext[] {
  if (!markerDefinitions) return []

  const lines = markdown.split('\n')
  const contexts: MarkerContext[] = []

  for (const [name, def] of Object.entries(markerDefinitions.markers)) {
    const targets: MarkerTarget[] = []

    // inline: - [pre-spec:{name}] {text}
    const inlineRe = new RegExp(`^\\s*-\\s*\\[pre-spec:${name}\\]\\s*(.+)$`)
    for (const line of lines) {
      const m = line.match(inlineRe)
      if (m) {
        targets.push({ markerType: 'inline', text: m[1].trim() })
      }
    }

    // range: <!-- pre-spec:{name}:start --> ... <!-- pre-spec:{name}:end -->
    const startRe = new RegExp(`^\\s*<!--\\s*pre-spec:${name}:start\\s*-->\\s*$`)
    const endRe = new RegExp(`^\\s*<!--\\s*pre-spec:${name}:end\\s*-->\\s*$`)
    let rangeStart: number | null = null
    for (let i = 0; i < lines.length; i++) {
      if (startRe.test(lines[i])) {
        rangeStart = i
      } else if (endRe.test(lines[i]) && rangeStart !== null) {
        const rangeLines = lines.slice(rangeStart + 1, i)
        const text = rangeLines.join('\n').trim()
        if (text) targets.push({ markerType: 'range', text })
        rangeStart = null
      }
    }

    if (targets.length > 0) {
      contexts.push({ name, label: def.label, instruction: def.instruction, targets })
    }
  }

  return contexts
}
