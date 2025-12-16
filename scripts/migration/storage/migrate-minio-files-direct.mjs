/**
 * MinIO画像ファイル直接移行スクリプト
 *
 * MinIO内の実際のファイルをリストして、DBのslugと対応させて新しい構造にコピーします
 *
 * 使い方:
 *   node scripts/migrate-minio-files-direct.mjs
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
 * MinIOからすべてのファイルをリスト
 */
async function listAllFiles(prefix = 'content/images/') {
  const files = [];
  let continuationToken = undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      files.push(...response.Contents.map(obj => obj.Key));
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return files;
}

/**
 * ファイル名からslugなしのパスを取得
 */
function extractPathInfo(filePath) {
  // content/images/YYYY/MM/filename.ext または
  // content/images/YYYY/MM/slug/filename.ext のパターンにマッチ
  const match = filePath.match(/^content\/images\/(\d{4})\/(\d{2})\/(.+)$/);
  if (!match) return null;

  const [, year, month, rest] = match;

  // slugが既に含まれているかチェック
  const parts = rest.split('/');
  if (parts.length > 1) {
    // 既にslug構造
    return {
      year,
      month,
      slug: parts[0],
      fileName: parts.slice(1).join('/'),
      isNewFormat: true,
      originalPath: filePath,
    };
  }

  // 古い構造
  return {
    year,
    month,
    fileName: rest,
    isNewFormat: false,
    originalPath: filePath,
  };
}

/**
 * ファイル名から対応する記事を検索
 */
function findPostByImagePath(imagePath) {
  // feature_imageから検索
  const postByFeature = db.prepare(`
    SELECT id, slug FROM posts
    WHERE feature_image LIKE ?
  `).get(`%/${imagePath.split('/').pop()}`);

  if (postByFeature) return postByFeature;

  // content内の画像から検索
  const postByContent = db.prepare(`
    SELECT id, slug FROM posts
    WHERE content LIKE ?
  `).get(`%/${imagePath.split('/').pop()}%`);

  if (postByContent) return postByContent;

  // gallery_imagesから検索
  const postByGallery = db.prepare(`
    SELECT id, slug FROM posts
    WHERE gallery_images LIKE ?
  `).get(`%/${imagePath.split('/').pop()}%`);

  return postByGallery;
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
    return true;
  } catch (error) {
    console.error(`✗ Failed to copy ${sourceKey}:`, error.message);
    return false;
  }
}

/**
 * ファイルが存在するかチェック
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
 * メイン処理
 */
async function main() {
  console.log('=== MinIO画像ファイル直接移行スクリプト ===\n');
  console.log('MinIOからファイルリストを取得中...\n');

  const files = await listAllFiles();
  console.log(`検出されたファイル数: ${files.length}\n`);

  let totalProcessed = 0;
  let totalCopied = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;
  let totalErrors = 0;

  for (const filePath of files) {
    const pathInfo = extractPathInfo(filePath);

    if (!pathInfo) {
      continue; // パターンに合わないファイル
    }

    if (pathInfo.isNewFormat) {
      // 既に新しい形式
      totalSkipped++;
      continue;
    }

    // このファイルに対応する記事を検索
    const post = findPostByImagePath(filePath);

    if (!post) {
      console.log(`⚠ 対応する記事が見つかりません: ${filePath}`);
      totalNotFound++;
      continue;
    }

    // 新しいパスを生成
    const newPath = `content/images/${pathInfo.year}/${pathInfo.month}/${post.slug}/${pathInfo.fileName}`;

    // 既に存在するかチェック
    const exists = await fileExists(newPath);
    if (exists) {
      console.log(`⊘ スキップ（既存）: ${newPath}`);
      totalSkipped++;
      continue;
    }

    // ファイルをコピー
    console.log(`コピー中: ${filePath}`);
    console.log(`     → ${newPath}`);
    const success = await copyFile(filePath, newPath);

    if (success) {
      console.log(`✓ コピー成功`);
      totalCopied++;
    } else {
      totalErrors++;
    }

    totalProcessed++;
  }

  console.log('\n=== 移行完了 ===');
  console.log(`処理された画像: ${totalProcessed}`);
  console.log(`コピー成功: ${totalCopied}`);
  console.log(`スキップ（既存）: ${totalSkipped}`);
  console.log(`対応記事なし: ${totalNotFound}`);
  console.log(`エラー: ${totalErrors}`);

  db.close();
}

main().catch(console.error);
