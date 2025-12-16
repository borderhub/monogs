#!/usr/bin/env node

/**
 * Production環境からPreview環境にposts_tagsデータをコピー
 */

const { execSync } = require('child_process');

// Production環境からposts_tagsデータを取得
console.log('Fetching posts_tags from production...');
const postsTagsJson = execSync(
  'npx wrangler d1 execute monogs-db --remote --command="SELECT * FROM posts_tags" --json',
  { encoding: 'utf-8' }
);

const postsTagsData = JSON.parse(postsTagsJson);
const postsTags = postsTagsData[0].results;

console.log(`Found ${postsTags.length} posts_tags relationships in production`);

// Preview環境から既存のpostsとtagsのIDを取得
console.log('Fetching existing post and tag IDs from preview...');
const postsIdsJson = execSync(
  'npx wrangler d1 execute monogs-db-preview --remote --command="SELECT id FROM posts" --json',
  { encoding: 'utf-8' }
);
const tagsIdsJson = execSync(
  'npx wrangler d1 execute monogs-db-preview --remote --command="SELECT id FROM tags" --json',
  { encoding: 'utf-8' }
);

const postsIds = new Set(JSON.parse(postsIdsJson)[0].results.map(r => r.id));
const tagsIds = new Set(JSON.parse(tagsIdsJson)[0].results.map(r => r.id));

console.log(`Preview has ${postsIds.size} posts and ${tagsIds.size} tags`);

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

// posts_tags関係をフィルタリングしてコピー
let successCount = 0;
let skipCount = 0;
const batchSize = 20;
let batch = [];

for (let i = 0; i < postsTags.length; i++) {
  const pt = postsTags[i];

  // post_idとtag_idが両方存在するかチェック
  if (!postsIds.has(pt.post_id) || !tagsIds.has(pt.tag_id)) {
    console.log(`Skipping ${pt.id}: post_id=${pt.post_id}, tag_id=${pt.tag_id} (not found in preview)`);
    skipCount++;
    continue;
  }

  // INSERT文を生成
  const insertSql = `INSERT INTO posts_tags (id, post_id, tag_id, sort_order) VALUES (${toSqlValue(pt.id)}, ${toSqlValue(pt.post_id)}, ${toSqlValue(pt.tag_id)}, ${toSqlValue(pt.sort_order)})`;
  batch.push(insertSql);

  // バッチサイズに達したら実行
  if (batch.length >= batchSize || i === postsTags.length - 1) {
    const batchSql = batch.join('; ');
    try {
      execSync(
        `npx wrangler d1 execute monogs-db-preview --remote --command="${batchSql.replace(/"/g, '\\"')}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      console.log(`✓ Inserted batch of ${batch.length} relationships (${successCount + batch.length}/${postsTags.length})`);
      successCount += batch.length;
      batch = [];
    } catch (error) {
      console.log(`✗ Failed batch: ${error.message}`);
      skipCount += batch.length;
      batch = [];
    }
  }
}

console.log(`\nCompleted: ${successCount} successful, ${skipCount} skipped/failed`);
