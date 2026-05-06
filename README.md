# pre-spec

LDD Interview Workbench — AI実装に渡す spec.md を質問・回答・スキップ・参照メモで育てる1人用Markdownワークベンチ。

## 起動方法 (Docker)

```bash
docker compose up --build
```

初回は `npm ci` でイメージをビルドするため数分かかります。
2回目以降はキャッシュが効くので高速です。

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

## VS Code Dev Containers での開発

TypeScript の型チェックをコンテナ内の `node_modules` で動かす場合は Dev Containers を使います。

**前提**: VS Code 拡張機能 [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) をインストール済みであること。

1. VS Code でこのフォルダを開く
2. コマンドパレット (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Dev Containers: Reopen in Container**
3. 初回はイメージビルドと `npm ci` が走るため数分かかります
4. コンテナ起動後、`npm run dev` が自動的に開始します
5. ブラウザで [http://localhost:3000](http://localhost:3000) を開く

コンテナを閉じるには **Dev Containers: Reopen Folder Locally** でローカルに戻ります。

## 構成

```
app/          Next.js App Router ページ・APIルート
components/   UIコンポーネント
lib/          ユーティリティ (markdown, storage, logBuilder 等)
types/        TypeScript 型定義
```

状態は **localStorage** に保存されます。ブラウザを閉じても復元できます。
