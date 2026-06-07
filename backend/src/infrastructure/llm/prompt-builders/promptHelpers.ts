import type { MarkerContext } from '@/src/types'
import taxonomyJson from '@/src/config/questionTaxonomy.json'

export const KIND_CANDIDATES = Object.keys(taxonomyJson.kinds).join(' / ')
export const PRIORITY_CANDIDATES = Object.keys(taxonomyJson.priorities).join(' / ')

export function buildMarkerContextSection(contexts: MarkerContext[]): string {
  if (!contexts.length) return ''
  const lines: string[] = [
    '',
    'Marker Context:',
    '',
    'The following pre-spec markers are present in spec.md.',
    'Use them as reading instructions when generating questions.',
    '',
    'Marked content is provided as-is.',
    'Do not treat marker instructions as confirmed requirements by themselves.',
    'Do not silently rewrite marked content.',
    'If a marker instruction suggests caution, generate a confirmation question instead of changing the marked content.',
    '',
  ]
  for (const ctx of contexts) {
    lines.push(`- marker: ${ctx.name}`)
    lines.push(`  label: ${ctx.label}`)
    lines.push(`  instruction: ${ctx.instruction}`)
    lines.push('  targets:')
    for (const t of ctx.targets) {
      lines.push(`    - type: ${t.markerType}`)
      lines.push('      text:')
      for (const tl of t.text.split('\n')) {
        lines.push(`        ${tl}`)
      }
    }
  }
  return lines.join('\n') + '\n'
}
