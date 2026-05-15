import type { Section } from '@/types'

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
      sections.push({
        id: `s-${slug}-${occurrence}`,
        title,
      })
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
  const newLines = [...before, '', block, '', ...after]
  return newLines.join('\n')
}

export function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let inUl = false
  let inOl = false

  const closeList = () => {
    if (inUl) { result.push('</ul>'); inUl = false }
    if (inOl) { result.push('</ol>'); inOl = false }
  }

  const isSafeHref = (href: string): boolean => {
    // 制御文字を含む場合は拒否
    if (/[\x00-\x1f\x7f]/.test(href)) return false
    // scheme を持つ場合は許可リストでチェック
    const schemeMatch = href.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*):/)
    if (schemeMatch) {
      const scheme = schemeMatch[1].toLowerCase()
      return scheme === 'http' || scheme === 'https' || scheme === 'mailto'
    }
    // scheme なし（相対パス・アンカー）は許可
    return true
  }

  const inline = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code class="bg-stone-100 px-1 rounded text-sm font-mono">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText: string, href: string) => {
        if (!isSafeHref(href)) return linkText
        const escapedHref = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        return `<a href="${escapedHref}" class="text-blue-600 underline" target="_blank">${linkText}</a>`
      })

  for (const line of lines) {
    if (line.match(/^# /)) {
      closeList()
      result.push(`<h1 class="text-2xl font-bold mt-6 mb-2">${inline(line.slice(2))}</h1>`)
    } else if (line.match(/^## /)) {
      closeList()
      result.push(`<h2 class="text-xl font-semibold mt-5 mb-2 border-b border-stone-200 pb-1">${inline(line.slice(3))}</h2>`)
    } else if (line.match(/^### /)) {
      closeList()
      result.push(`<h3 class="text-lg font-medium mt-4 mb-1">${inline(line.slice(4))}</h3>`)
    } else if (line.match(/^- /)) {
      if (!inUl) { result.push('<ul class="list-disc list-inside space-y-1 my-2 ml-2">'); inUl = true }
      result.push(`<li>${inline(line.slice(2))}</li>`)
    } else if (line.match(/^\d+\. /)) {
      if (!inOl) { result.push('<ol class="list-decimal list-inside space-y-1 my-2 ml-2">'); inOl = true }
      result.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`)
    } else if (line.trim() === '') {
      closeList()
      result.push('<br />')
    } else {
      closeList()
      result.push(`<p class="my-1">${inline(line)}</p>`)
    }
  }
  closeList()
  return result.join('\n')
}
