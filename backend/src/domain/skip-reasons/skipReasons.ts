import type { SkipReasonDefinition, SkipReasonDefinitionFile } from '@/src/types'

export const CUSTOM_REASON = 'custom' as const

const SKIP_REASON_KEY_RE = /^[a-z0-9_]+$/

export type EffectiveSkipReason =
  | { reason: string; label: string; instruction: string; isCustom: false }
  | { reason: typeof CUSTOM_REASON; label: string; isCustom: true }

export function validateSkipReasonDefinitionFile(raw: unknown): SkipReasonDefinitionFile {
  if (typeof raw !== 'object' || raw === null) throw new Error('skipReasons file must be an object')
  const obj = raw as Record<string, unknown>
  if (typeof obj['skipReasons'] !== 'object' || obj['skipReasons'] === null)
    throw new Error('skipReasons must be an object')
  const skipReasons = obj['skipReasons'] as Record<string, unknown>
  const result: Record<string, SkipReasonDefinition> = {}
  for (const [key, value] of Object.entries(skipReasons)) {
    if (key === CUSTOM_REASON) continue
    if (!SKIP_REASON_KEY_RE.test(key)) throw new Error(`Invalid skip reason key: ${key}`)
    if (typeof value !== 'object' || value === null)
      throw new Error(`Skip reason "${key}" must be an object`)
    const def = value as Record<string, unknown>
    if (typeof def['label'] !== 'string' || !def['label'].trim())
      throw new Error(`Skip reason "${key}" must have a non-empty label`)
    if (typeof def['instruction'] !== 'string' || !def['instruction'].trim())
      throw new Error(`Skip reason "${key}" must have a non-empty instruction`)
    result[key] = { label: def['label'], instruction: def['instruction'] }
  }
  return { skipReasons: result }
}

export function getEffectiveSkipReasons(
  file: SkipReasonDefinitionFile | null,
  customLabel = 'その他（自由記入）',
): EffectiveSkipReason[] {
  const reasons: EffectiveSkipReason[] = []
  if (file) {
    for (const [id, def] of Object.entries(file.skipReasons)) {
      reasons.push({ reason: id, label: def.label, instruction: def.instruction, isCustom: false })
    }
  }
  reasons.push({ reason: CUSTOM_REASON, label: customLabel, isCustom: true })
  return reasons
}
