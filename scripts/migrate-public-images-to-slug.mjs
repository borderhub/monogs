/**
 * public/content/images/ 画像ファイル移行スクリプト
 *
 * 既存の画像を以下の形式から：
 *   public/content/images/YYYY/MM/filename.ext
 *
 * 新しい形式にコピー：
 *   public/content/images/YYYY/MM/[slug]/filename.ext
 *
 * 使い方:
 *   node scripts/migrate-public-images-to-slug.mjs [--dry-run]
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// コマンドライン引数を確認
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// DB接続
const dbPath = path.join(__dirname, '../drizzle/local.db');
const db = new Database(dbPath);

// プロジェクトルート
const projectRoot = path.join(__dirname, '..');

/**
 * 画像パスを解析して年月とファイル名を抽出
 */
function parseImagePath(imagePath) {
  // public/content/images/YYYY/MM/filename.ext の形式を想定
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
  };
}

/**
 * ファイル名から対応する記事を検索
 */
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

/**
 * ディレクトリを作成（存在しない場合）
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('=== public/content/images/ 画像ファイル移行スクリプト ===');
  console.log(`モード: ${isDryRun ? 'DRY RUN（変更なし）' : '本番実行'}\n`);

  // public/content/images/ 配下のすべての画像ファイルを取得
  const imageFiles = await glob('public/content/images/**/*.{jpg,jpeg,png,gif,webp,JPG,JPEG,PNG,GIF,WEBP}', {
    cwd: projectRoot,
  });

  console.log(`検出された画像ファイル数: ${imageFiles.length}\n`);

  let totalProcessed = 0;
  let totalCopied = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  const migrations = [];

  for (const imageFile of imageFiles) {
    const parsed = parseImagePath(imageFile);

    if (!parsed) {
      // 既に新しい構造 または パターンに合わない
      totalSkipped++;
      continue;
    }

    // このファイルに対応する記事を検索
    const post = findPostByImageFileName(parsed.fileName);

    if (!post) {
      console.log(`⚠ 対応する記事が見つかりません: ${parsed.fileName}`);
      totalNotFound++;
      continue;
    }

    // 新しいパスを生成
    const newPath = path.join(
      projectRoot,
      'public',
      'content',
      'images',
      parsed.year,
      parsed.month,
      post.slug,
      parsed.fileName
    );

    const oldPath = path.join(projectRoot, imageFile);

    // 既に存在するかチェック
    if (fs.existsSync(newPath)) {
      console.log(`⊘ スキップ（既存）: content/images/${parsed.year}/${parsed.month}/${post.slug}/${parsed.fileName}`);
      totalSkipped++;
      continue;
    }

    migrations.push({
      oldPath,
      newPath,
      displayOld: imageFile,
      displayNew: `public/content/images/${parsed.year}/${parsed.month}/${post.slug}/${parsed.fileName}`,
    });

    console.log(`✓ [${post.slug}] ${parsed.fileName}`);
    console.log(`  ${imageFile}`);
    console.log(`  → public/content/images/${parsed.year}/${parsed.month}/${post.slug}/${parsed.fileName}`);

    totalProcessed++;
  }

  console.log('\n=== 移行サマリー ===');
  console.log(`コピー対象: ${totalProcessed}件`);
  console.log(`スキップ（既存）: ${totalSkipped}件`);
  console.log(`対応記事なし: ${totalNotFound}件\n`);

  // 実際のファイルコピー
  if (!isDryRun && migrations.length > 0) {
    console.log('ファイルをコピー中...\n');

    for (const migration of migrations) {
      try {
        // ディレクトリを作成
        const dir = path.dirname(migration.newPath);
        ensureDirectory(dir);

        // ファイルをコピー
        fs.copyFileSync(migration.oldPath, migration.newPath);
        totalCopied++;
      } catch (error) {
        console.error(`✗ コピー失敗: ${migration.displayNew}`, error.message);
      }
    }

    console.log(`\n✓ ${totalCopied}件のファイルをコピーしました\n`);
  } else if (isDryRun) {
    console.log('※ DRY RUNモードのため、実際のコピーは行いませんでした');
    console.log('本番実行する場合は --dry-run オプションを外してください\n');
  }

  db.close();
}

main().catch(console.error);
