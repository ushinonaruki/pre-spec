# pre-spec backend

Node.js / Express API サーバー。

## 必要なもの

- Docker

## セットアップ

```bash
cp .env.example .env
# .env の ANTHROPIC_API_KEY に Claude API キーを設定する
```

## 起動

```bash
docker compose up --build
```

API は `http://localhost:3001` で起動する。

## 環境変数

| 変数 | 説明 | デフォルト |
| --- | --- | --- |
| `BACKEND_PORT_HOST` | ホスト側ポート | `3001` |
| `BACKEND_PORT_CONTAINER` | コンテナ側ポート | `3001` |
| `ANTHROPIC_API_KEY` | Anthropic API キー | （必須） |
| `ANTHROPIC_MODEL` | 使用モデル | `claude-haiku-4-5-20251001` |
| `ANTHROPIC_API_VERSION` | API バージョン | `2023-06-01` |
| `ANTHROPIC_MAX_TOKENS` | 最大トークン数 | `2048` |
| `APP_LOCALE` | ロケール | `ja-JP` |
| `APP_TIMEZONE` | タイムゾーン | `Asia/Tokyo` |

## 作業データ

`data/workspaces/{workspace-slug}.pre-spec.json` に保存される（`.gitignore` 対象）。
