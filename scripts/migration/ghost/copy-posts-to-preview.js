#!/usr/bin/env node

/**
 * Production環境からPreview環境にpostsデータをコピー
 */

const { execSync } = require('child_process');

// Production環境からpostsデータを取得
console.log('Fetching posts from production...');
const postsJson = execSync(
  'npx wrangler d1 execute monogs-db --remote --command="SELECT * FROM posts" --json',
  { encoding: 'utf-8' }
);

const postsData = JSON.parse(postsJson);
const posts = postsData[0].results;

console.log(`Found ${posts.length} posts in production`);

// SQLエスケープ関数
function escapeSqlString(str) {
  if (str === null || str === undefined) {
    return 'NULL';
  }
  return "'" + str.toString().replace(/'/g, "''") + "'";
}

function toSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  return escapeSqlString(value);
}

// 投稿を1つずつコピー
let successCount = 0;
let skipCount = 0;

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  console.log(`Processing ${i + 1}/${posts.length}: ${post.title}`);

  // INSERT文を生成
  const insertSql = `INSERT INTO posts (id, uuid, title, slug, content, html, feature_image, gallery_images, featured, status, visibility, meta_title, meta_description, custom_excerpt, og_image, og_title, og_description, twitter_image, twitter_title, twitter_description, published_at, created_at, updated_at) VALUES (${toSqlValue(post.id)}, ${toSqlValue(post.uuid)}, ${toSqlValue(post.title)}, ${toSqlValue(post.slug)}, ${toSqlValue(post.content)}, ${toSqlValue(post.html)}, ${toSqlValue(post.feature_image)}, ${toSqlValue(post.gallery_images)}, ${toSqlValue(post.featured)}, ${toSqlValue(post.status)}, ${toSqlValue(post.visibility)}, ${toSqlValue(post.meta_title)}, ${toSqlValue(post.meta_description)}, ${toSqlValue(post.custom_excerpt)}, ${toSqlValue(post.og_image)}, ${toSqlValue(post.og_title)}, ${toSqlValue(post.og_description)}, ${toSqlValue(post.twitter_image)}, ${toSqlValue(post.twitter_title)}, ${toSqlValue(post.twitter_description)}, ${toSqlValue(post.published_at)}, ${toSqlValue(post.created_at)}, ${toSqlValue(post.updated_at)})`;

  // サイズチェック（100KB以下）
  const sqlSize = Buffer.byteLength(insertSql, 'utf8');
  if (sqlSize > 100000) {
    console.log(`  ⚠️  Skipping (too large: ${(sqlSize / 1024).toFixed(2)} KB)`);
    skipCount++;
    continue;
  }

  // Preview環境に投入
  try {
    execSync(
      `npx wrangler d1 execute monogs-db-preview --remote --command="${insertSql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    console.log(`  ✓ Inserted`);
    successCount++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    skipCount++;
  }
}

console.log(`\nCompleted: ${successCount} successful, ${skipCount} skipped/failed`);
