# Ghost → Cloudflare D1/R2 移行スクリプト

## 概要

Ghost CMS の SQLite データベースと画像ファイルを、Cloudflare D1 および R2 に移行するためのスクリプト群。

---

## 前提条件

### 必須ツール
```bash
# Node.js v18 以上
node --version  # v18.x.x 以上

# wrangler CLI
npm install -g wrangler
wrangler --version

# wrangler 認証
wrangler login
```

### 必須環境変数
```bash
# .env.local に設定
GHOST_DB_PATH=../ghost/content/data/ghost-dev.db
GHOST_IMAGES_PATH=../ghost/content/images/
CLOUDFLARE_ACCOUNT_ID=your_account_id
D1_DATABASE_NAME=monogs-db
R2_BUCKET_NAME=monogs-images
```

---

## スクリプト一覧

### 1. `extract-ghost-data.js` - Ghost データ抽出

Ghost SQLite から JSON 形式でデータを抽出する。

#### 使用方法
```bash
node scripts/extract-ghost-data.js \
  --db ../ghost/content/data/ghost-dev.db \
  --output ./migration-data/
```

#### 出力ファイル
```
migration-data/
├── posts.json          # 記事データ（mobiledoc + html）
├── tags.json           # タグデータ
├── users.json          # ユーザーデータ
├── posts_tags.json     # 記事-タグ関連
├── settings.json       # サイト設定
└── image-mapping.json  # 画像パスの新旧対応表
```

#### 抽出対象テーブル
| テーブル | 抽出カラム |
|---------|-----------|
| posts | id, uuid, title, slug, mobiledoc, html, feature_image, status, published_at, meta_title, meta_description, og_image, twitter_image, custom_excerpt |
| tags | id, name, slug, description |
| users | id, name, slug, email, bio, profile_image |
| posts_tags | post_id, tag_id, sort_order |
| settings | key, value (navigation, title, description, logo) |

#### スクリプト実装例
```javascript
// scripts/extract-ghost-data.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dbPath = args[args.indexOf('--db') + 1];
const outputDir = args[args.indexOf('--output') + 1];

const db = new Database(dbPath, { readonly: true });

// posts 抽出
const posts = db.prepare(`
  SELECT
    id, uuid, title, slug, mobiledoc, html,
    feature_image, featured, status, visibility,
    meta_title, meta_description, custom_excerpt,
    og_image, og_title, og_description,
    twitter_image, twitter_title, twitter_description,
    published_at, created_at, updated_at
  FROM posts
  WHERE status IN ('published', 'draft')
`).all();

// tags 抽出
const tags = db.prepare(`
  SELECT id, name, slug, description, feature_image
  FROM tags
`).all();

// posts_tags 抽出
const postsTags = db.prepare(`
  SELECT post_id, tag_id, sort_order
  FROM posts_tags
`).all();

// users 抽出
const users = db.prepare(`
  SELECT id, name, slug, email, bio, profile_image
  FROM users
`).all();

// settings 抽出
const settings = db.prepare(`
  SELECT key, value
  FROM settings
  WHERE key IN ('title', 'description', 'navigation', 'logo', 'cover_image')
`).all();

// 画像パスを収集
const imageMapping = new Map();
posts.forEach(post => {
  if (post.feature_image) {
    imageMapping.set(post.feature_image, null); // 後で R2 URL を設定
  }
  // html 内の画像パスも抽出
  const imgRegex = /\/content\/images\/[^"'\s]+/g;
  const matches = post.html?.match(imgRegex) || [];
  matches.forEach(img => imageMapping.set(img, null));
});

// 出力
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'posts.json'), JSON.stringify(posts, null, 2));
fs.writeFileSync(path.join(outputDir, 'tags.json'), JSON.stringify(tags, null, 2));
fs.writeFileSync(path.join(outputDir, 'posts_tags.json'), JSON.stringify(postsTags, null, 2));
fs.writeFileSync(path.join(outputDir, 'users.json'), JSON.stringify(users, null, 2));
fs.writeFileSync(path.join(outputDir, 'settings.json'), JSON.stringify(settings, null, 2));
fs.writeFileSync(
  path.join(outputDir, 'image-mapping.json'),
  JSON.stringify(Object.fromEntries(imageMapping), null, 2)
);

console.log(`Extracted: ${posts.length} posts, ${tags.length} tags, ${users.length} users`);
db.close();
```

---

### 2. `convert-mobiledoc.js` - mobiledoc → Markdown 変換

Ghost の mobiledoc 形式を Markdown/HTML に変換する。

#### 使用方法
```bash
node scripts/convert-mobiledoc.js \
  --input ./migration-data/posts.json \
  --output ./migration-data/posts-converted.json
```

#### mobiledoc 形式の解析
Ghost の mobiledoc は JSON 形式で、以下の構造を持つ:
```json
{
  "version": "0.3.1",
  "atoms": [],
  "cards": [
    ["markdown", {"markdown": "# Title\n\nContent..."}],
    ["image", {"src": "/content/images/...", "caption": "..."}],
    ["html", {"html": "<div>...</div>"}]
  ],
  "markups": [],
  "sections": []
}
```

#### 変換ロジック
```javascript
// scripts/convert-mobiledoc.js
function convertMobiledoc(mobiledocStr) {
  if (!mobiledocStr) return { markdown: '', html: '' };

  try {
    const mobiledoc = JSON.parse(mobiledocStr);
    let markdown = '';
    let html = '';

    mobiledoc.cards?.forEach(([type, payload]) => {
      switch (type) {
        case 'markdown':
          markdown += payload.markdown + '\n\n';
          break;
        case 'html':
          html += payload.html + '\n\n';
          break;
        case 'image':
          markdown += `![${payload.caption || ''}](${payload.src})\n\n`;
          break;
        case 'code':
          markdown += '```' + (payload.language || '') + '\n' + payload.code + '\n```\n\n';
          break;
        case 'embed':
          html += `<div class="embed">${payload.html || ''}</div>\n\n`;
          break;
      }
    });

    return { markdown: markdown.trim(), html: html.trim() };
  } catch (e) {
    console.error('mobiledoc parse error:', e);
    return { markdown: '', html: '' };
  }
}
```

---

### 3. `seed-d1.js` - Cloudflare D1 シード

変換済みデータを D1 データベースに投入する。

#### 前提: Drizzle スキーマ定義
```typescript
// lib/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  uuid: text('uuid').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content'),  // Markdown
  html: text('html'),
  featureImage: text('feature_image'),
  status: text('status').notNull().default('draft'),
  visibility: text('visibility').notNull().default('public'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  customExcerpt: text('custom_excerpt'),
  ogImage: text('og_image'),
  ogTitle: text('og_title'),
  ogDescription: text('og_description'),
  twitterImage: text('twitter_image'),
  twitterTitle: text('twitter_title'),
  twitterDescription: text('twitter_description'),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  featureImage: text('feature_image'),
});

export const postsTags = sqliteTable('posts_tags', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  bio: text('bio'),
  profileImage: text('profile_image'),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),
});
```

#### D1 マイグレーション
```bash
# スキーマをD1にプッシュ
npx wrangler d1 migrations apply monogs-db --local  # ローカルテスト
npx wrangler d1 migrations apply monogs-db          # 本番
```

#### シードスクリプト
```bash
node scripts/seed-d1.js \
  --input ./migration-data/ \
  --database monogs-db \
  --local  # ローカルテスト時
```

#### 実装例
```javascript
// scripts/seed-d1.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const inputDir = args[args.indexOf('--input') + 1];
const database = args[args.indexOf('--database') + 1];
const isLocal = args.includes('--local');

// データ読み込み
const posts = JSON.parse(fs.readFileSync(path.join(inputDir, 'posts-converted.json')));
const tags = JSON.parse(fs.readFileSync(path.join(inputDir, 'tags.json')));
const postsTags = JSON.parse(fs.readFileSync(path.join(inputDir, 'posts_tags.json')));
const users = JSON.parse(fs.readFileSync(path.join(inputDir, 'users.json')));
const settings = JSON.parse(fs.readFileSync(path.join(inputDir, 'settings.json')));

// SQL生成
function generateInsertSQL(table, data) {
  if (!data.length) return '';
  const columns = Object.keys(data[0]);
  const values = data.map(row => {
    const vals = columns.map(col => {
      const v = row[col];
      if (v === null || v === undefined) return 'NULL';
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    return `(${vals.join(', ')})`;
  });
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values.join(',\n')};`;
}

// 各テーブルにシード
const tables = [
  { name: 'users', data: users },
  { name: 'tags', data: tags },
  { name: 'posts', data: posts },
  { name: 'posts_tags', data: postsTags },
  { name: 'settings', data: settings },
];

tables.forEach(({ name, data }) => {
  if (!data.length) return;
  const sql = generateInsertSQL(name, data);
  const sqlFile = path.join(inputDir, `seed-${name}.sql`);
  fs.writeFileSync(sqlFile, sql);

  const cmd = isLocal
    ? `wrangler d1 execute ${database} --local --file=${sqlFile}`
    : `wrangler d1 execute ${database} --file=${sqlFile}`;

  console.log(`Seeding ${name}...`);
  execSync(cmd, { stdio: 'inherit' });
});

console.log('Seed completed!');
```

---

### 4. `upload-to-r2.js` - R2 画像アップロード

Ghost の画像ファイルを Cloudflare R2 にアップロードする。

#### 使用方法
```bash
node scripts/upload-to-r2.js \
  --source ../ghost/content/images/ \
  --bucket monogs-images \
  --mapping ./migration-data/image-mapping.json
```

#### 実装例
```javascript
// scripts/upload-to-r2.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const args = process.argv.slice(2);
const sourceDir = args[args.indexOf('--source') + 1];
const bucket = args[args.indexOf('--bucket') + 1];
const mappingFile = args[args.indexOf('--mapping') + 1];

// 画像ファイルを取得
const images = glob.sync('**/*', { cwd: sourceDir, nodir: true });

console.log(`Found ${images.length} files to upload`);

// マッピング情報を更新
const mapping = JSON.parse(fs.readFileSync(mappingFile));
const r2BaseUrl = `https://images.monogs.net`; // カスタムドメイン or R2 パブリックURL

images.forEach((file, index) => {
  const localPath = path.join(sourceDir, file);
  const r2Key = `content/images/${file}`;

  // wrangler で R2 にアップロード
  const cmd = `wrangler r2 object put ${bucket}/${r2Key} --file=${localPath}`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`[${index + 1}/${images.length}] Uploaded: ${file}`);

    // マッピング更新
    const oldPath = `/content/images/${file}`;
    if (mapping[oldPath] !== undefined) {
      mapping[oldPath] = `${r2BaseUrl}/${r2Key}`;
    }
  } catch (e) {
    console.error(`Failed to upload: ${file}`, e.message);
  }
});

// マッピングファイル更新
fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
console.log('Upload completed! Mapping file updated.');
```

---

### 5. `update-image-urls.js` - 記事内画像 URL 置換

記事の HTML/Markdown 内の画像パスを R2 URL に置換する。

#### 使用方法
```bash
node scripts/update-image-urls.js \
  --posts ./migration-data/posts-converted.json \
  --mapping ./migration-data/image-mapping.json \
  --output ./migration-data/posts-final.json
```

#### 実装例
```javascript
// scripts/update-image-urls.js
const fs = require('fs');

const args = process.argv.slice(2);
const postsFile = args[args.indexOf('--posts') + 1];
const mappingFile = args[args.indexOf('--mapping') + 1];
const outputFile = args[args.indexOf('--output') + 1];

const posts = JSON.parse(fs.readFileSync(postsFile));
const mapping = JSON.parse(fs.readFileSync(mappingFile));

// 各記事の画像URLを置換
const updatedPosts = posts.map(post => {
  let { content, html, featureImage, ogImage, twitterImage } = post;

  Object.entries(mapping).forEach(([oldPath, newUrl]) => {
    if (!newUrl) return;
    const regex = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

    if (content) content = content.replace(regex, newUrl);
    if (html) html = html.replace(regex, newUrl);
    if (featureImage === oldPath) featureImage = newUrl;
    if (ogImage === oldPath) ogImage = newUrl;
    if (twitterImage === oldPath) twitterImage = newUrl;
  });

  return { ...post, content, html, featureImage, ogImage, twitterImage };
});

fs.writeFileSync(outputFile, JSON.stringify(updatedPosts, null, 2));
console.log(`Updated ${updatedPosts.length} posts with new image URLs`);
```

---

### 6. `verify-migration.js` - 移行検証

移行データの整合性をチェックする。

#### 使用方法
```bash
node scripts/verify-migration.js \
  --ghost-db ../ghost/content/data/ghost-dev.db \
  --d1-database monogs-db \
  --r2-bucket monogs-images
```

#### チェック項目
- [ ] 記事数の一致（Ghost: 62 → D1: 62）
- [ ] タグ数の一致（Ghost: 16 → D1: 16）
- [ ] posts_tags 関連の一致
- [ ] 全画像ファイルが R2 に存在
- [ ] 全画像 URL が有効（HTTP 200）
- [ ] 記事内の全画像リンクが有効

---

## 実行手順（まとめ）

```bash
# 1. 依存関係インストール
cd monogs
npm install better-sqlite3 glob

# 2. Ghost データ抽出
node scripts/extract-ghost-data.js \
  --db ../ghost/content/data/ghost-dev.db \
  --output ./migration-data/

# 3. mobiledoc 変換
node scripts/convert-mobiledoc.js \
  --input ./migration-data/posts.json \
  --output ./migration-data/posts-converted.json

# 4. R2 に画像アップロード
node scripts/upload-to-r2.js \
  --source ../ghost/content/images/ \
  --bucket monogs-images \
  --mapping ./migration-data/image-mapping.json

# 5. 記事内画像URL置換
node scripts/update-image-urls.js \
  --posts ./migration-data/posts-converted.json \
  --mapping ./migration-data/image-mapping.json \
  --output ./migration-data/posts-final.json

# 6. D1 スキーマ作成
npx drizzle-kit push:d1

# 7. D1 シード（ローカルテスト）
node scripts/seed-d1.js \
  --input ./migration-data/ \
  --database monogs-db \
  --local

# 8. 検証
node scripts/verify-migration.js \
  --ghost-db ../ghost/content/data/ghost-dev.db \
  --d1-database monogs-db \
  --r2-bucket monogs-images

# 9. 本番 D1 シード
node scripts/seed-d1.js \
  --input ./migration-data/ \
  --database monogs-db
```

---

## トラブルシューティング

### mobiledoc 解析エラー
```
Error: Unexpected token in JSON
```
→ Ghost の古いバージョンでは mobiledoc が不正な JSON の場合あり。`html` カラムをフォールバックとして使用。

### R2 アップロードエラー
```
Error: Missing credentials
```
→ `wrangler login` を再実行。または `CLOUDFLARE_API_TOKEN` を環境変数に設定。

### D1 シードエラー
```
Error: UNIQUE constraint failed
```
→ 既にデータが存在する。`wrangler d1 execute monogs-db --command="DELETE FROM posts"` で削除後に再実行。

### 画像 404 エラー
→ R2 バケットのパブリックアクセス設定を確認。カスタムドメインの場合は DNS 設定を確認。
