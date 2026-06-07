import { validatePreSpecWorkspace } from '@/src/schema-normalizer/normalizeWorkspaceFile'

export function parseAndValidateWorkspaceFile(content: string): unknown {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('ファイルの JSON パースに失敗しました')
  }
  if (!validatePreSpecWorkspace(parsed)) {
    throw new Error('ファイル形式が不正です (.pre-spec.json)')
  }
  return parsed
}
