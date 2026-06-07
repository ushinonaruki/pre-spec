# pre-spec frontend-web

Next.js UI。

## 必要なもの

- Docker
- 起動済みの [backend](../backend/)

## セットアップ

```bash
cp .env.example .env.local
# 必要に応じて NEXT_PUBLIC_BACKEND_URL を変更する
```

## 起動

```bash
docker compose up --build
```

UI は `http://localhost:3000` で起動する。

## 環境変数

| 変数 | 説明 | デフォルト |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | バックエンド API の URL | `http://localhost:3001` |
