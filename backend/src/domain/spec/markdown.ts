import type { Section } from '@/src/types'

export const SPEC_TEMPLATE = `# Feature Specification: [FEATURE NAME]

## User Scenarios & Testing

### User Story 1 - [Brief Title] (Priority: P1)

### User Story 2 - [Brief Title] (Priority: P2)

### User Story 3 - [Brief Title] (Priority: P3)

### Edge Cases

## Requirements

### Functional Requirements

### Key Entities

## Success Criteria

### Measurable Outcomes

## Assumptions
`

export function extractSections(markdown: string): Section[] {
  const lines = markdown.split('\n')
  const sections: Section[] = []
  const occurrenceCount: Record<string, number> = {}

  for (const line of lines) {
    const match = line.match(/^## (.+)$/)
    if (match) {
      const title = match[1].trim()
      const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const occurrence = occurrenceCount[slug] ?? 0
      occurrenceCount[slug] = occurrence + 1
      sections.push({ id: `s-${slug}-${occurrence}`, title })
    }
  }
  return sections
}

export function findDuplicateSectionTitles(markdown: string): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const line of markdown.split('\n')) {
    const match = line.match(/^## (.+)$/)
    if (match) {
      const title = match[1].trim()
      if (seen.has(title)) duplicates.add(title)
      else seen.add(title)
    }
  }
  return [...duplicates]
}

export function hasSectionHeading(markdown: string, headingTitle: string): boolean {
  return markdown.split('\n').some((line) => {
    const m = line.match(/^## (.+)$/)
    return m !== null && m[1].trim() === headingTitle
  })
}

export function insertUnderHeading(
  markdown: string,
  headingTitle: string,
  insertion: string,
): string {
  const lines = markdown.split('\n')
  let targetIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^## (.+)$/)
    if (match && match[1].trim() === headingTitle) {
      targetIdx = i
      break
    }
  }

  if (targetIdx === -1) throw new Error(`Section heading not found: ${headingTitle}`)

  let nextHeadingIdx = lines.length
  for (let i = targetIdx + 1; i < lines.length; i++) {
    if (lines[i].match(/^## /)) {
      nextHeadingIdx = i
      break
    }
  }

  let insertAt = nextHeadingIdx
  while (insertAt > targetIdx + 1 && lines[insertAt - 1].trim() === '') {
    insertAt--
  }

  const before = lines.slice(0, insertAt)
  const after = lines.slice(nextHeadingIdx)
  const block = insertion.trim()
  return [...before, '', block, '', ...after].join('\n')
}
