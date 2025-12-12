#!/usr/bin/env node

/**
 * SQLiteからCloudflare D1にデータを移行するスクリプト
 * Usage: node scripts/migrate-sqlite-to-d1.mjs [preview|production]
 */

import Database from 'better-sqlite3';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境の取得
const env = process.argv[2] || 'preview';
if (!['preview', 'production'].includes(env)) {
  console.error('Usage: node scripts/migrate-sqlite-to-d1.mjs [preview|production]');
  process.exit(1);
}

console.log(`\n🚀 ${env}環境のD1にデータを移行します\n`);

// D1データベース名
const d1Database = env === 'preview' ? 'monogs-db-preview' : 'monogs-db';

// SQLiteデータベース
const dbPath = path.join(__dirname, '../drizzle/local.db');
const db = new Database(dbPath);

// テーブル一覧
const tables = ['settings', 'users', 'tags', 'posts', 'posts_tags', 'sessions'];

function escapeString(str) {
  if (str === null || str === undefined) {
    return 'NULL';
  }
  if (typeof str === 'number') {
    return str;
  }
  if (typeof str === 'boolean') {
    return str ? 1 : 0;
  }
  // SQLの文字列をエスケープ
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function generateInsertStatements(tableName) {
  console.log(`📝 ${tableName} テーブルのデータを取得中...`);

  const rows = db.prepare(`SELECT * FROM ${tableName}`).all();

  if (rows.length === 0) {
    console.log(`  ⚠️  データがありません\n`);
    return [];
  }

  console.log(`  ✓ ${rows.length}件のレコードを検出\n`);

  const statements = rows.map((row) => {
    const columns = Object.keys(row);
    const values = columns.map((col) => escapeString(row[col]));

    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
  });

  return statements;
}

async function migrateToD1() {
  try {
    console.log('📊 SQLiteからデータを抽出中...\n');

    const allStatements = [];

    for (const table of tables) {
      const statements = generateInsertStatements(table);
      allStatements.push(...statements);
    }

    console.log(`\n💾 合計 ${allStatements.length}件のINSERT文を生成しました\n`);

    // SQLファイルに書き出し
    const sqlFile = '/tmp/d1-migration.sql';
    writeFileSync(sqlFile, allStatements.join('\n'));

    console.log(`✓ SQLファイルを作成: ${sqlFile}\n`);

    // D1に実行（バッチ処理）
    console.log(`🔄 D1データベース "${d1Database}" にデータをインポート中...\n`);

    // D1は一度に大量のSQLを実行できないため、分割して実行
    const batchSize = 100;
    let totalExecuted = 0;

    for (let i = 0; i < allStatements.length; i += batchSize) {
      const batch = allStatements.slice(i, i + batchSize);
      const batchFile = `/tmp/d1-batch-${i}.sql`;

      writeFileSync(batchFile, batch.join('\n'));

      try {
        console.log(`  [${i + 1}-${Math.min(i + batchSize, allStatements.length)}/${allStatements.length}] 実行中...`);

        execSync(
          `npx wrangler d1 execute ${d1Database} --remote --file="${batchFile}"`,
          { stdio: 'pipe' }
        );

        totalExecuted += batch.length;
        unlinkSync(batchFile);

        console.log(`  ✓ 完了`);
      } catch (error) {
        console.error(`  ✗ エラー: ${error.message}`);
        unlinkSync(batchFile);
      }
    }

    // クリーンアップ
    unlinkSync(sqlFile);

    console.log(`\n✅ データ移行完了: ${totalExecuted}/${allStatements.length}件のレコードを挿入しました\n`);

    // 確認
    console.log('📊 移行後のレコード数を確認中...\n');
    for (const table of tables) {
      try {
        const result = execSync(
          `npx wrangler d1 execute ${d1Database} --remote --command="SELECT COUNT(*) as count FROM ${table}"`,
          { encoding: 'utf-8' }
        );
        console.log(`  ${table}: ${result.includes('│') ? result.split('│')[2]?.trim() || '0' : '0'}件`);
      } catch (error) {
        console.log(`  ${table}: エラー`);
      }
    }

    console.log('');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// 実行
migrateToD1();
