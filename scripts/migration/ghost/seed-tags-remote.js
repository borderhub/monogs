#!/usr/bin/env node

/**
 * Seed tags to remote D1 database
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

// INSERT SQL の生成
function generateTagsSQL(tags) {
  if (!tags || tags.length === 0) {
    return '';
  }

  const now = new Date().toISOString();
  const valuesSql = tags.map(tag => {
    const id = escapeSqlValue(tag.id);
    const name = escapeSqlValue(tag.name);
    const slug = escapeSqlValue(tag.slug);
    const description = escapeSqlValue(tag.description);
    const featureImage = escapeSqlValue(tag.feature_image);
    const createdAt = escapeSqlValue(now);
    const updatedAt = escapeSqlValue(now);

    return `(${id}, ${name}, ${slug}, ${description}, ${featureImage}, ${createdAt}, ${updatedAt})`;
  }).join(',\n  ');

  return `INSERT INTO tags (id, name, slug, description, feature_image, created_at, updated_at) VALUES\n  ${valuesSql};`;
}

// メイン処理
function main() {
  console.log('🏷️  Tags をリモート D1 にシード中...\n');

  // データ読み込み
  const tagsPath = path.join(__dirname, '../migration-data/tags.json');
  if (!fs.existsSync(tagsPath)) {
    console.error('❌ tags.json が見つかりません');
    process.exit(1);
  }

  const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
  console.log(`📂 tags.json: ${tags.length} 件\n`);

  // SQL 生成
  const sql = generateTagsSQL(tags);
  const sqlFile = path.join(__dirname, '../migration-data/seed-tags-remote.sql');
  fs.writeFileSync(sqlFile, sql);

  console.log('📝 SQL ファイルを生成しました');
  console.log(`   ${sqlFile}\n`);

  // D1 にシード
  console.log('💾 リモート D1 にシード中...\n');
  const cmd = `wrangler d1 execute monogs-db --remote --file="${sqlFile}"`;

  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n✅ Tags のシードが完了しました!');
    console.log(`   ${tags.length} 件のタグを追加\n`);

    // クリーンアップ
    fs.unlinkSync(sqlFile);
  } catch (e) {
    console.error('\n❌ シードに失敗しました');
    if (fs.existsSync(sqlFile)) {
      console.log(`   SQLファイル: ${sqlFile}`);
    }
    process.exit(1);
  }
}

main();
