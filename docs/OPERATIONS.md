# monogs.net 運用・デプロイ手順書

## 1. 環境一覧

| 環境 | Worker名 | D1 Database | D1 ID | R2 Bucket | URL |
|------|----------|-------------|-------|-----------|-----|
| Preview | monogs-preview | monogs-db-preview | `5565ffae-d186-4991-9893-c83f5203a6c5` | monogs-r2-preview | https://preview.monogs.net |
| Production | monogs-production | monogs-db | `d7781133-52aa-41f4-8a30-af1e6c0934b4` | monogs-r2-upload | https://monogs.net |

## 2. デプロイフロー

### 2.1 通常のデプロイ（コード変更のみ）

```bash
# Preview環境へデプロイ
npm run deploy:cloudflare:preview

# Production環境へデプロイ
npm run deploy:cloudflare:production
```

### 2.2 DBリストアを含むデプロイ

#### Preview環境

```bash
# DBリストア（R2同期 + D1初期化 + データ移行）
bash ./scripts/ops/deploy-to-preview.sh

# ビルド＆デプロイ
npm run deploy:cloudflare:preview
```

#### Production環境

```bash
# DBリストア（D1初期化 + データ移行）※R2は現在コメントアウト
bash ./scripts/ops/deploy-to-production.sh

# ビルド＆デプロイ
npm run deploy:cloudflare:production
```

## 3. 運用スクリプト詳細

### 3.1 `scripts/ops/deploy-to-preview.sh`

Preview環境へのフルデプロイスクリプト。以下の処理を実行：

1. **R2バケットクリア**: `monogs-r2-preview` を空にする
2. **MinIO→R2コピー**: ローカルMinIOから画像をR2にアップロード
3. **D1初期化**: テーブルをDROPしてマイグレーション再実行
4. **データ移行**: ローカルSQLite → D1にデータをインポート

### 3.2 `scripts/ops/deploy-to-production.sh`

Production環境へのDBリストアスクリプト。以下の処理を実行：

1. **D1初期化**: テーブルをDROPしてマイグレーション再実行
2. **データ移行**: ローカルSQLite → D1にデータをインポート

> **注意**: R2へのアップロードは現在コメントアウトされています

### 3.3 `scripts/ops/migrate-sqlite-to-d1.mjs`

ローカルSQLite（`drizzle/local.db`）からD1へデータを移行。

```bash
# Preview環境へ移行
node scripts/ops/migrate-sqlite-to-d1.mjs preview

# Production環境へ移行
node scripts/ops/migrate-sqlite-to-d1.mjs production
```

### 3.4 `scripts/ops/sync-minio-to-r2.mjs`

ローカルMinIOからR2へファイルを同期。

```bash
# Preview環境へ同期
node scripts/ops/sync-minio-to-r2.mjs preview

# Production環境へ同期
node scripts/ops/sync-minio-to-r2.mjs production
```

> **前提条件**: MinIOが `localhost:9000` で起動していること

## 4. D1データベース操作

### 4.1 マイグレーション

```bash
# マイグレーションファイル生成
npm run db:generate

# Preview環境にマイグレーション適用
npx wrangler d1 migrations apply monogs-db-preview --remote

# Production環境にマイグレーション適用
npx wrangler d1 migrations apply monogs-db --remote
```

### 4.2 SQLの直接実行

```bash
# Preview環境
npx wrangler d1 execute monogs-db-preview --remote --command="SELECT COUNT(*) FROM posts"

# Production環境
npx wrangler d1 execute monogs-db --remote --command="SELECT COUNT(*) FROM posts"
```

### 4.3 SQLファイルの実行

```bash
# Preview環境
npx wrangler d1 execute monogs-db-preview --remote --file=./migration-data/seed-posts.sql

# Production環境
npx wrangler d1 execute monogs-db --remote --file=./migration-data/seed-posts.sql
```

## 5. R2操作

### 5.1 ファイル一覧

```bash
# Preview環境
npx wrangler r2 object list monogs-r2-preview

# Production環境
npx wrangler r2 object list monogs-r2-upload
```

### 5.2 ファイルアップロード

```bash
# Preview環境
npx wrangler r2 object put monogs-r2-preview/path/to/file.jpg --file=./local-file.jpg

# Production環境
npx wrangler r2 object put monogs-r2-upload/path/to/file.jpg --file=./local-file.jpg
```

## 6. ログ確認

```bash
# Preview環境のログ（リアルタイム）
wrangler tail --env preview

# Production環境のログ（リアルタイム）
wrangler tail --env production
```

## 7. トラブルシューティング

### 7.1 デプロイが失敗する

```bash
# ビルドキャッシュをクリア
rm -rf .next .open-next

# 再ビルド
npm run build:cloudflare
```

### 7.2 D1接続エラー

```bash
# D1の状態確認
npx wrangler d1 info monogs-db-preview
npx wrangler d1 info monogs-db
```

### 7.3 MinIOが起動していない

```bash
# MinIO起動
npm run storage:up

# MinIOログ確認
npm run storage:logs
```

## 8. シードSQLファイル

`migration-data/` に以下のSQLファイルが格納されています：

| ファイル | 内容 |
|---------|------|
| `seed-settings.sql` | サイト設定 |
| `seed-users.sql` | ユーザーデータ |
| `seed-tags.sql` | タグデータ |
| `seed-posts.sql` | 記事データ（メイン） |
| `seed-posts-batch-3.sql` | 記事データ（バッチ3） |
| `seed-posts_tags.sql` | 記事-タグ関連付け |
| `seed-posts_tags-batch-1.sql` | 記事-タグ関連付け（バッチ1） |

## 9. 画像URL

| 環境 | 画像ベースURL |
|------|---------------|
| Preview | https://images-preview.monogs.net |
| Production | https://images.monogs.net |
