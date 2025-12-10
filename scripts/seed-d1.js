#!/usr/bin/env node

/**
 * Cloudflare D1 シードスクリプト
 *
 * 変換済みのGhostデータをD1データベースに投入
 *
 * 使用方法:
 *   node scripts/seed-d1.js \
 *     --input ./migration-data/ \
 *     --database monogs-db \
 *     --local  # ローカルテスト時
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
    skipMigration: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      config.input = args[i + 1];
      i++;
    } else if (args[i] === '--database' && i + 1 < args.length) {
      config.database = args[i + 1];
      i++;
    } else if (args[i] === '--local') {
      config.local = true;
    } else if (args[i] === '--skip-migration') {
      config.skipMigration = true;
    }
  }

  if (!config.input || !config.database) {
    console.error('使用方法: node seed-d1.js --input <INPUT_DIR> --database <DB_NAME>');
    console.error('オプション: --local (ローカルテスト), --skip-migration (マイグレーションスキップ)');
    process.exit(1);
  }

  return config;
}

// wrangler の確認
function checkWrangler() {
  try {
    execSync('wrangler --version', { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error('❌ エラー: wrangler CLI がインストールされていません');
    console.error('インストール: npm install -g wrangler');
    return false;
  }
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

// マイグレーション実行
function runMigration(database, isLocal) {
  console.log('🔄 マイグレーションを実行中...\n');

  const localFlag = isLocal ? '--local' : '';

  try {
    // Drizzle Kit でマイグレーション生成
    console.log('  📝 マイグレーションファイルを生成中...');
    execSync('npx drizzle-kit generate:sqlite', { stdio: 'inherit' });

    // マイグレーション適用
    console.log('  ⬆️  マイグレーションを適用中...');
    const cmd = `wrangler d1 migrations apply ${database} ${localFlag}`;
    execSync(cmd, { stdio: 'inherit' });

    console.log('  ✓ マイグレーション完了\n');
  } catch (e) {
    console.error(`❌ マイグレーションエラー: ${e.message}`);
    process.exit(1);
  }
}

// D1 にシード実行
function seedTable(tableName, sql, database, isLocal) {
  if (!sql) {
    console.log(`  ⊘ ${tableName}: データなし`);
    return;
  }

  const sqlFile = path.join('migration-data', `seed-${tableName}.sql`);
  fs.writeFileSync(sqlFile, sql);

  const localFlag = isLocal ? '--local' : '';
  const cmd = `wrangler d1 execute ${database} ${localFlag} --file="${sqlFile}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`  ✓ ${tableName}: シード完了`);
  } catch (e) {
    console.error(`  ❌ ${tableName}: シード失敗`);
    console.error(`     ${e.message}`);
    throw e;
  }
}

// メイン処理
function main() {
  console.log('🚀 D1 シードスクリプト\n');

  const config = parseArgs();

  // 前提条件チェック
  if (!checkWrangler()) {
    process.exit(1);
  }

  console.log(`📂 入力: ${config.input}`);
  console.log(`🗄️  データベース: ${config.database}`);
  console.log(`🏠 モード: ${config.local ? 'ローカル' : '本番'}\n`);

  // データ読み込み
  const data = loadData(config.input);

  // マイグレーション実行
  if (!config.skipMigration) {
    runMigration(config.database, config.local);
  } else {
    console.log('⊘ マイグレーションをスキップ\n');
  }

  // SQL生成
  console.log('📝 SQL を生成中...\n');

  // カラムマッピング（スキーマ → JSONキー）
  const tables = [
    {
      name: 'users',
      data: data.users,
      columns: {
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
      },
    },
    {
      name: 'tags',
      data: data.tags,
      columns: {
        id: 'id',
        name: 'name',
        slug: 'slug',
        description: 'description',
        feature_image: 'feature_image',
      },
    },
    {
      name: 'posts',
      data: data.posts,
      columns: {
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
      },
    },
    {
      name: 'posts_tags',
      data: data.postsTags,
      columns: {
        id: 'id',
        post_id: 'post_id',
        tag_id: 'tag_id',
        sort_order: 'sort_order',
      },
    },
    {
      name: 'settings',
      data: data.settings,
      columns: {
        id: 'id',
        key: 'key',
        value: 'value',
      },
    },
  ];

  // settings に id を追加（Ghost は id がないため）
  data.settings = data.settings.map((s, i) => ({
    id: `setting_${i + 1}`,
    ...s,
  }));

  // シード実行
  console.log('💾 D1 にシード中...\n');

  let successCount = 0;

  tables.forEach(({ name, data: tableData, columns }) => {
    const sql = generateInsertSQL(name, tableData, columns);

    try {
      seedTable(name, sql, config.database, config.local);
      successCount++;
    } catch (e) {
      console.error(`\n❌ ${name} のシードに失敗しました`);
    }
  });

  // 結果表示
  console.log('\n📊 シード結果:');
  console.log('─'.repeat(50));
  console.log(`  成功: ${successCount}/${tables.length} テーブル`);
  console.log('─'.repeat(50));

  if (successCount === tables.length) {
    console.log('\n✅ すべてのデータのシードが完了しました!');
  } else {
    console.log('\n⚠️  一部のテーブルのシードに失敗しました');
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { generateInsertSQL, escapeSqlValue };
