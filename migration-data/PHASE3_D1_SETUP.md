# Phase 3: Cloudflare D1 シード - セットアップガイド

生成日時: 2025-12-07 02:24

---

## ✅ 完了した作業

### 1. Drizzle ORM スキーマ定義

**ファイル**: `lib/db/schema.ts`

**テーブル構成**:
- ✅ `posts` (22カラム、5インデックス)
- ✅ `tags` (7カラム、2インデックス)
- ✅ `posts_tags` (4カラム、2インデックス、2外部キー)
- ✅ `users` (11カラム、4インデックス)
- ✅ `settings` (5カラム、2インデックス)
- ✅ `sessions` (5カラム、3インデックス、1外部キー) - NextAuth用

### 2. Drizzle Kit 設定

**ファイル**: `drizzle.config.ts`

```typescript
{
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'monogs-db',
  }
}
```

### 3. マイグレーションファイル生成

**コマンド実行**:
```bash
npx drizzle-kit generate
```

**生成ファイル**:
- ✅ `drizzle/migrations/0000_lyrical_betty_ross.sql` (3.6KB)
- ✅ `drizzle/migrations/meta/` (メタデータ)

### 4. シードスクリプト作成

**ファイル**: `scripts/seed-d1.js`

**機能**:
- ✅ migration-data/ からJSONファイルを読み込み
- ✅ INSERT SQL を自動生成
- ✅ wrangler 経由でD1にシード
- ✅ ローカル / 本番 モード切替
- ✅ エラーハンドリング

### 5. NPMスクリプト追加

**package.json**:
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate:local": "wrangler d1 migrations apply monogs-db --local",
  "db:migrate:prod": "wrangler d1 migrations apply monogs-db",
  "db:seed:local": "npm run seed-d1 -- --input ./migration-data/ --database monogs-db --local",
  "db:seed:prod": "npm run seed-d1 -- --input ./migration-data/ --database monogs-db",
  "db:studio": "drizzle-kit studio"
}
```

### 6. 依存関係インストール

```bash
npm install
```

**追加パッケージ**:
- ✅ `drizzle-orm@^0.36.4`
- ✅ `drizzle-kit@^0.30.0`
- ✅ `wrangler@^3.96.0`
- ✅ `typescript@^5.7.2`

---

## 📋 次のステップ: D1データベースの作成とシード

### Step 1: Cloudflare にログイン

```bash
npx wrangler login
```

ブラウザが開き、Cloudflareアカウントで認証します。

### Step 2: D1 データベースを作成

```bash
npx wrangler d1 create monogs-db
```

**出力例**:
```
✅ Successfully created DB 'monogs-db' in region APAC
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "monogs-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 3: wrangler.toml を更新

`wrangler.toml` の `database_id` を更新:

```toml
[[d1_databases]]
binding = "DB"
database_name = "monogs-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← ここを更新
migrations_dir = "drizzle/migrations"
```

### Step 4: マイグレーション適用（ローカルテスト）

```bash
npm run db:migrate:local
```

**期待される出力**:
```
🌀 Executing on local database monogs-db (xxxx-xxxx-xxxx-xxxx) from drizzle/migrations:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
├ [#01] 0000_lyrical_betty_ross.sql
└ Done!
```

### Step 5: データシード（ローカルテスト）

```bash
npm run db:seed:local
```

**期待される出力**:
```
🚀 D1 シードスクリプト

📂 入力: ./migration-data/
🗄️  データベース: monogs-db
🏠 モード: ローカル

📂 データファイルを読み込み中...
  ✓ posts-final.json: 62 件
  ✓ tags.json: 16 件
  ✓ posts_tags.json: 140 件
  ✓ users.json: 2 件
  ✓ settings.json: 6 件

📝 SQL を生成中...

💾 D1 にシード中...
  ✓ users: シード完了
  ✓ tags: シード完了
  ✓ posts: シード完了
  ✓ posts_tags: シード完了
  ✓ settings: シード完了

📊 シード結果:
──────────────────────────────────────────────────
  成功: 5/5 テーブル
──────────────────────────────────────────────────

✅ すべてのデータのシードが完了しました!
```

### Step 6: データ検証（ローカル）

```bash
npx wrangler d1 execute monogs-db --local \
  --command="SELECT COUNT(*) as total FROM posts;"
```

**期待される出力**:
```
┌───────┐
│ total │
├───────┤
│ 62    │
└───────┘
```

**その他の確認コマンド**:
```bash
# タグ数確認
npx wrangler d1 execute monogs-db --local \
  --command="SELECT COUNT(*) as total FROM tags;"

# 公開記事数確認
npx wrangler d1 execute monogs-db --local \
  --command="SELECT COUNT(*) as total FROM posts WHERE status='published';"

# 最新記事5件
npx wrangler d1 execute monogs-db --local \
  --command="SELECT title, slug, published_at FROM posts WHERE status='published' ORDER BY published_at DESC LIMIT 5;"
```

### Step 7: 本番環境へのデプロイ

ローカルテストが成功したら、本番環境にデプロイ:

```bash
# マイグレーション適用（本番）
npm run db:migrate:prod

# データシード（本番）
npm run db:seed:prod
```

---

## 🔍 Drizzle Studio でデータを確認

```bash
npm run db:studio
```

ブラウザで `https://local.drizzle.studio` が開き、D1データベースをGUIで確認できます。

---

## ⚠️ 注意事項

### 1. database_id が必須
ローカルテストでも `wrangler.toml` の `database_id` が設定されている必要があります。
空文字列の場合、wranglerがデータベースを認識できません。

### 2. wrangler のバージョン
現在の wrangler 3.x は最新の 4.x にアップデート可能です:
```bash
npm install --save-dev wrangler@4
```

### 3. シードの再実行
データを再シードする場合、まずテーブルをクリア:
```bash
npx wrangler d1 execute monogs-db --local \
  --command="DELETE FROM posts_tags; DELETE FROM posts; DELETE FROM tags; DELETE FROM users; DELETE FROM settings;"
```

その後、再度 `npm run db:seed:local` を実行。

### 4. マイグレーションの追加
スキーマを変更した場合:
```bash
# 1. スキーマ変更 (lib/db/schema.ts)
# 2. マイグレーション生成
npm run db:generate
# 3. マイグレーション適用
npm run db:migrate:local
```

---

## 📊 Phase 3 統計

| 項目 | 値 |
|------|-----|
| スキーマ定義 | 6テーブル |
| マイグレーションSQL | 3.6KB |
| 移行データ | 62記事、16タグ、140リレーション |
| シードスクリプト | 完成 |
| 依存関係 | インストール済み |

---

## 🎯 次フェーズ

Phase 3 完了後は、以下に進みます：

**Phase 4: Next.js プロジェクトセットアップ**
- `npx create-next-app@latest`
- Tailwind CSS 設定
- NextAuth.js 設定
- Cloudflare Pages 対応 (@opennextjs/cloudflare)

**Phase 5: フロントエンド実装**
- 記事一覧・詳細ページ
- タグページ
- レイアウトコンポーネント

**Phase 6: 管理画面実装**
- 認証機能
- 記事CRUD
- Markdownエディタ

---

## トラブルシューティング

### エラー: "Couldn't find a D1 DB"
→ `wrangler.toml` の `database_id` を設定してください

### エラー: "No migrations present"
→ `migrations_dir = "drizzle/migrations"` が正しく設定されているか確認

### エラー: "UNIQUE constraint failed"
→ テーブルを一度削除してから再シード

---

## まとめ

Phase 3では、Cloudflare D1用のスキーマ定義、マイグレーション生成、シードスクリプトの作成が完了しました。

次のステップとして、実際にCloudflareアカウントでD1データベースを作成し、データを投入してください。
