import taxonomy from '@/lib/config/questionTaxonomy.json'

export type QuestionKind = keyof typeof taxonomy.kinds
export type QuestionPriority = keyof typeof taxonomy.priorities

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> =
  Object.fromEntries(
    Object.entries(taxonomy.kinds).map(([id, def]) => [id, def.label]),
  ) as Record<QuestionKind, string>

export const QUESTION_PRIORITY_LABELS: Record<QuestionPriority, string> =
  Object.fromEntries(
    Object.entries(taxonomy.priorities).map(([id, def]) => [id, def.label]),
  ) as Record<QuestionPriority, string>

export const QUESTION_PRIORITY_COLORS: Record<QuestionPriority, string> =
  Object.fromEntries(
    Object.entries(taxonomy.priorities).map(([id, def]) => [id, def.color]),
  ) as Record<QuestionPriority, string>

export const KIND_CANDIDATES = Object.keys(taxonomy.kinds).join(' / ')
export const PRIORITY_CANDIDATES = Object.keys(taxonomy.priorities).join(' / ')
