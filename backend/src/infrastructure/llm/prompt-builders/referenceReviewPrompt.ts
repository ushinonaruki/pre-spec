import type { RelatedSourceKind } from '@/src/types'

export type RelatedSourceReviewResult = {
  status: 'ok' | 'unreadable'
  content?: string
  reason?: string
}

export function buildRelatedSourceReviewPrompt(params: {
  name: string
  kind: RelatedSourceKind
  content: string
  note?: string
}): string {
  const noteSection = params.note?.trim()
    ? `\n読み方指示:\n${params.note}\n`
    : ''

  const suffix = `
ルール:
- 読める場合: status を "ok" にして、references.md の Imported block 本文として使う content を返す
- 取得・読み込みには成功したが本文が空または空白のみだった場合: status を "ok" にして content に空文字列を返す（unreadable にしない）
- 読めない・アクセスできない場合: status を "unreadable" にして reason を返す
- content は Markdown 形式で仕様化に役立つ情報のみを整理して返す
- spec.md の書き換えは行わない
- 日本語で記述する

有効な JSON のみを返してください（マークダウンコードフェンス・説明文不要）:
{
  "status": "ok",
  "content": "..."
}
または
{
  "status": "unreadable",
  "reason": "..."
}`

  if (params.kind === 'url') {
    return `あなたは pre-spec の関連資料確認エンジンです。

以下の URL を確認して、仕様化に使える知識・制約・注意点を整理してください。

URL: ${params.content}
${noteSection}${suffix}`
  }

  return `あなたは pre-spec の関連資料確認エンジンです。

以下の関連資料を読んで、仕様化に使える知識・制約・注意点を整理してください。

資料名: ${params.name}
種別: user upload
${noteSection}
資料本文:
${params.content}
${suffix}`
}
