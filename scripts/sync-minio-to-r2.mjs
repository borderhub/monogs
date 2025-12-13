#!/usr/bin/env node

/**
 * MinIOからCloudflare R2にファイルを同期するスクリプト
 * Usage: node scripts/sync-minio-to-r2.mjs [preview|production]
 */

import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境の取得
const env = process.argv[2] || 'preview';
if (!['preview', 'production'].includes(env)) {
  console.error('Usage: node scripts/sync-minio-to-r2.mjs [preview|production]');
  process.exit(1);
}

console.log(`\n🚀 ${env}環境のR2にファイルを同期します\n`);

// MinIO設定
const minioClient = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin123',
  },
  forcePathStyle: true,
});

// R2バケット名
const r2Bucket = env === 'preview' ? 'monogs-r2-preview' : 'monogs-r2-upload';
const minioBucket = 'monogs-images';

async function listMinioObjects() {
  console.log('📂 MinIOからファイル一覧を取得中...');

  const objects = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: minioBucket,
      ContinuationToken: continuationToken,
    });

    const response = await minioClient.send(command);

    if (response.Contents) {
      objects.push(...response.Contents);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`✓ ${objects.length}個のファイルを検出しました\n`);
  return objects;
}

async function uploadToR2(key, body, contentType) {
  // wrangler CLIを使用してR2にアップロード
  const tmpFile = `/tmp/r2-upload-${Date.now()}-${path.basename(key)}`;

  // 一時ファイルに書き込み
  await import('fs/promises').then(fs => fs.writeFile(tmpFile, body));

  try {
    // wranglerコマンドでアップロード
    const cmd = `npx wrangler r2 object put ${r2Bucket}/${key} --file="${tmpFile}" --content-type="${contentType}" --remote`;
    execSync(cmd, { stdio: 'pipe' });

    // 一時ファイルを削除
    await import('fs/promises').then(fs => fs.unlink(tmpFile));
  } catch (error) {
    console.error(`  ✗ エラー: ${error.message}`);
    throw error;
  }
}

async function getMinioObject(key) {
  const command = new ListObjectsV2Command({
    Bucket: minioBucket,
    Prefix: key,
    MaxKeys: 1,
  });

  const response = await minioClient.send(command);

  if (!response.Contents || response.Contents.length === 0) {
    throw new Error(`Object not found: ${key}`);
  }

  // MinIOから直接ダウンロード
  const url = `http://localhost:9000/${minioBucket}/${key}`;
  const fetchResponse = await fetch(url);

  if (!fetchResponse.ok) {
    throw new Error(`Failed to fetch: ${url}`);
  }

  return Buffer.from(await fetchResponse.arrayBuffer());
}

function getContentType(key) {
  const ext = path.extname(key).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
  };

  return contentTypes[ext] || 'application/octet-stream';
}

async function syncToR2() {
  try {
    const objects = await listMinioObjects();

    console.log(`🔄 R2バケット "${r2Bucket}" にアップロード中...\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const progress = `[${i + 1}/${objects.length}]`;

      try {
        console.log(`${progress} ${obj.Key}`);

        // MinIOからファイルを取得
        const body = await getMinioObject(obj.Key);
        const contentType = getContentType(obj.Key);

        // R2にアップロード
        await uploadToR2(obj.Key, body, contentType);

        successCount++;
        console.log(`  ✓ アップロード完了`);
      } catch (error) {
        failCount++;
        console.error(`  ✗ エラー: ${error.message}`);
      }
    }

    console.log(`\n✅ 同期完了: 成功 ${successCount}件 / 失敗 ${failCount}件\n`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
syncToR2();
