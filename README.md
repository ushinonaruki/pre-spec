# pre-spec

AI が質問し、人間が判断する。その対話を積み上げて仕様書 (`spec.md`) を作る 1 人用ワークベンチ。

## これなに？

SDD が注目されることで、高品質な仕様書 (`spec.md`) が求められる機会が増えてきた。
このまま SDD が普及していくなら、世のITエンジニアたちの多くは「AIに渡す仕様書をせっせと作る」ことが業務の中心的なものとなるだろう。

しかし、ここで疑問がある。

【要件定義書】を作成する際、作り手（エンジニア）は**クライアントの曖昧な「要望」を「要件」とするために作り手側主導のヒアリング**を行うだろう。

それなら、

【仕様書】を作成する際、作り手（AI）は**エンジニアの曖昧な「実装案」を「仕様」とするために作り手側主導のヒアリング**を行うべきではないだろうか。

GitHub Spec Kit の `clarify` なども、本質的には「エンジニアの脳内にある仕様書を聞き返す」仕組みに近い。  
つまり、今の AI 実装ワークフローではエンジニアが最初から完成度の高い `spec.md` を書けることが前提になりがちである。
だがこれは、クライアントに対して「最初から完璧な要件定義書を書ければ、仕様の認識ズレは起きないよね」と求めるのに近い状態ではないだろうか。

そのため私は『 **AI による能動的なインタビューで進行し、作成中の仕様書に「曖昧さ」を許容する仕様書作成ツール**』を提案したい。

pre-spec は、参考資料を読み込んだ AI が質問し、ユーザーが回答・スキップ・編集（・保存/再開）を積み上げ、それを何度も何度も周回することで仕様書としての完成度を上げていくアプローチをとる。

## 必要なもの

- Docker
- Anthropic API キー

## セットアップ

```bash
cp .env.example .env
# .env の ANTHROPIC_API_KEY に Claude API キーを設定する
```

## 起動

```bash
docker compose up --build
```

ブラウザで <http://localhost:3000> を開く。

## 概念

| 概念 | 説明 |
| --- | --- |
| **Workspace** | プロジェクト全体のコンテナ。作業ファイル（`.pre-spec.json`）に保存される |
| **Feature** | Workspace 内の個別機能・領域。それぞれ独立した `spec.md` / `references.md` / `timeline.md` を持つ |
| **References** | AI への参照情報。Global（Workspace 共通）と Local（Feature 固有）の 2 層構成 |

## 使い方

### 新規 Workspace

1. **新規 Workspace 作成** を選び、Workspace 名（slug）を入力する
2. 全 Feature に共通する関連資料（ファイル・URL）があれば追加する
3. **作成** を押して Workspace を作成する
4. **[+ Feature]** で Feature を追加する。Feature 名・要件定義メモ（.md / .txt）・Feature 固有の関連資料を入力する
5. **作成** を押すと AI が要件定義メモを読んで `spec.md` への初期反映を提案する

### インタビュー

- AI がセクションごとに質問を生成する
- 回答するか、スキップして未決事項として残す
- **[次へ →]** で次のセクションに進む。全セクションを回ったら先頭に戻る（繰り返すことで `spec.md` を育てる）
- **Edit** で `spec.md` を直接編集できる
- **[+ Feature]** で Feature を追加し、複数の仕様を並行して育てられる
- 準備ができたら **📥** ボタンで成果物を出力する

### 作業の再開

**作業ファイルを開く** で `{workspace-slug}.pre-spec.json` を選んで読み込む。

## ファイル

### 作業ファイル（再開用）

| ファイル | 内容 |
| --- | --- |
| `{workspace-slug}.pre-spec.json` | 全 Feature の作業状態（ JSON 形式） |

### 成果物（📥 出力時）

出力先ディレクトリを選ぶと、以下の構成でファイルが書き出される：

```text
{選んだディレクトリ}/
  specs/
    {feature-slug}/
      spec.md          仕様書（GitHub Spec Kit テンプレート準拠）
      references.md    整理された参照メモ
      timeline.md      質問・回答・スキップ・編集の履歴
```

Feature が複数ある場合は `specs/` 配下にそれぞれのディレクトリが作られる。

## マーカー

`spec.md` 内にマーカーを記述して、AI の挙動や出力前チェックを制御できる。

**skip マーカー**（組み込み）— スキップした未決事項をインラインに残す:

```text
- [pre-spec:skip:thinking] ...
- [pre-spec:skip:need_confirm] ...
- [pre-spec:skip:need_research] ...
- [pre-spec:skip:defer_to_implementation] ...
- [pre-spec:skip:low_priority] ...
- [pre-spec:skip:custom] ...
```

`public/pre-spec.skip-reasons.json` でスキップ理由の文言・AI への指示を変更できる。

**その他のマーカー**（`public/pre-spec.markers.json` で定義）:

| マーカー | 用途 |
| --- | --- |
| `[pre-spec:revisit]` | 再確認が必要な箇所 |
| `[pre-spec:protected]` | 既存判断・制約として慎重に扱う箇所 |

`public/pre-spec.markers.json` を編集してマーカーの追加・変更ができる。
