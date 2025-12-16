#!/bin/bash

# MinIO画像ファイル移行スクリプト (mc コマンド使用)
#
# 既存の画像を以下の形式から：
#   content/images/YYYY/MM/filename.ext
#
# 新しい形式にコピー：
#   content/images/YYYY/MM/[slug]/filename.ext
#
# 使い方:
#   bash scripts/migrate-minio-with-mc.sh

set -e

echo "=== MinIO画像ファイル移行スクリプト (mc コマンド使用) ==="
echo ""

# DBから記事情報を取得してJSONファイルに出力
echo "DBから記事情報を取得中..."
sqlite3 drizzle/local.db <<'EOF' > /tmp/posts_images.json
.mode json
SELECT
  id,
  slug,
  feature_image,
  gallery_images,
  content
FROM posts
WHERE feature_image IS NOT NULL
   OR gallery_images IS NOT NULL
   OR content LIKE '%/content/images/%';
EOF

echo "記事情報を取得完了"
echo ""

# Node.jsスクリプトで画像パスを解析してコピーコマンドを生成
node << 'NODESCRIPT'
const fs = require('fs');
const posts = JSON.parse(fs.readFileSync('/tmp/posts_images.json', 'utf-8'));

function parseImagePath(imagePath) {
  if (!imagePath) return null;
  const match = imagePath.match(/\/?content\/images\/(\d{4})\/(\d{2})\/(.+)/);
  if (!match) return null;
  const [, year, month, rest] = match;
  if (rest.includes('/')) return null; // 既にslug構造
  return { year, month, fileName: rest };
}

function extractImageUrlsFromContent(content) {
  if (!content) return [];
  const urls = [];

  // <img src="...">
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  // ![alt](url)
  const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = mdRegex.exec(content)) !== null) {
    urls.push(match[2]);
  }

  return urls;
}

const copyCommands = [];
const seenPaths = new Set();

for (const post of posts) {
  const imagePaths = [];

  // feature_image
  if (post.feature_image) {
    imagePaths.push(post.feature_image);
  }

  // gallery_images
  if (post.gallery_images) {
    try {
      const gallery = JSON.parse(post.gallery_images);
      imagePaths.push(...gallery);
    } catch (e) {}
  }

  // content内の画像
  const contentImages = extractImageUrlsFromContent(post.content);
  imagePaths.push(...contentImages);

  for (const imagePath of imagePaths) {
    const parsed = parseImagePath(imagePath);
    if (!parsed) continue;

    const oldPath = `content/images/${parsed.year}/${parsed.month}/${parsed.fileName}`;
    const newPath = `content/images/${parsed.year}/${parsed.month}/${post.slug}/${parsed.fileName}`;

    // 重複をスキップ
    const key = `${oldPath}|${newPath}`;
    if (seenPaths.has(key)) continue;
    seenPaths.add(key);

    copyCommands.push({ oldPath, newPath, slug: post.slug, fileName: parsed.fileName });
  }
}

console.log(`コピー対象: ${copyCommands.length}件`);
console.log('');

// シェルスクリプトに出力
fs.writeFileSync('/tmp/minio_copy_commands.json', JSON.stringify(copyCommands, null, 2));
NODESCRIPT

echo "コピーコマンドを生成完了"
echo ""

# JSONファイルからコピーコマンドを実行
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
    // ファイルが存在するかチェック
    const checkCmd = `docker exec monogs-minio-1 mc stat local/monogs-images/${cmd.oldPath} 2>/dev/null`;
    try {
      execSync(checkCmd, { stdio: 'pipe' });
    } catch (e) {
      console.log(`⚠ ソースファイルが存在しません: ${cmd.oldPath}`);
      errors++;
      continue;
    }

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
