#!/usr/bin/env node

/**
 * Cloudflare R2 画像アップロードスクリプト
 *
 * Ghost の画像ファイルを Cloudflare R2 にアップロード
 *
 * 使用方法:
 *   node scripts/upload-to-r2.js \
 *     --source ../ghost/content/images/ \
 *     --bucket monogs-images \
 *     --mapping ./migration-data/image-mapping.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    source: null,
    bucket: null,
    mapping: null,
    baseUrl: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && i + 1 < args.length) {
      config.source = args[i + 1];
      i++;
    } else if (args[i] === '--bucket' && i + 1 < args.length) {
      config.bucket = args[i + 1];
      i++;
    } else if (args[i] === '--mapping' && i + 1 < args.length) {
      config.mapping = args[i + 1];
      i++;
    } else if (args[i] === '--base-url' && i + 1 < args.length) {
      config.baseUrl = args[i + 1];
      i++;
    }
  }

  if (!config.source || !config.bucket || !config.mapping) {
    console.error('使用方法: node upload-to-r2.js --source <SOURCE_DIR> --bucket <BUCKET_NAME> --mapping <MAPPING_FILE>');
    console.error('オプション: --base-url <R2_BASE_URL> (デフォルト: https://images.monogs.net)');
    process.exit(1);
  }

  // デフォルト Base URL
  if (!config.baseUrl) {
    config.baseUrl = 'https://images.monogs.net';
  }

  return config;
}

// wrangler コマンドの確認
function checkWranglerInstalled() {
  try {
    execSync('wrangler --version', { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error('❌ エラー: wrangler CLI がインストールされていません');
    console.error('インストール: npm install -g wrangler');
    console.error('認証: wrangler login');
    return false;
  }
}

// R2 バケットの存在確認
function checkBucketExists(bucketName) {
  try {
    execSync(`wrangler r2 bucket list`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.warn(`⚠️  警告: R2 バケット ${bucketName} が存在しない可能性があります`);
    console.warn(`作成: wrangler r2 bucket create ${bucketName}`);
    return false;
  }
}

// 画像ファイルの検出
function findImageFiles(sourceDir) {
  console.log(`📂 画像ファイルを検索中: ${sourceDir}`);

  if (!fs.existsSync(sourceDir)) {
    console.error(`エラー: ソースディレクトリが見つかりません: ${sourceDir}`);
    process.exit(1);
  }

  // 画像ファイルの拡張子
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'];
  const pattern = `**/*.{${imageExtensions.join(',')}}`;

  const files = glob.sync(pattern, {
    cwd: sourceDir,
    nodir: true,
    ignore: ['**/node_modules/**', '**/.git/**'],
  });

  console.log(`  ✓ ${files.length} 件の画像ファイルを検出`);
  return files;
}

// R2 にファイルをアップロード
function uploadFileToR2(localPath, r2Key, bucketName) {
  const cmd = `wrangler r2 object put ${bucketName}/${r2Key} --file="${localPath}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error(`  ❌ アップロード失敗: ${r2Key}`);
    console.error(`     エラー: ${e.message}`);
    return false;
  }
}

// 画像マッピングの更新
function updateImageMapping(mappingFile, updates) {
  let mapping = {};

  // 既存のマッピングを読み込み
  if (fs.existsSync(mappingFile)) {
    mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
  }

  // 更新を反映
  Object.assign(mapping, updates);

  // 保存
  const dir = path.dirname(mappingFile);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
}

// メイン処理
function main() {
  console.log('🚀 R2 画像アップロードスクリプト\n');

  const config = parseArgs();

  // 前提条件チェック
  if (!checkWranglerInstalled()) {
    process.exit(1);
  }

  checkBucketExists(config.bucket);

  console.log(`📂 ソース: ${config.source}`);
  console.log(`🪣 バケット: ${config.bucket}`);
  console.log(`🌐 Base URL: ${config.baseUrl}`);
  console.log(`📝 マッピング: ${config.mapping}\n`);

  // 画像ファイル検出
  const imageFiles = findImageFiles(config.source);

  if (imageFiles.length === 0) {
    console.log('✅ アップロードする画像がありません');
    return;
  }

  // アップロード実行
  console.log(`\n📤 アップロード開始...\n`);

  let successCount = 0;
  let failCount = 0;
  const mappingUpdates = {};

  imageFiles.forEach((file, index) => {
    const localPath = path.join(config.source, file);
    const r2Key = `content/images/${file}`;

    // 進捗表示
    process.stdout.write(`  [${index + 1}/${imageFiles.length}] ${file}...`);

    // アップロード
    const success = uploadFileToR2(localPath, r2Key, config.bucket);

    if (success) {
      successCount++;
      process.stdout.write(' ✓\n');

      // マッピング更新
      const oldPath = `/content/images/${file}`;
      const newUrl = `${config.baseUrl}/${r2Key}`;
      mappingUpdates[oldPath] = newUrl;
    } else {
      failCount++;
      process.stdout.write(' ✗\n');
    }
  });

  // マッピングファイル更新
  console.log(`\n📝 マッピングファイルを更新中...`);
  updateImageMapping(config.mapping, mappingUpdates);

  // 結果表示
  console.log('\n📊 アップロード結果:');
  console.log('─'.repeat(50));
  console.log(`  成功: ${successCount} 件`);
  if (failCount > 0) {
    console.log(`  失敗: ${failCount} 件`);
  }
  console.log('─'.repeat(50));

  if (failCount > 0) {
    console.log('\n⚠️  一部のファイルのアップロードに失敗しました');
    process.exit(1);
  } else {
    console.log('\n✅ すべての画像のアップロードが完了しました!');
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { uploadFileToR2, findImageFiles };
