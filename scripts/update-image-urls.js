#!/usr/bin/env node

/**
 * 記事内画像 URL 置換スクリプト
 *
 * 記事の HTML/Markdown 内の画像パスを R2 URL に置換
 *
 * 使用方法:
 *   node scripts/update-image-urls.js \
 *     --posts ./migration-data/posts-converted.json \
 *     --mapping ./migration-data/image-mapping.json \
 *     --output ./migration-data/posts-final.json
 */

const fs = require('fs');
const path = require('path');

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    posts: null,
    mapping: null,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--posts' && i + 1 < args.length) {
      config.posts = args[i + 1];
      i++;
    } else if (args[i] === '--mapping' && i + 1 < args.length) {
      config.mapping = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      config.output = args[i + 1];
      i++;
    }
  }

  if (!config.posts || !config.mapping || !config.output) {
    console.error('使用方法: node update-image-urls.js --posts <POSTS_FILE> --mapping <MAPPING_FILE> --output <OUTPUT_FILE>');
    process.exit(1);
  }

  return config;
}

// 日付を正規化（ISO 8601 形式）
function normalizeDate(dateStr) {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch (e) {
    return null;
  }
}

// スラッグを正規化
function normalizeSlug(slug) {
  if (!slug) return '';

  return slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\_]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// テキスト内の画像 URL を置換
function replaceImageUrls(text, mapping) {
  if (!text) return text;

  let updatedText = text;
  let replaceCount = 0;

  Object.entries(mapping).forEach(([oldPath, newUrl]) => {
    if (!newUrl) return;

    // 正規表現でエスケープ
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedOldPath, 'g');

    const matches = updatedText.match(regex);
    if (matches) {
      replaceCount += matches.length;
      updatedText = updatedText.replace(regex, newUrl);
    }
  });

  return { text: updatedText, count: replaceCount };
}

// 記事データの更新
function updatePosts(posts, mapping) {
  console.log(`📝 ${posts.length} 件の記事を更新中...\n`);

  let totalReplaceCount = 0;
  let updatedPostCount = 0;

  const updatedPosts = posts.map((post, index) => {
    let { content, html, feature_image, og_image, twitter_image } = post;
    let postReplaceCount = 0;

    // content (Markdown) の画像 URL 置換
    if (content) {
      const { text, count } = replaceImageUrls(content, mapping);
      content = text;
      postReplaceCount += count;
    }

    // html の画像 URL 置換
    if (html) {
      const { text, count } = replaceImageUrls(html, mapping);
      html = text;
      postReplaceCount += count;
    }

    // feature_image の置換
    if (feature_image && mapping[feature_image]) {
      feature_image = mapping[feature_image];
      postReplaceCount++;
    }

    // og_image の置換
    if (og_image && mapping[og_image]) {
      og_image = mapping[og_image];
      postReplaceCount++;
    }

    // twitter_image の置換
    if (twitter_image && mapping[twitter_image]) {
      twitter_image = mapping[twitter_image];
      postReplaceCount++;
    }

    // 日付の正規化
    const published_at = normalizeDate(post.published_at);
    const created_at = normalizeDate(post.created_at);
    const updated_at = normalizeDate(post.updated_at);

    // スラッグの正規化
    const slug = normalizeSlug(post.slug);

    // 統計
    if (postReplaceCount > 0) {
      updatedPostCount++;
      totalReplaceCount += postReplaceCount;
    }

    // 進捗表示
    if ((index + 1) % 10 === 0 || index + 1 === posts.length) {
      process.stdout.write(`  進捗: ${index + 1}/${posts.length}\r`);
    }

    return {
      ...post,
      content,
      html,
      feature_image,
      og_image,
      twitter_image,
      slug,
      published_at,
      created_at,
      updated_at,
    };
  });

  console.log('\n');
  console.log(`  ✓ 更新された記事: ${updatedPostCount} 件`);
  console.log(`  ✓ 置換された URL: ${totalReplaceCount} 件`);

  return updatedPosts;
}

// メイン処理
function main() {
  console.log('🔄 画像 URL 更新スクリプト\n');

  const config = parseArgs();

  // ファイル読み込み
  if (!fs.existsSync(config.posts)) {
    console.error(`エラー: 記事ファイルが見つかりません: ${config.posts}`);
    process.exit(1);
  }

  if (!fs.existsSync(config.mapping)) {
    console.error(`エラー: マッピングファイルが見つかりません: ${config.mapping}`);
    process.exit(1);
  }

  console.log(`📂 記事ファイル: ${config.posts}`);
  console.log(`📝 マッピング: ${config.mapping}`);
  console.log(`💾 出力: ${config.output}\n`);

  const posts = JSON.parse(fs.readFileSync(config.posts, 'utf-8'));
  const mapping = JSON.parse(fs.readFileSync(config.mapping, 'utf-8'));

  // マッピングの統計
  const totalMappings = Object.keys(mapping).length;
  const validMappings = Object.values(mapping).filter(v => v !== null).length;
  console.log(`🗺️  画像マッピング: ${validMappings}/${totalMappings} 件が有効\n`);

  // 更新実行
  const updatedPosts = updatePosts(posts, mapping);

  // 出力
  const outputDir = path.dirname(config.output);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(config.output, JSON.stringify(updatedPosts, null, 2));

  console.log(`\n✅ 更新完了: ${config.output}`);
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { updatePosts, normalizeDate, normalizeSlug };
