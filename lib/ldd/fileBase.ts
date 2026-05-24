const FORBIDDEN_CHARS = /[\x00-\x1f\x7f<>:"|?*]/
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..+)?$/i

export function validateSlugBase(input: string): boolean {
  if (!input) return false
  if (input.includes('/') || input.includes('\\')) return false
  if (FORBIDDEN_CHARS.test(input)) return false
  if (input === '.' || input === '..') return false
  if (WINDOWS_RESERVED.test(input)) return false
  if (input.endsWith('.') || input.endsWith(' ')) return false
  return true
}
