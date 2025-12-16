# Preview/Production環境へのデプロイガイド

## 前提条件

- ローカルのSQLiteデータベースが最新の状態
- MinIOに全ての画像ファイルが格納されている
- Cloudflare Workers/R2/D1のアクセス権限がある

## Preview環境へのデプロイ

### Step 1: R2バケットをクリア（Cloudflareダッシュボード）

1. Cloudflareダッシュボードにログイン
2. R2 → `monogs-r2-preview` を選択
3. 全てのオブジェクトを削除

### Step 2: MinIOからR2にファイルをアップロード

```bash
node scripts/upload-minio-to-r2.mjs preview
```

### Step 3: D1データベースを初期化

```bash
# マイグレーションを実行（テーブル作成）
npx wrangler d1 migrations apply monogs-db-preview --remote
```

### Step 4: SQLiteからD1にデータを移行

```bash
node scripts/migrate-sqlite-to-d1.mjs preview
```

### Step 5: コードをpreviewブランチにプッシュ

```bash
git add .
git commit -m "Deploy to preview environment"
git push origin preview
```

### Step 6: Cloudflare Pagesでデプロイを確認

1. Cloudflareダッシュボード → Workers & Pages
2. デプロイが自動的に開始されることを確認
3. デプロイ完了後、Preview URLにアクセスして動作確認

**Preview URL:** https://monogs-preview.shirabegroup.workers.dev

---

## Production環境へのデプロイ

Preview環境で問題がないことを確認後、同様の手順でProduction環境にデプロイします。

### Step 1: R2バケットをクリア（Cloudflareダッシュボード）

1. Cloudflareダッシュボードにログイン
2. R2 → `monogs-r2-upload` を選択
3. 全てのオブジェクトを削除

### Step 2: MinIOからR2にファイルをアップロード

```bash
node scripts/upload-minio-to-r2.mjs production
```

### Step 3: D1データベースを初期化

```bash
# マイグレーションを実行（テーブル作成）
npx wrangler d1 migrations apply monogs-db --remote
```

### Step 4: SQLiteからD1にデータを移行

```bash
node scripts/migrate-sqlite-to-d1.mjs production
```

### Step 5: コードをmainブランチにマージ

```bash
git checkout main
git merge preview
git push origin main
```

### Step 6: Cloudflare Pagesでデプロイを確認

**Production URL:** https://monogs-production.shirabegroup.workers.dev

---

## トラブルシューティング

### ファイルアップロードが失敗する場合

- wranglerが最新版か確認: `npm install -g wrangler`
- Cloudflareにログインしているか確認: `npx wrangler login`

### D1データ移行が失敗する場合

- バッチサイズを小さくする（`migrate-sqlite-to-d1.mjs`の`batchSize`を50に変更）
- テーブルを個別に移行する

### デプロイ後に画像が表示されない場合

- R2のカスタムドメインが設定されているか確認
- 画像URLが正しいか確認（ブラウザのDevToolsでネットワークタブを確認）
