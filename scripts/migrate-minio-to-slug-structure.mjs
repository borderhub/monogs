/**
 * MinIO画像パス移行スクリプト
 *
 * 既存の画像を以下の形式から：
 *   content/images/YYYY/MM/filename.ext
 *
 * 新しい形式に移行：
 *   content/images/YYYY/MM/[slug]/filename.ext
 *
 * 使い方:
 *   node scripts/migrate-minio-to-slug-structure.js
 */

import { S3Client, ListObjectsV2Command, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MinIO設定
const s3Client = new S3Client({
  endpoint: process.env.NEXT_PUBLIC_IMAGES_URL || 'http://localhost:9000',
  region: 'auto',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET_NAME = 'monogs-images';

// DB接続
const dbPath = path.join(__dirname, '../drizzle/local.db');
const db = new Database(dbPath);

/**
 * 画像パスを解析して年月とファイル名を抽出
 */
function parseImagePath(imagePath) {
  // /content/images/YYYY/MM/filename.ext の形式を想定
  // または content/images/YYYY/MM/filename.ext
  const match = imagePath.match(/content\/images\/(\d{4})\/(\d{2})\/(.+)/);
  if (!match) return null;

  const [, year, month, rest] = match;

  // restにスラッシュが含まれている場合は既にslug構造
  if (rest.includes('/')) {
    return null; // 既に移行済み
  }

  return {
    year,
    month,
    fileName: rest,
    originalPath: `content/images/${year}/${month}/${rest}`,
  };
}

/**
 * 新しいパスを生成
 */
function generateNewPath(year, month, slug, fileName) {
  return `content/images/${year}/${month}/${slug}/${fileName}`;
}

/**
 * MinIOでファイルが存在するか確認
 */
async function fileExists(key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * MinIOでファイルをコピー
 */
async function copyFile(sourceKey, destKey) {
  try {
    await s3Client.send(new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destKey,
    }));
    console.log(`✓ Copied: ${sourceKey} -> ${destKey}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to copy ${sourceKey}:`, error.message);
    return false;
  }
}

/**
 * コンテンツ内の画像URLを抽出
 */
function extractImageUrlsFromContent(content) {
  if (!content) return [];

  const imageUrls = [];

  // <img src="..."> タグから抽出
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    imageUrls.push(match[1]);
  }

  // Markdown形式の画像 ![alt](url) から抽出
  const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = mdRegex.exec(content)) !== null) {
    imageUrls.push(match[2]);
  }

  return imageUrls;
}

/**
 * メイン処理
 */
async function main() {
  console.log('=== MinIO画像パス移行スクリプト ===\n');

  // 全記事を取得
  const posts = db.prepare('SELECT id, slug, feature_image, gallery_images, content FROM posts').all();

  console.log(`対象記事数: ${posts.length}\n`);

  let totalProcessed = 0;
  let totalCopied = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const post of posts) {
    console.log(`\n処理中: [${post.slug}]`);

    const imagesToMigrate = [];

    // 1. アイキャッチ画像
    if (post.feature_image) {
      const parsed = parseImagePath(post.feature_image);
      if (parsed) {
        imagesToMigrate.push({
          type: 'feature_image',
          ...parsed,
        });
      }
    }

    // 2. ギャラリー画像
    if (post.gallery_images) {
      try {
        const galleryImages = JSON.parse(post.gallery_images);
        for (const imageUrl of galleryImages) {
          const parsed = parseImagePath(imageUrl);
          if (parsed) {
            imagesToMigrate.push({
              type: 'gallery',
              ...parsed,
            });
          }
        }
      } catch (e) {
        console.warn('  ギャラリー画像のパースに失敗:', e.message);
      }
    }

    // 3. コンテンツ内の画像
    if (post.content) {
      const contentImages = extractImageUrlsFromContent(post.content);
      for (const imageUrl of contentImages) {
        const parsed = parseImagePath(imageUrl);
        if (parsed) {
          imagesToMigrate.push({
            type: 'content',
            ...parsed,
          });
        }
      }
    }

    // 重複を除去
    const uniquePaths = [...new Set(imagesToMigrate.map(img => img.originalPath))];

    if (uniquePaths.length === 0) {
      console.log('  移行対象の画像なし（既に移行済みまたは画像なし）');
      totalSkipped++;
      continue;
    }

    console.log(`  移行対象画像数: ${uniquePaths.length}`);

    // 各画像を移行
    for (const originalPath of uniquePaths) {
      const img = imagesToMigrate.find(i => i.originalPath === originalPath);
      const newPath = generateNewPath(img.year, img.month, post.slug, img.fileName);

      // MinIOでファイルが存在するか確認
      const sourceExists = await fileExists(originalPath);
      if (!sourceExists) {
        console.log(`  ⚠ ソースファイルが存在しません: ${originalPath}`);
        totalErrors++;
        continue;
      }

      // 既に移行先が存在するか確認
      const destExists = await fileExists(newPath);
      if (destExists) {
        console.log(`  ⊘ スキップ（既存）: ${newPath}`);
        totalSkipped++;
        continue;
      }

      // ファイルをコピー
      const success = await copyFile(originalPath, newPath);
      if (success) {
        totalCopied++;
      } else {
        totalErrors++;
      }

      totalProcessed++;
    }
  }

  console.log('\n=== 移行完了 ===');
  console.log(`処理された画像: ${totalProcessed}`);
  console.log(`コピー成功: ${totalCopied}`);
  console.log(`スキップ: ${totalSkipped}`);
  console.log(`エラー: ${totalErrors}`);

  db.close();
}

main().catch(console.error);
