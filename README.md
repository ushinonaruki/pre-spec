# pre-spec

AI は質問し、人間が判断する。その判断を `spec.md` に積み上げ、AI 実装 / SDD に渡す仕様書を作る 1 人用 Markdown ワークベンチ。

## セットアップ

`.env.example` をコピーして `.env` を作成します。

```bash
cp .env.example .env
```

`.env` の `ANTHROPIC_API_KEY` に Claude API キーを設定します。

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

それ以外の変数はデフォルトのままで動きます。

## 起動方法 (Docker)

```bash
docker compose up --build
```

初回は `npm ci` でイメージをビルドするため数分かかります。
2 回目以降はキャッシュが効くので高速です。

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### よく使うコマンド

```bash
# 起動
docker compose up --build

# バックグラウンド起動
docker compose up --build -d

# 停止
docker compose down

# node_modules volume ごと削除してクリーンリビルド
docker compose down -v
docker compose up --build
```

### 依存パッケージを追加するとき

```bash
# package.json を手動編集してから:
docker compose down -v
docker compose up --build
```

> `node_modules` はコンテナ内の Docker volume で管理しています。
> ホスト側に `node_modules` は作成されません。

## ワークフロー

起動画面で **作業ファイルを開く**（`{slug}.pre-spec.json` を選んで再開）か **新規作成** を選ぶ。

新規作成の流れ:

1. **初期入力** — プロジェクト名と要件定義メモをファイルアップロードする。関連資料（ファイル・URL）があれば追加し、各資料に読み方メモを添えられる。AI が資料を確認して `references.md` に整理する。
2. **初期反映** — AI が要件定義メモから各セクションへの配置案を質問形式で提示。回答・修正依頼・スキップによって反映する。
3. **インタビュー** — セクションごとに AI が質問を生成。回答・スキップを繰り返して `spec.md` を育てる。
4. **直接編集** — `[Edit]` で `spec.md` を手動編集。変更は `timeline.md` に記録される。
5. **出力** — 未回答質問とマーカーがすべて 0 件ならそのまま出力。残留がある場合は件数を確認してから出力を選択する。

## 作業ファイル

| ファイル | 内容 |
| --- | --- |
| `{slug}.pre-spec.json` | 作業ファイル（再開用） |

## 出力ファイル

| ファイル | 内容 |
| --- | --- |
| `{slug}.spec.md` | 育てた仕様書 |
| `{slug}.references.md` | AI が整理した参照メモ |
| `{slug}.timeline.md` | 質問・回答・編集の履歴 |

## マーカー

`spec.md` 内でマーカーを使い、質問生成・出力前チェックの挙動を制御できます。

### 組み込みマーカー（skip）

skip は組み込みマーカーです。`pre-spec.markers.json` に依存せず常に使用できます。

| マーカー | 形式 | 用途 |
| --- | --- | --- |
| `[pre-spec:skip:{reason}]` | インライン | スキップ済み未決事項 |

`{reason}` は `thinking` / `need_confirm` / `need_research` / `defer_to_implementation` / `low_priority` のいずれか。

### マーカー定義ファイル

`revisit` と `protected` は `public/pre-spec.markers.json` の初期設定として定義されています。

| マーカー | 形式 | 用途 |
| --- | --- | --- |
| `[pre-spec:revisit]` | インライン / 範囲指定 | 再確認が必要な箇所の目印 |
| `[pre-spec:protected]` | インライン / 範囲指定 | AI が自動変更提案してはならない箇所 |

このファイルを編集することで、マーカーの追加・削除・説明の変更・AI への読み方指示の変更ができます。

## 構成

```text
app/
  page.tsx           メインワークベンチ画面
  api/llm/route.ts   Anthropic API プロキシ
components/          UI コンポーネント
public/
  pre-spec.markers.json  マーカー定義
lib/
  ldd/               LDD ワークフロー（project 初期化・spec 更新・timeline 管理）
  llm/               LLM クライアント・プロンプト
  text/              UI 文言定数
  markdown.ts        Markdown パース
  references.ts      references.md ブロックビルダー
  relatedSources.ts  関連資料ビルダー
  markers.ts         マーカー定義・抽出
  preflight.ts       出力前チェック
  projectFile.ts     作業ファイル変換・バリデーション
types/               TypeScript 型定義
```

## VS Code Dev Containers での開発

TypeScript の型チェックをコンテナ内の `node_modules` で動かす場合は Dev Containers を使います。

**前提**: VS Code 拡張機能 [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) をインストール済みであること。

1. VS Code でこのフォルダを開く
2. コマンドパレット (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Dev Containers: Reopen in Container**
3. 初回はイメージビルドと `npm ci` が走るため数分かかります
4. コンテナ起動後、`npm run dev` が自動的に開始します
5. ブラウザで [http://localhost:3000](http://localhost:3000) を開く

コンテナを閉じるには **Dev Containers: Reopen Folder Locally** でローカルに戻ります。
