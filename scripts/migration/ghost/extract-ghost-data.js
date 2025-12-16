#!/usr/bin/env node

/**
 * Ghost SQLite データ抽出スクリプト
 *
 * Ghost の SQLite データベースから記事、タグ、ユーザー、設定を JSON 形式で抽出
 *
 * 使用方法:
 *   node scripts/extract-ghost-data.js \
 *     --db ../ghost/content/data/ghost-dev.db \
 *     --output ./migration-data/
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    db: null,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && i + 1 < args.length) {
      config.db = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      config.output = args[i + 1];
      i++;
    }
  }

  if (!config.db || !config.output) {
    console.error('使用方法: node extract-ghost-data.js --db <DB_PATH> --output <OUTPUT_DIR>');
    process.exit(1);
  }

  return config;
}

// データベース接続
function connectDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.error(`エラー: データベースファイルが見つかりません: ${dbPath}`);
    process.exit(1);
  }

  try {
    return new Database(dbPath, { readonly: true });
  } catch (error) {
    console.error(`データベース接続エラー: ${error.message}`);
    process.exit(1);
  }
}

// posts テーブル抽出
function extractPosts(db) {
  console.log('📝 posts テーブルを抽出中...');

  const posts = db.prepare(`
    SELECT
      id, uuid, title, slug, mobiledoc, html,
      feature_image, featured, status, visibility,
      meta_title, meta_description, custom_excerpt,
      og_image, og_title, og_description,
      twitter_image, twitter_title, twitter_description,
      published_at, created_at, updated_at
    FROM posts
    WHERE status IN ('published', 'draft')
    ORDER BY published_at DESC
  `).all();

  console.log(`  ✓ ${posts.length} 件の記事を抽出`);
  return posts;
}

// tags テーブル抽出
function extractTags(db) {
  console.log('🏷️  tags テーブルを抽出中...');

  const tags = db.prepare(`
    SELECT id, name, slug, description, feature_image
    FROM tags
    ORDER BY name
  `).all();

  console.log(`  ✓ ${tags.length} 件のタグを抽出`);
  return tags;
}

// posts_tags テーブル抽出
function extractPostsTags(db) {
  console.log('🔗 posts_tags リレーションを抽出中...');

  const postsTags = db.prepare(`
    SELECT id, post_id, tag_id, sort_order
    FROM posts_tags
    ORDER BY post_id, sort_order
  `).all();

  console.log(`  ✓ ${postsTags.length} 件のリレーションを抽出`);
  return postsTags;
}

// users テーブル抽出
function extractUsers(db) {
  console.log('👤 users テーブルを抽出中...');

  const users = db.prepare(`
    SELECT id, name, slug, email, password, bio, profile_image
    FROM users
  `).all();

  console.log(`  ✓ ${users.length} 件のユーザーを抽出`);
  return users;
}

// settings テーブル抽出
function extractSettings(db) {
  console.log('⚙️  settings テーブルを抽出中...');

  const settings = db.prepare(`
    SELECT key, value
    FROM settings
    WHERE key IN ('title', 'description', 'navigation', 'logo', 'cover_image', 'icon')
  `).all();

  console.log(`  ✓ ${settings.length} 件の設定を抽出`);
  return settings;
}

// 画像パスマッピングの生成
function generateImageMapping(posts) {
  console.log('🖼️  画像パスマッピングを生成中...');

  const imageMapping = new Map();
  const imgRegex = /\/content\/images\/[^"'\s)]+/g;

  posts.forEach(post => {
    // feature_image
    if (post.feature_image && post.feature_image.startsWith('/content/images/')) {
      imageMapping.set(post.feature_image, null);
    }

    // og_image
    if (post.og_image && post.og_image.startsWith('/content/images/')) {
      imageMapping.set(post.og_image, null);
    }

    // twitter_image
    if (post.twitter_image && post.twitter_image.startsWith('/content/images/')) {
      imageMapping.set(post.twitter_image, null);
    }

    // html 内の画像パス
    if (post.html) {
      const matches = post.html.match(imgRegex) || [];
      matches.forEach(img => imageMapping.set(img, null));
    }

    // mobiledoc 内の画像パス
    if (post.mobiledoc) {
      const matches = post.mobiledoc.match(imgRegex) || [];
      matches.forEach(img => imageMapping.set(img, null));
    }
  });

  console.log(`  ✓ ${imageMapping.size} 件の画像パスを検出`);
  return Object.fromEntries(imageMapping);
}

// データの保存
function saveData(outputDir, data) {
  console.log(`\n💾 データを保存中: ${outputDir}`);

  // ディレクトリ作成
  fs.mkdirSync(outputDir, { recursive: true });

  // 各データを JSON ファイルとして保存
  const files = [
    { name: 'posts.json', data: data.posts },
    { name: 'tags.json', data: data.tags },
    { name: 'posts_tags.json', data: data.postsTags },
    { name: 'users.json', data: data.users },
    { name: 'settings.json', data: data.settings },
    { name: 'image-mapping.json', data: data.imageMapping },
  ];

  files.forEach(({ name, data }) => {
    const filePath = path.join(outputDir, name);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  ✓ ${name} を保存`);
  });
}

// 統計情報の表示
function showStatistics(data) {
  console.log('\n📊 抽出統計:');
  console.log('─'.repeat(50));

  const publishedPosts = data.posts.filter(p => p.status === 'published').length;
  const draftPosts = data.posts.filter(p => p.status === 'draft').length;

  console.log(`  記事数:       ${data.posts.length} 件 (公開: ${publishedPosts}, 下書き: ${draftPosts})`);
  console.log(`  タグ数:       ${data.tags.length} 件`);
  console.log(`  ユーザー数:   ${data.users.length} 件`);
  console.log(`  設定項目数:   ${data.settings.length} 件`);
  console.log(`  画像数:       ${Object.keys(data.imageMapping).length} 件`);
  console.log('─'.repeat(50));
}

// メイン処理
function main() {
  console.log('🚀 Ghost データ抽出スクリプト\n');

  const config = parseArgs();
  const db = connectDatabase(config.db);

  try {
    // データ抽出
    const posts = extractPosts(db);
    const tags = extractTags(db);
    const postsTags = extractPostsTags(db);
    const users = extractUsers(db);
    const settings = extractSettings(db);
    const imageMapping = generateImageMapping(posts);

    // データ保存
    const data = { posts, tags, postsTags, users, settings, imageMapping };
    saveData(config.output, data);

    // 統計表示
    showStatistics(data);

    console.log('\n✅ データ抽出が完了しました!');
  } catch (error) {
    console.error(`\n❌ エラー: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { extractPosts, extractTags, extractUsers, extractSettings };
