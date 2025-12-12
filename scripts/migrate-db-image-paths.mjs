/**
 * DB画像パス更新スクリプト
 *
 * 既存の画像パスを以下の形式から：
 *   /content/images/YYYY/MM/filename.ext
 *
 * 新しい形式に更新：
 *   /content/images/YYYY/MM/[slug]/filename.ext
 *
 * 使い方:
 *   node scripts/migrate-db-image-paths.js [--dry-run]
 *
 * オプション:
 *   --dry-run: 実際の更新を行わず、変更内容のみ表示
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// コマンドライン引数を確認
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// DB接続
const dbPath = path.join(__dirname, '../drizzle/local.db');
const db = new Database(dbPath);

/**
 * 画像パスを解析して年月とファイル名を抽出
 */
function parseImagePath(imagePath) {
  if (!imagePath) return null;

  // /content/images/YYYY/MM/filename.ext の形式を想定
  // または content/images/YYYY/MM/filename.ext
  const match = imagePath.match(/\/?content\/images\/(\d{4})\/(\d{2})\/(.+)/);
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
    hasLeadingSlash: imagePath.startsWith('/'),
  };
}

/**
 * 新しいパスを生成
 */
function generateNewPath(year, month, slug, fileName, hasLeadingSlash = true) {
  const basePath = `content/images/${year}/${month}/${slug}/${fileName}`;
  return hasLeadingSlash ? `/${basePath}` : basePath;
}

/**
 * コンテンツ内の画像パスを更新
 */
function updateContentImagePaths(content, slug) {
  if (!content) return { updated: content, count: 0 };

  let updatedContent = content;
  let count = 0;

  // <img src="..."> タグの更新
  updatedContent = updatedContent.replace(
    /<img([^>]+)src=["']([^"']+)["']/gi,
    (match, attrs, src) => {
      const parsed = parseImagePath(src);
      if (parsed) {
        const newPath = generateNewPath(parsed.year, parsed.month, slug, parsed.fileName, parsed.hasLeadingSlash);
        count++;
        return `<img${attrs}src="${newPath}"`;
      }
      return match;
    }
  );

  // Markdown形式の画像 ![alt](url) の更新
  updatedContent = updatedContent.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, url) => {
      const parsed = parseImagePath(url);
      if (parsed) {
        const newPath = generateNewPath(parsed.year, parsed.month, slug, parsed.fileName, parsed.hasLeadingSlash);
        count++;
        return `![${alt}](${newPath})`;
      }
      return match;
    }
  );

  return { updated: updatedContent, count };
}

/**
 * メイン処理
 */
function main() {
  console.log('=== DB画像パス更新スクリプト ===');
  console.log(`モード: ${isDryRun ? 'DRY RUN（変更なし）' : '本番実行'}\n`);

  // 全記事を取得
  const posts = db.prepare('SELECT id, slug, feature_image, gallery_images, content FROM posts').all();

  console.log(`対象記事数: ${posts.length}\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  const updates = [];

  for (const post of posts) {
    const changes = {
      postId: post.id,
      slug: post.slug,
      featureImage: null,
      galleryImages: null,
      content: null,
    };

    let hasChanges = false;

    // 1. アイキャッチ画像の更新
    if (post.feature_image) {
      const parsed = parseImagePath(post.feature_image);
      if (parsed) {
        const newPath = generateNewPath(parsed.year, parsed.month, post.slug, parsed.fileName, parsed.hasLeadingSlash);
        changes.featureImage = {
          old: post.feature_image,
          new: newPath,
        };
        hasChanges = true;
      }
    }

    // 2. ギャラリー画像の更新
    if (post.gallery_images) {
      try {
        const galleryImages = JSON.parse(post.gallery_images);
        const updatedGalleryImages = galleryImages.map((imageUrl) => {
          const parsed = parseImagePath(imageUrl);
          if (parsed) {
            return generateNewPath(parsed.year, parsed.month, post.slug, parsed.fileName, parsed.hasLeadingSlash);
          }
          return imageUrl;
        });

        // 変更があるかチェック
        if (JSON.stringify(galleryImages) !== JSON.stringify(updatedGalleryImages)) {
          changes.galleryImages = {
            old: galleryImages,
            new: updatedGalleryImages,
          };
          hasChanges = true;
        }
      } catch (e) {
        console.warn(`⚠ [${post.slug}] ギャラリー画像のパースに失敗:`, e.message);
      }
    }

    // 3. コンテンツ内の画像パスの更新
    if (post.content) {
      const { updated, count } = updateContentImagePaths(post.content, post.slug);
      if (count > 0) {
        changes.content = {
          old: post.content,
          new: updated,
          imageCount: count,
        };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      updates.push(changes);
      totalUpdated++;

      console.log(`\n✓ [${post.slug}]`);
      if (changes.featureImage) {
        console.log(`  アイキャッチ画像:`);
        console.log(`    旧: ${changes.featureImage.old}`);
        console.log(`    新: ${changes.featureImage.new}`);
      }
      if (changes.galleryImages) {
        console.log(`  ギャラリー画像: ${changes.galleryImages.new.length}件`);
        changes.galleryImages.old.forEach((oldUrl, i) => {
          if (oldUrl !== changes.galleryImages.new[i]) {
            console.log(`    旧: ${oldUrl}`);
            console.log(`    新: ${changes.galleryImages.new[i]}`);
          }
        });
      }
      if (changes.content) {
        console.log(`  コンテンツ内画像: ${changes.content.imageCount}件`);
      }
    } else {
      totalSkipped++;
    }
  }

  console.log('\n=== 変更サマリー ===');
  console.log(`更新対象: ${totalUpdated}件`);
  console.log(`変更なし: ${totalSkipped}件\n`);

  // 実際の更新処理
  if (!isDryRun && updates.length > 0) {
    console.log('データベースを更新中...\n');

    const updateStmt = db.prepare(`
      UPDATE posts
      SET feature_image = ?,
          gallery_images = ?,
          content = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    const transaction = db.transaction((updates) => {
      for (const change of updates) {
        const featureImage = change.featureImage ? change.featureImage.new : null;
        const galleryImages = change.galleryImages
          ? JSON.stringify(change.galleryImages.new)
          : null;
        const content = change.content ? change.content.new : null;

        // 元の値を保持（変更がない場合）
        const stmt = db.prepare('SELECT feature_image, gallery_images, content FROM posts WHERE id = ?');
        const original = stmt.get(change.postId);

        updateStmt.run(
          featureImage || original.feature_image,
          galleryImages || original.gallery_images,
          content || original.content,
          change.postId
        );
      }
    });

    transaction(updates);

    console.log('✓ データベース更新完了\n');
  } else if (isDryRun) {
    console.log('※ DRY RUNモードのため、実際の更新は行いませんでした');
    console.log('本番実行する場合は --dry-run オプションを外してください\n');
  }

  db.close();
}

main();
