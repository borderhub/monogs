# monogs.net 開発ガイドライン

## 1. プロジェクト概要

**Next.js 16 (App Router) + Cloudflare Workers** で構築されたブログサイト。
Ghost CMSからの移行は完了済み。

## 2. 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) |
| ホスティング | Cloudflare Workers |
| データベース | Cloudflare D1 |
| ストレージ | Cloudflare R2 |
| ORM | Drizzle ORM |
| 認証 | NextAuth.js (Auth.js) v5 |
| スタイル | Tailwind CSS |

## 3. 環境構成

| 環境 | Worker名 | D1 DB | R2 Bucket | URL |
|------|----------|-------|-----------|-----|
| Preview | monogs-preview | monogs-db-preview | monogs-r2-preview | preview.monogs.net |
| Production | monogs-production | monogs-db | monogs-r2-upload | monogs.net |

## 4. ディレクトリ構成

```
/
├── app/                    # Next.js App Router
├── components/             # React コンポーネント
├── lib/                    # ユーティリティ・DB・認証
├── drizzle/                # Drizzle スキーマ・マイグレーション
├── scripts/
│   ├── ops/                # 運用スクリプト（デプロイ等）
│   ├── dev/                # 開発用スクリプト
│   └── migration/          # 移行スクリプト（アーカイブ）
├── migration-data/         # シードSQL（運用で使用）
├── docs/
│   └── archive/            # 移行時のドキュメント
└── public/                 # 静的ファイル
```

## 5. 開発コマンド

```bash
# ローカル開発サーバー起動
npm run dev

# 開発サーバー停止
npm run stop

# ビルド
npm run build

# Cloudflare用ビルド
npm run build:cloudflare
```

## 6. デプロイコマンド

```bash
# Preview環境へのDBリストア
bash ./scripts/ops/deploy-to-preview.sh

# Production環境へのDBリストア
bash ./scripts/ops/deploy-to-production.sh

# Preview環境へデプロイ
npm run deploy:cloudflare:preview

# Production環境へデプロイ
npm run deploy:cloudflare:production

# ログ確認
wrangler tail --env preview
wrangler tail --env production
```

## 7. 開発の原則

- **RSC優先**: 可能な限りServer Componentsを使用
- **Client Componentは最小限**: `use client`はインタラクティブなUIに限定
- **型安全性**: TypeScriptとDrizzle ORMで型を保証
- **Edge Runtime最適化**: Cloudflare Workersで動作するコードを書く

## 8. 注意事項

- 認証が必要なルート（`/admin/*`）は必ずNextAuth.jsで保護
- 画像は R2 から配信（`https://images.monogs.net` または `https://images-preview.monogs.net`）
- 環境変数は `.env.local`（ローカル）と Cloudflare Dashboard（リモート）で管理
