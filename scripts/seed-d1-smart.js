#!/usr/bin/env node

/**
 * Cloudflare D1 スマートシードスクリプト
 * 大きすぎるレコードをスキップして投入
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    input: null,
    database: null,
    local: false,
    maxSize: 100000, // 最大サイズ（バイト）
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      config.input = args[i + 1];
      i++;
    } else if (args[i] === '--database' && i + 1 < args.length) {
      config.database = args[i + 1];
      i++;
    } else if (args[i] === '--max-size' && i + 1 < args.length) {
      config.maxSize = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--local') {
      config.local = true;
    }
  }

  if (!config.input || !config.database) {
    console.error('使用方法: node seed-d1-smart.js --input <INPUT_DIR> --database <DB_NAME>');
    process.exit(1);
  }

  return config;
}

// SQL エスケープ
function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return "'" + String(value).replace(/'/g, "''") + "'";
}

// INSERT SQL の生成（単一レコード）
function generateInsertSQL(tableName, record, columnMap) {
  const columns = Object.keys(columnMap);
  const columnsSql = columns.join(', ');
  
  const values = columns.map(col => {
    const sourceKey = columnMap[col];
    return escapeSqlValue(record[sourceKey]);
  });
  
  return `INSERT INTO ${tableName} (${columnsSql}) VALUES (${values.join(', ')});`;
}

// SQLサイズを計算
function getSqlSize(sql) {
  return Buffer.byteLength(sql, 'utf8');
}

// D1 に1件ずつシード
function seedRecords(tableName, records, columns, database, isLocal, maxSize) {
  if (!records || records.length === 0) {
    console.log(`  ⊘ ${tableName}: データなし`);
    return { success: 0, skipped: 0 };
  }

  let successCount = 0;
  let skippedCount = 0;
  const remoteFlag = isLocal ? '--local' : '--remote';

  console.log(`  📦 ${tableName}: ${records.length} 件を処理中`);

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const sql = generateInsertSQL(tableName, record, columns);
    const size = getSqlSize(sql);

    if (size > maxSize) {
      skippedCount++;
      console.log(`     ⊘ [${i + 1}/${records.length}] スキップ (${Math.round(size / 1024)}KB): ${record.title || record.slug || record.id}`);
      continue;
    }

    const sqlFile = path.join('migration-data', `seed-${tableName}-${i + 1}.sql`);
    fs.writeFileSync(sqlFile, sql);

    const cmd = `wrangler d1 execute ${database} ${remoteFlag} --file="${sqlFile}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      successCount++;
      process.stdout.write(`\r     進捗: ${successCount}/${records.length - skippedCount} 件成功, ${skippedCount} 件スキップ`);
      fs.unlinkSync(sqlFile);
    } catch (e) {
      console.error(`\n     ❌ [${i + 1}] 失敗: ${record.title || record.id}`);
      if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
    }
  }

  console.log(`\n  ✓ ${tableName}: ${successCount} 件成功, ${skippedCount} 件スキップ`);
  return { success: successCount, skipped: skippedCount };
}

// メイン処理
function main() {
  console.log('🚀 D1 スマートシードスクリプト\n');

  const config = parseArgs();

  console.log(`📂 入力: ${config.input}`);
  console.log(`🗄️  データベース: ${config.database}`);
  console.log(`📏 最大サイズ: ${Math.round(config.maxSize / 1024)}KB`);
  console.log(`🏠 モード: ${config.local ? 'ローカル' : '本番'}\n`);

  // データ読み込み
  console.log('📂 データファイルを読み込み中...\n');
  
  const postsPath = path.join(config.input, 'posts-final.json');
  const postsTagsPath = path.join(config.input, 'posts_tags.json');
  
  if (!fs.existsSync(postsPath) || !fs.existsSync(postsTagsPath)) {
    console.error('❌ データファイルが見つかりません');
    process.exit(1);
  }
  
  const posts = JSON.parse(fs.readFileSync(postsPath, 'utf-8'));
  const postsTags = JSON.parse(fs.readFileSync(postsTagsPath, 'utf-8'));
  
  console.log(`  ✓ posts-final.json: ${posts.length} 件`);
  console.log(`  ✓ posts_tags.json: ${postsTags.length} 件\n`);

  console.log('💾 D1 にシード中...\n');

  // posts をシード
  const postsColumns = {
    id: 'id',
    uuid: 'uuid',
    title: 'title',
    slug: 'slug',
    content: 'content',
    html: 'html',
    feature_image: 'feature_image',
    featured: 'featured',
    status: 'status',
    visibility: 'visibility',
    meta_title: 'meta_title',
    meta_description: 'meta_description',
    custom_excerpt: 'custom_excerpt',
    og_image: 'og_image',
    og_title: 'og_title',
    og_description: 'og_description',
    twitter_image: 'twitter_image',
    twitter_title: 'twitter_title',
    twitter_description: 'twitter_description',
    published_at: 'published_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  };

  const postsResult = seedRecords('posts', posts, postsColumns, config.database, config.local, config.maxSize);

  // 成功したpostsのIDを取得
  const successfulPostIds = new Set();
  for (let i = 0; i < posts.length; i++) {
    const record = posts[i];
    const sql = generateInsertSQL('posts', record, postsColumns);
    const size = getSqlSize(sql);
    if (size <= config.maxSize) {
      successfulPostIds.add(record.id);
    }
  }

  // posts_tags をフィルタリング（成功したpostsのみ）
  const filteredPostsTags = postsTags.filter(pt => successfulPostIds.has(pt.post_id));
  console.log(`\n  🔍 posts_tags: ${filteredPostsTags.length}/${postsTags.length} 件が有効`);

  const postsTagsColumns = {
    id: 'id',
    post_id: 'post_id',
    tag_id: 'tag_id',
    sort_order: 'sort_order',
  };

  const postsTagsResult = seedRecords('posts_tags', filteredPostsTags, postsTagsColumns, config.database, config.local, config.maxSize);

  // 結果表示
  console.log('\n📊 シード結果:');
  console.log('─'.repeat(50));
  console.log(`  posts: ${postsResult.success}/${posts.length} 件 (${postsResult.skipped} 件スキップ)`);
  console.log(`  posts_tags: ${postsTagsResult.success}/${filteredPostsTags.length} 件`);
  console.log('─'.repeat(50));

  if (postsResult.success > 0) {
    console.log('\n✅ データのシードが完了しました!');
    console.log(`\n🌐 サイトを確認: https://monogs.shirabegroup.workers.dev/`);
  }
}

main();
