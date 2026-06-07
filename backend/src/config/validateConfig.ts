import type { MarkerDefinitionFile, SkipReasonDefinitionFile } from '@/src/types'

const MARKER_NAME_RE = /^[a-z0-9_-]+$/
const SKIP_REASON_KEY_RE = /^[a-z0-9_]+$/
const RESERVED_MARKER = 'skip'

export type ConfigValidationError = { field: string; message: string }

export function validateMarkerDefinitionFile(file: unknown): ConfigValidationError[] {
  const errors: ConfigValidationError[] = []
  if (!file || typeof file !== 'object') {
    errors.push({ field: 'markers', message: 'markers must be an object' })
    return errors
  }
  const f = file as Record<string, unknown>
  if (!f.markers || typeof f.markers !== 'object') {
    errors.push({ field: 'markers', message: 'markers field is required' })
    return errors
  }
  for (const [name, def] of Object.entries(f.markers as Record<string, unknown>)) {
    if (!MARKER_NAME_RE.test(name)) {
      errors.push({ field: `markers.${name}`, message: `invalid marker name: ${name}` })
    }
    if (name === RESERVED_MARKER) {
      errors.push({ field: `markers.${name}`, message: `"skip" is a reserved marker name` })
    }
    if (!def || typeof def !== 'object') {
      errors.push({ field: `markers.${name}`, message: 'definition must be an object' })
      continue
    }
    const d = def as Record<string, unknown>
    if (typeof d.label !== 'string' || !d.label.trim()) {
      errors.push({ field: `markers.${name}.label`, message: 'label is required and must be non-empty' })
    }
    if (typeof d.instruction !== 'string' || !d.instruction.trim()) {
      errors.push({ field: `markers.${name}.instruction`, message: 'instruction is required and must be non-empty' })
    }
  }
  return errors
}

export function validateSkipReasonDefinitionFile(file: unknown): ConfigValidationError[] {
  const errors: ConfigValidationError[] = []
  if (!file || typeof file !== 'object') {
    errors.push({ field: 'skipReasons', message: 'skipReasons must be an object' })
    return errors
  }
  const f = file as Record<string, unknown>
  if (!f.skipReasons || typeof f.skipReasons !== 'object') {
    errors.push({ field: 'skipReasons', message: 'skipReasons field is required' })
    return errors
  }
  for (const [key, def] of Object.entries(f.skipReasons as Record<string, unknown>)) {
    if (!SKIP_REASON_KEY_RE.test(key)) {
      errors.push({ field: `skipReasons.${key}`, message: `invalid skip reason key: ${key}` })
    }
    if (!def || typeof def !== 'object') {
      errors.push({ field: `skipReasons.${key}`, message: 'definition must be an object' })
      continue
    }
    const d = def as Record<string, unknown>
    if (typeof d.label !== 'string' || !d.label.trim()) {
      errors.push({ field: `skipReasons.${key}.label`, message: 'label is required and must be non-empty' })
    }
    if (typeof d.instruction !== 'string' || !d.instruction.trim()) {
      errors.push({ field: `skipReasons.${key}.instruction`, message: 'instruction is required and must be non-empty' })
    }
  }
  return errors
}

export function assertValidMarkerFile(file: MarkerDefinitionFile): void {
  const errors = validateMarkerDefinitionFile(file)
  if (errors.length) throw new Error(`Invalid marker definition file: ${JSON.stringify(errors)}`)
}

export function assertValidSkipReasonFile(file: SkipReasonDefinitionFile): void {
  const errors = validateSkipReasonDefinitionFile(file)
  if (errors.length) throw new Error(`Invalid skip reason definition file: ${JSON.stringify(errors)}`)
}
