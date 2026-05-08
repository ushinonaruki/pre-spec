import type { MarkerDefinition, MarkerDefinitionFile } from '@/types'

export type ExtensibleMarkerDef = {
  id: string
  label: string
  inlinePattern: RegExp
  rangePattern?: RegExp
  warningMessage: string
}

export const EXTENSIBLE_MARKERS: ExtensibleMarkerDef[] = [
  {
    id: 'revisit',
    label: 'revisit marker',
    inlinePattern: /\[pre-spec:revisit\]/g,
    rangePattern: /<!--\s*pre-spec:revisit:start\s*-->/g,
    warningMessage: 'revisit marker が残っています。再確認対象を含む spec.md として出力されます。',
  },
  {
    id: 'protected',
    label: 'protected marker',
    inlinePattern: /\[pre-spec:protected\]/g,
    rangePattern: /<!--\s*pre-spec:protected:start\s*-->/g,
    warningMessage: 'protected marker が残っています。保護された内容を含む spec.md として出力されます。',
  },
]

export const MARKERS_FILENAME = 'pre-spec.markers.json'

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
    if (name === 'skip') throw new Error('Invalid marker definition: "skip" is a built-in marker')
    if (!def || typeof def !== 'object' || Array.isArray(def)) {
      throw new Error(`Invalid marker definition for "${name}": must be an object`)
    }
    const d = def as Record<string, unknown>
    if (typeof d.label !== 'string') throw new Error(`Invalid marker definition for "${name}": label must be a string`)
    if (typeof d.description !== 'string') throw new Error(`Invalid marker definition for "${name}": description must be a string`)
    if (d.questionInstruction !== undefined && typeof d.questionInstruction !== 'string') {
      throw new Error(`Invalid marker definition for "${name}": questionInstruction must be a string`)
    }
    validated[name] = {
      label: d.label,
      description: d.description,
      questionInstruction: d.questionInstruction as string | undefined,
    }
  }
  return { markers: validated }
}
