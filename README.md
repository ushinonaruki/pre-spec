# pre-spec

LDD Interview Workbench — AI 実装に渡す `spec.md` を質問・回答・スキップ・参照メモで育てる 1 人用 Markdown ワークベンチ。

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

1. **新規作成** — プロジェクト名と要件定義メモを入力して開始。関連資料（テキスト・ファイル・URL）があれば追加（AI が確認して `references.md` に整理）。
2. **初期反映** — AI が要件定義メモを読んで各セクションへの初期配置案を質問形式で提示。OK / 修正して反映を選ぶ。
3. **インタビュー** — セクションごとに AI が質問を生成。回答・スキップ・AI 推定値の採用を繰り返して `spec.md` を育てる。
4. **直接編集** — `spec.md` を手動編集して `timeline.md` に記録。
5. **出力** — 出力前チェック（未回答質問・マーカー残留確認）後、`spec.md` / `references.md` / `timeline.md` をダウンロード。

作業状態は `{slug}.pre-spec.json` として保存・復元できます（ブラウザの localStorage は使用しません）。

## 出力ファイル

| ファイル | 内容 |
| -------- | ---- |
| `{slug}.spec.md` | 育てた仕様書 |
| `{slug}.references.md` | AI が整理した参照メモ |
| `{slug}.timeline.md` | 質問・回答・編集の履歴 |
| `{slug}.pre-spec.json` | 作業ファイル（再開用） |

## マーカー

`spec.md` 内で以下のマーカーを使い、質問生成・出力前チェックの挙動を制御できます。

| マーカー | 形式 | 用途 |
| -------- | ---- | ---- |
| `[pre-spec:revisit]` | インライン / range | 再確認が必要な箇所の目印 |
| `[pre-spec:protected]` | インライン / range | AI が書き換えないよう保護する箇所 |
| `[pre-spec:skip]` | インライン | スキップ済み未決事項 |

カスタムマーカーは `public/pre-spec.markers.json` で定義できます。

## 構成

```text
app/
  page.tsx           メインワークベンチ画面
  api/llm/route.ts   Anthropic API プロキシ
components/          UI コンポーネント
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
