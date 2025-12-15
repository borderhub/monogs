#!/usr/bin/env node

/**
 * Preview → Production: postsのfeature_imageだけを同期（他のカラムは触らない）
 */

const { execSync } = require('child_process');

console.log('Preview環境からpostsデータを取得中...');
const postsJson = execSync(
  'npx wrangler d1 execute monogs-db-preview --remote --command="SELECT id, feature_image FROM posts" --json',
  { encoding: 'utf-8' }
);

const postsData = JSON.parse(postsJson);
const posts = postsData[0].results;

console.log(`Found ${posts.length} posts in preview`);

function escapeSqlString(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + str.toString().replace(/'/g, "''") + "'";
}

let successCount = 0;
let skipCount = 0;

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  console.log(`Processing ${i + 1}/${posts.length}: ID ${post.id}`);

  // UPSERT文: idで衝突したら feature_image だけ更新
  const upsertSql = `
    INSERT INTO posts (id, feature_image) 
    VALUES (${post.id}, ${escapeSqlString(post.feature_image)})
    ON CONFLICT(id) DO UPDATE SET
      feature_image = excluded.feature_image;
  `.trim();

  // サイズチェック（念のため）
  const sqlSize = Buffer.byteLength(upsertSql, 'utf8');
  if (sqlSize > 100000) {
    console.log(`  ⚠️ Skipping (too large: ${(sqlSize / 1024).toFixed(2)} KB)`);
    skipCount++;
    continue;
  }

  try {
    execSync(
      `npx wrangler d1 execute monogs-db --remote --command="${upsertSql.replace(/"/g, '\\"')}"`,
      { stdio: 'pipe' }
    );
    console.log(`  ✓ Updated feature_image`);
    successCount++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message.trim()}`);
    skipCount++;
  }
}

console.log(`\n完了: ${successCount} 件更新成功, ${skipCount} 件スキップ/失敗`);
