const FORBIDDEN_CHARS = /[\x00-\x1f\x7f<>:"|?*]/

export function validateProjectFileBase(input: string): boolean {
  if (!input) return false
  if (input.includes('/') || input.includes('\\')) return false
  if (FORBIDDEN_CHARS.test(input)) return false
  if (input === '.' || input === '..') return false
  return true
}
