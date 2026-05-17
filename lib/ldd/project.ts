import type { Project } from '@/types'
import { SPEC_TEMPLATE, extractSections } from '@/lib/markdown'
import { buildInitialRequirementMemoBlock } from '@/lib/references'
import { buildCheckedAt } from '@/lib/locale'

export type InitialRelatedSource =
  | { kind: 'file'; filename: string; content: string; note?: string }
  | { kind: 'url'; url: string; note?: string }

type CreateProjectInputs = {
  projectFileBase: string
  requirementMemo: string
  requirementMemoFilename?: string
}

export type CreateProjectRequest = CreateProjectInputs & {
  relatedSources?: InitialRelatedSource[]
}

export function createProjectFromInputs({
  projectFileBase,
  requirementMemo,
  requirementMemoFilename,
}: CreateProjectInputs): Project {
  const now = new Date().toISOString()
  const spec = SPEC_TEMPLATE
  const sections = extractSections(spec)
  const firstSection = sections[0] ?? null

  const memoParts: string[] = [
    '# References',
    '',
    buildInitialRequirementMemoBlock(requirementMemo, buildCheckedAt(), requirementMemoFilename ?? 'initial.md'),
  ]

  const referencesMarkdown = memoParts.join('\n')

  return {
    id: crypto.randomUUID(),
    fileBase: projectFileBase,
    createdAt: now,
    updatedAt: now,
    spec,
    referencesMarkdown,
    sections,
    currentSectionId: firstSection?.id ?? null,
    timeline: [],
  }
}
