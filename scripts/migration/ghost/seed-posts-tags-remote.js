#!/usr/bin/env node

/**
 * Seed posts_tags to remote D1 database
 * Only seeds relationships where both post_id and tag_id exist
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// SQL エスケープ
function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return "'" + String(value).replace(/'/g, "''") + "'";
}

// D1 から既存の ID を取得
function getExistingIds(tableName) {
  console.log(`🔍 ${tableName} の ID を取得中...`);
  const cmd = `wrangler d1 execute monogs-db --remote --command="SELECT id FROM ${tableName}" --json`;

  try {
    const output = execSync(cmd, { encoding: 'utf-8' });
    const results = JSON.parse(output);

    if (results && results.length > 0 && results[0].results) {
      const ids = new Set(results[0].results.map(row => row.id));
      console.log(`   ✓ ${ids.size} 件の ID を取得\n`);
      return ids;
    }
  } catch (e) {
    console.error(`   ❌ ${tableName} の ID 取得に失敗`);
    console.error(e.message);
  }

  return new Set();
}

// INSERT SQL の生成（バッチ対応）
function generatePostsTagsSQL(postsTags, batchSize = 20) {
  if (!postsTags || postsTags.length === 0) {
    return [];
  }

  const sqlBatches = [];

  for (let i = 0; i < postsTags.length; i += batchSize) {
    const batch = postsTags.slice(i, i + batchSize);

    const valuesSql = batch.map(pt => {
      const id = escapeSqlValue(pt.id);
      const postId = escapeSqlValue(pt.post_id);
      const tagId = escapeSqlValue(pt.tag_id);
      const sortOrder = escapeSqlValue(pt.sort_order || 0);

      return `(${id}, ${postId}, ${tagId}, ${sortOrder})`;
    }).join(',\n  ');

    const sql = `INSERT INTO posts_tags (id, post_id, tag_id, sort_order) VALUES\n  ${valuesSql};`;
    sqlBatches.push(sql);
  }

  return sqlBatches;
}

// D1 にバッチシード
function seedBatches(sqlBatches, totalCount) {
  let successCount = 0;

  for (let i = 0; i < sqlBatches.length; i++) {
    const sql = sqlBatches[i];
    const sqlFile = path.join(__dirname, '../migration-data/seed-posts-tags-batch.sql');
    fs.writeFileSync(sqlFile, sql);

    const cmd = `wrangler d1 execute monogs-db --remote --file="${sqlFile}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      const batchSize = sql.split('VALUES')[1].split(',\n  ').length;
      successCount += batchSize;
      process.stdout.write(`\r   進捗: ${successCount}/${totalCount} 件 (${Math.round(successCount / totalCount * 100)}%)`);
    } catch (e) {
      console.error(`\n   ❌ バッチ ${i + 1} 失敗`);
    }

    // クリーンアップ
    if (fs.existsSync(sqlFile)) {
      fs.unlinkSync(sqlFile);
    }
  }

  console.log('');
  return successCount;
}

// メイン処理
function main() {
  console.log('🔗 posts_tags をリモート D1 にシード中...\n');

  // 既存の posts と tags の ID を取得
  const existingPostIds = getExistingIds('posts');
  const existingTagIds = getExistingIds('tags');

  console.log(`📊 存在確認:`);
  console.log(`   posts: ${existingPostIds.size} 件`);
  console.log(`   tags: ${existingTagIds.size} 件\n`);

  // データ読み込み
  const postsTagsPath = path.join(__dirname, '../migration-data/posts_tags.json');
  if (!fs.existsSync(postsTagsPath)) {
    console.error('❌ posts_tags.json が見つかりません');
    process.exit(1);
  }

  const allPostsTags = JSON.parse(fs.readFileSync(postsTagsPath, 'utf-8'));
  console.log(`📂 posts_tags.json: ${allPostsTags.length} 件\n`);

  // 有効な関係のみをフィルタリング
  const validPostsTags = allPostsTags.filter(pt => {
    return existingPostIds.has(pt.post_id) && existingTagIds.has(pt.tag_id);
  });

  console.log(`🔍 フィルタリング結果:`);
  console.log(`   有効: ${validPostsTags.length} 件`);
  console.log(`   無効: ${allPostsTags.length - validPostsTags.length} 件\n`);

  if (validPostsTags.length === 0) {
    console.log('⊘ シードするデータがありません');
    return;
  }

  // SQL 生成（20件ずつのバッチ）
  console.log('📝 SQL バッチを生成中...');
  const sqlBatches = generatePostsTagsSQL(validPostsTags, 20);
  console.log(`   ${sqlBatches.length} バッチを生成\n`);

  // D1 にシード
  console.log('💾 リモート D1 にシード中...\n');
  const successCount = seedBatches(sqlBatches, validPostsTags.length);

  if (successCount === validPostsTags.length) {
    console.log('\n✅ posts_tags のシードが完了しました!');
    console.log(`   ${successCount} 件の関係を追加\n`);
  } else {
    console.log('\n⚠️  一部のシードに失敗しました');
    console.log(`   成功: ${successCount}/${validPostsTags.length} 件\n`);
  }
}

main();
