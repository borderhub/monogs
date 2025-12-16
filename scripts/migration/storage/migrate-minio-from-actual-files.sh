#!/bin/bash

# MinIO内の実際のファイルをリストしてslug構造に移行
#
# 使い方:
#   bash scripts/migrate-minio-from-actual-files.sh

set -e

echo "=== MinIO画像ファイル移行スクリプト（実ファイルベース） ==="
echo ""

# MinIO内のすべてのファイルをリスト
echo "MinIOからファイルリストを取得中..."
docker exec monogs-minio-1 mc ls --recursive local/monogs-images/content/images/ > /tmp/minio_files.txt

echo "ファイルリストを取得完了"
echo ""

# ファイルリストを解析してコピーコマンドを生成
node << 'NODESCRIPT'
const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

// DB接続
const db = new Database('drizzle/local.db');

// ファイルリストを読み込み
const fileList = fs.readFileSync('/tmp/minio_files.txt', 'utf-8');
const lines = fileList.split('\n').filter(line => line.trim());

// ファイルパスを抽出
const files = [];
for (const line of lines) {
  // mc ls の出力フォーマット: [date time size] path
  const match = line.match(/\d+\s+(.+)$/);
  if (match) {
    files.push(match[1].trim());
  }
}

console.log(`検出されたファイル数: ${files.length}`);
console.log('');

// 画像パスを解析
function parseImagePath(filePath) {
  // content/images/YYYY/MM/filename.ext のパターン
  const match = filePath.match(/content\/images\/(\d{4})\/(\d{2})\/(.+)/);
  if (!match) return null;

  const [, year, month, rest] = match;

  // slugが既に含まれているかチェック
  if (rest.includes('/')) {
    return null; // 既にslug構造
  }

  return {
    year,
    month,
    fileName: rest,
    originalPath: filePath,
  };
}

// ファイル名から対応する記事を検索
function findPostByImageFileName(fileName) {
  // feature_imageから検索
  const postByFeature = db.prepare(`
    SELECT id, slug FROM posts
    WHERE feature_image LIKE ?
  `).get(`%/${fileName}`);

  if (postByFeature) return postByFeature;

  // content内の画像から検索
  const postByContent = db.prepare(`
    SELECT id, slug FROM posts
    WHERE content LIKE ?
  `).get(`%/${fileName}%`);

  if (postByContent) return postByContent;

  // gallery_imagesから検索
  const postByGallery = db.prepare(`
    SELECT id, slug FROM posts
    WHERE gallery_images LIKE ?
  `).get(`%/${fileName}%`);

  return postByGallery;
}

const copyCommands = [];

for (const filePath of files) {
  const parsed = parseImagePath(filePath);
  if (!parsed) continue;

  // 対応する記事を検索
  const post = findPostByImageFileName(parsed.fileName);
  if (!post) {
    console.log(`⚠ 対応する記事が見つかりません: ${parsed.fileName}`);
    continue;
  }

  const newPath = `content/images/${parsed.year}/${parsed.month}/${post.slug}/${parsed.fileName}`;

  copyCommands.push({
    oldPath: parsed.originalPath,
    newPath: newPath,
    slug: post.slug,
    fileName: parsed.fileName,
  });
}

console.log(`コピー対象: ${copyCommands.length}件`);
console.log('');

// JSONファイルに出力
fs.writeFileSync('/tmp/minio_copy_commands.json', JSON.stringify(copyCommands, null, 2));

db.close();
NODESCRIPT

echo "コピーコマンドを生成完了"
echo ""

# コピーを実行
echo "MinIOでファイルをコピー中..."

node << 'COPYNODE'
const fs = require('fs');
const { execSync } = require('child_process');

const commands = JSON.parse(fs.readFileSync('/tmp/minio_copy_commands.json', 'utf-8'));

let copied = 0;
let skipped = 0;
let errors = 0;

for (const cmd of commands) {
  try {
    // 既に移行先が存在するかチェック
    const checkNewCmd = `docker exec monogs-minio-1 mc stat local/monogs-images/${cmd.newPath} 2>/dev/null`;
    try {
      execSync(checkNewCmd, { stdio: 'pipe' });
      console.log(`⊘ スキップ（既存）: ${cmd.newPath}`);
      skipped++;
      continue;
    } catch (e) {
      // 存在しない = コピー必要
    }

    // ファイルをコピー
    const copyCmd = `docker exec monogs-minio-1 mc cp local/monogs-images/${cmd.oldPath} local/monogs-images/${cmd.newPath}`;
    execSync(copyCmd, { stdio: 'pipe' });
    console.log(`✓ [${cmd.slug}] ${cmd.fileName}`);
    copied++;

  } catch (error) {
    console.error(`✗ エラー: ${cmd.oldPath}`, error.message);
    errors++;
  }
}

console.log('');
console.log('=== 移行完了 ===');
console.log(`コピー成功: ${copied}件`);
console.log(`スキップ: ${skipped}件`);
console.log(`エラー: ${errors}件`);
COPYNODE

echo ""
echo "MinIO画像ファイル移行が完了しました！"
