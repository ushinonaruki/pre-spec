import type { Section } from '@/src/types'
import { KIND_CANDIDATES, PRIORITY_CANDIDATES } from './promptHelpers'

export function buildInitialConfirmationQuestionsPrompt(params: {
  referencesMarkdown: string
  spec: string
  sections: Section[]
}): string {
  const sectionTitles = params.sections.map((s) => `- ${s.title}`).join('\n')
  const refSection = params.referencesMarkdown.trim()
    ? `\nReferences:\n${params.referencesMarkdown}\n`
    : ''

  return `あなたは pre-spec の初期反映質問生成エンジンです。

入力材料を読んで、spec.md の各セクションに「初期配置すべき候補」があれば、反映質問として列挙してください。

## 入力材料
${refSection}
## 現在の spec.md

${params.spec}

## spec.md セクション一覧

${sectionTitles}

## ルール

- spec.md 全文を生成しない
- 入力材料から明確に spec.md へ初期配置すべき候補だけを質問にする
- 1質問 = 1つの反映候補
- sectionTitle は上記セクション一覧の title から選ぶ
- proposedMarkdown は、そのセクションに追記できる Markdown にする（箇条書き推奨）
- 重複質問・薄い確認・単なる言い換えは作らない
- 実装上意味のない確認は作らない
- 判断できないものは質問にせず省く
- 質問数に固定上限なし（必要な数だけ、ただし過剰に作らない）
- 質問は日本語で記述する

kinds 候補: ${KIND_CANDIDATES}
priority 候補: ${PRIORITY_CANDIDATES}

有効な JSON のみを返してください（マークダウンコードフェンス・説明文不要）:
{
  "questions": [
    {
      "sectionTitle": "(セクション名)",
      "text": "(セクション名) に以下を置いてよいですか？",
      "kinds": ["scope"],
      "priority": "high",
      "proposedMarkdown": "- ..."
    }
  ]
}`
}
