# Git ワークフロー

## ブランチ戦略

このプロジェクトでは、以下のブランチ戦略を使用しています。

### ブランチ構成

- **main**: 本番環境用のブランチ
- **preview**: プレビュー環境用のブランチ

### デプロイフロー

```
┌──────────┐         ┌──────────────┐         ┌────────────────────┐
│  preview │ ───────>│ Cloudflare   │ ───────>│ Preview環境        │
│  branch  │         │ Pages        │         │ preview.monogs     │
└──────────┘         │ (自動デプロイ)│         │ .pages.dev         │
                     └──────────────┘         └────────────────────┘

┌──────────┐         ┌──────────────┐         ┌────────────────────┐
│   main   │ ───────>│ Cloudflare   │ ───────>│ 本番環境           │
│  branch  │         │ Pages        │         │ monogs.pages.dev   │
└──────────┘         │ (自動デプロイ)│         │ or monogs.net      │
                     └──────────────┘         └────────────────────┘
```

## Cloudflare Pagesとの連携

### 自動デプロイ設定

Cloudflare Pagesは、GitHubリポジトリと連携して自動デプロイを行います。

#### 設定手順

1. **Cloudflare Pagesダッシュボード**にアクセス
   https://dash.cloudflare.com/ → Pages → monogs

2. **Settings** → **Builds & deployments**

3. **Production branch**: `main`を設定

4. **Preview branches**: `preview`を設定

5. **Build settings**:
   - Build command: `npm run build:cloudflare`
   - Build output directory: `.open-next`
   - Root directory: `/`

6. **Environment variables**:
   - Production環境とPreview環境それぞれで環境変数を設定

### 手動デプロイコマンド

必要に応じて、ローカルから手動でデプロイすることもできます。

#### プレビュー環境へデプロイ
```bash
# previewブランチにいることを確認
git checkout preview
# デプロイ
npm run deploy:cloudflare
```

#### 本番環境へデプロイ
```bash
# mainブランチにいることを確認
git checkout main
# デプロイ
npm run deploy:cloudflare:production
```

## .gitignore設定

以下のファイルはGitから除外されています：

### ビルド成果物
- `.next/` - Next.jsビルド出力
- `.open-next/` - OpenNext Cloudflareビルド出力
- `.vercel/` - Vercelビルド出力

### 環境変数（機密情報）
- `.env.local` - ローカル開発環境変数
- `.env.production` - 本番環境変数（機密情報を含む）
- `.env` - 環境変数

### データベース
- `drizzle/local.db` - ローカルSQLiteデータベース
- `drizzle/local.db-shm`
- `drizzle/local.db-wal`

### その他
- `migration-data/*.json` - 移行データ（大きなファイル）
- `.wrangler/` - Wranglerキャッシュ
- `.minio.sys/` - MinIO（ローカルストレージ）

## 開発ワークフロー

### 1. 新機能の開発

```bash
# previewブランチで開発
git checkout preview

# 変更を加える
# ...

# コミット
git add .
git commit -m "feat: 新機能を追加"

# プッシュ（自動的にプレビュー環境にデプロイされる）
git push origin preview
```

### 2. 本番環境へのリリース

```bash
# mainブランチに切り替え
git checkout main

# previewブランチをマージ
git merge preview

# プッシュ（自動的に本番環境にデプロイされる）
git push origin main
```

## トラブルシューティング

### デプロイが失敗する場合

1. **ビルドログを確認**
   - Cloudflare Pagesダッシュボードでビルドログを確認
   - エラーメッセージを確認

2. **ローカルでビルドテスト**
   ```bash
   npm run build:cloudflare
   ```

3. **環境変数を確認**
   - Cloudflare Pagesダッシュボードで環境変数が正しく設定されているか確認

### ブランチが間違っている場合

```bash
# 現在のブランチを確認
git branch

# 正しいブランチに切り替え
git checkout preview  # or main
```
