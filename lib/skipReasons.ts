import type { SkipReasonDefinition, SkipReasonDefinitionFile } from '@/types'

export const CUSTOM_REASON = 'custom' as const
export const CUSTOM_REASON_LABEL = '理由を入力'
export const CUSTOM_REASON_INSTRUCTION = 'ユーザーが入力したテキストを未決事項の説明として反映してください。'

export const SKIP_REASON_KEY_CHARS = '[a-z0-9_]'
const REASON_KEY_RE = new RegExp(`^${SKIP_REASON_KEY_CHARS}+$`)

export const SKIP_REASON_KEY_CHARS = '[a-z0-9_]'

export type EffectiveSkipReason =
  | { reason: string; label: string; instruction: string; isCustom?: false }
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
    if (!REASON_KEY_RE.test(key)) throw new Error(`Invalid skip reason key: ${key}`)
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

export function getEffectiveSkipReasons(file: SkipReasonDefinitionFile | null): EffectiveSkipReason[] {
  const reasons: EffectiveSkipReason[] = []
  if (file) {
    for (const [id, def] of Object.entries(file.skipReasons)) {
      reasons.push({ reason: id, label: def.label, instruction: def.instruction })
    }
  }
  reasons.push({ reason: CUSTOM_REASON, label: CUSTOM_REASON_LABEL, isCustom: true })
  return reasons
}
