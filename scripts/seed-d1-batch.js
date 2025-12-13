#!/usr/bin/env node

/**
 * Cloudflare D1 バッチシードスクリプト
 *
 * 大きなデータを小分けにしてD1に投入
 *
 * 使用方法:
 *   node scripts/seed-d1-batch.js \
 *     --input ./migration-data/ \
 *     --database monogs-db \
 *     --batch-size 5
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
    batchSize: 5,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      config.input = args[i + 1];
      i++;
    } else if (args[i] === '--database' && i + 1 < args.length) {
      config.database = args[i + 1];
      i++;
    } else if (args[i] === '--batch-size' && i + 1 < args.length) {
      config.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--local') {
      config.local = true;
    } else if (args[i] === '--remote') {
      config.local = false;
    }
  }

  if (!config.input || !config.database) {
    console.error('使用方法: node seed-d1-batch.js --input <INPUT_DIR> --database <DB_NAME>');
    console.error('オプション: --local (ローカルテスト), --batch-size <N> (デフォルト: 5)');
    process.exit(1);
  }

  return config;
}

// データファイルの読み込み
function loadData(inputDir) {
  console.log('📂 データファイルを読み込み中...\n');

  const files = {
    posts: 'posts-final.json',
    tags: 'tags.json',
    postsTags: 'posts_tags.json',
    users: 'users.json',
    settings: 'settings.json',
  };

  const data = {};

  Object.entries(files).forEach(([key, filename]) => {
    const filePath = path.join(inputDir, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ エラー: ${filename} が見つかりません`);
      process.exit(1);
    }

    data[key] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`  ✓ ${filename}: ${data[key].length} 件`);
  });

  console.log('');
  return data;
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

  // 文字列のエスケープ
  return "'" + String(value).replace(/'/g, "''") + "'";
}

// INSERT SQL の生成
function generateInsertSQL(tableName, data, columnMap) {
  if (!data || data.length === 0) {
    return '';
  }

  const columns = Object.keys(columnMap);
  const columnsSql = columns.join(', ');

  const valuesSql = data.map(row => {
    const values = columns.map(col => {
      const sourceKey = columnMap[col];
      return escapeSqlValue(row[sourceKey]);
    });
    return `(${values.join(', ')})`;
  }).join(',\n  ');

  return `INSERT INTO ${tableName} (${columnsSql}) VALUES\n  ${valuesSql};`;
}

// D1 にシード実行（バッチ対応）
function seedTableBatch(tableName, data, columns, database, isLocal, batchSize) {
  if (!data || data.length === 0) {
    console.log(`  ⊘ ${tableName}: データなし`);
    return 0;
  }

  const totalBatches = Math.ceil(data.length / batchSize);
  let successCount = 0;

  console.log(`  📦 ${tableName}: ${data.length} 件を ${totalBatches} バッチで処理`);

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    const sql = generateInsertSQL(tableName, batch, columns);
    const sqlFile = path.join('migration-data', `seed-${tableName}-batch-${batchNum}.sql`);
    fs.writeFileSync(sqlFile, sql);

    const remoteFlag = isLocal ? '--local' : '--remote';
    const cmd = `wrangler d1 execute ${database} ${remoteFlag} --file="${sqlFile}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      successCount += batch.length;
      process.stdout.write(`\r     進捗: ${successCount}/${data.length} 件 (${Math.round(successCount / data.length * 100)}%)`);
    } catch (e) {
      console.error(`\n     ❌ バッチ ${batchNum} 失敗: ${e.message}`);
      throw e;
    }

    // クリーンアップ
    fs.unlinkSync(sqlFile);
  }

  console.log(`\n  ✓ ${tableName}: シード完了 (${successCount} 件)`);
  return successCount;
}

// 単一テーブルシード（小さいテーブル用）
function seedTable(tableName, sql, database, isLocal) {
  if (!sql) {
    console.log(`  ⊘ ${tableName}: データなし`);
    return true;
  }

  const sqlFile = path.join('migration-data', `seed-${tableName}.sql`);
  fs.writeFileSync(sqlFile, sql);

  const remoteFlag = isLocal ? '--local' : '--remote';
  const cmd = `wrangler d1 execute ${database} ${remoteFlag} --file="${sqlFile}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`  ✓ ${tableName}: シード完了`);
    return true;
  } catch (e) {
    console.error(`  ❌ ${tableName}: シード失敗`);
    console.error(`     ${e.message}`);
    return false;
  }
}

// メイン処理
function main() {
  console.log('🚀 D1 バッチシードスクリプト\n');

  const config = parseArgs();

  console.log(`📂 入力: ${config.input}`);
  console.log(`🗄️  データベース: ${config.database}`);
  console.log(`📦 バッチサイズ: ${config.batchSize}`);
  console.log(`🏠 モード: ${config.local ? 'ローカル' : '本番'}\n`);

  // データ読み込み
  const data = loadData(config.input);

  // settings に id を追加（Ghost は id がないため）
  data.settings = data.settings.map((s, i) => ({
    id: `setting_${i + 1}`,
    ...s,
  }));

  // users にデフォルト値を設定
  const now = new Date().toISOString();
  data.users = data.users.map(u => ({
    ...u,
    status: u.status || 'active',
    created_at: u.created_at || now,
    updated_at: u.updated_at || now,
  }));

  console.log('💾 D1 にシード中...\n');

  let successTables = 0;
  const totalTables = 5;

  // 1. users（小さいテーブル）
  try {
    const usersSql = generateInsertSQL('users', data.users, {
      id: 'id',
      name: 'name',
      slug: 'slug',
      email: 'email',
      password: 'password',
      bio: 'bio',
      profile_image: 'profile_image',
      status: 'status',
      created_at: 'created_at',
      updated_at: 'updated_at',
    });
    if (seedTable('users', usersSql, config.database, config.local)) {
      successTables++;
    }
  } catch (e) {
    console.error(`\n❌ users のシードに失敗しました`);
  }

  // 2. tags（既にシード済みのためスキップ）
  console.log(`  ⊘ tags: 既にシード済みのためスキップ`);
  successTables++;

  // 3. posts（大きいテーブル - バッチ処理）
  try {
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

    seedTableBatch('posts', data.posts, postsColumns, config.database, config.local, config.batchSize);
    successTables++;
  } catch (e) {
    console.error(`\n❌ posts のシードに失敗しました`);
  }

  // 4. posts_tags（中規模テーブル - バッチ処理）
  try {
    const postsTagsColumns = {
      id: 'id',
      post_id: 'post_id',
      tag_id: 'tag_id',
      sort_order: 'sort_order',
    };

    seedTableBatch('posts_tags', data.postsTags, postsTagsColumns, config.database, config.local, config.batchSize * 4);
    successTables++;
  } catch (e) {
    console.error(`\n❌ posts_tags のシードに失敗しました`);
  }

  // 5. settings（小さいテーブル）
  try {
    const settingsSql = generateInsertSQL('settings', data.settings, {
      id: 'id',
      key: 'key',
      value: 'value',
    });
    if (seedTable('settings', settingsSql, config.database, config.local)) {
      successTables++;
    }
  } catch (e) {
    console.error(`\n❌ settings のシードに失敗しました`);
  }

  // 結果表示
  console.log('\n📊 シード結果:');
  console.log('─'.repeat(50));
  console.log(`  成功: ${successTables}/${totalTables} テーブル`);
  console.log('─'.repeat(50));

  if (successTables === totalTables) {
    console.log('\n✅ すべてのデータのシードが完了しました!');
    console.log(`\n🌐 サイトを確認: https://monogs.shirabegroup.workers.dev/`);
  } else {
    console.log('\n⚠️  一部のテーブルのシードに失敗しました');
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}
