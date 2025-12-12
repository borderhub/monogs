#!/usr/bin/env node

/**
 * MinIOからCloudflare R2にファイルをアップロードするスクリプト
 * 前提: R2バケットは事前にCloudflareダッシュボードで作成・クリア済み
 * Usage: node scripts/upload-minio-to-r2.mjs [preview|production]
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import { createWriteStream, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境の取得
const env = process.argv[2] || 'preview';
if (!['preview', 'production'].includes(env)) {
  console.error('Usage: node scripts/upload-minio-to-r2.mjs [preview|production]');
  process.exit(1);
}

console.log(`\n🚀 ${env}環境のR2にファイルをアップロードします\n`);

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

// 設定
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

function getContentType(key) {
  const ext = path.extname(key).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };

  return contentTypes[ext] || 'application/octet-stream';
}

async function downloadFromMinio(key, tmpPath) {
  const command = new GetObjectCommand({
    Bucket: minioBucket,
    Key: key,
  });

  const response = await minioClient.send(command);

  if (!response.Body) {
    throw new Error(`No body in response for ${key}`);
  }

  await pipeline(
    Readable.from(response.Body),
    createWriteStream(tmpPath)
  );
}

async function uploadToR2(key, tmpPath) {
  const contentType = getContentType(key);

  const cmd = `npx wrangler r2 object put ${r2Bucket}/${key} --file="${tmpPath}" --content-type="${contentType}"`;

  execSync(cmd, { stdio: 'pipe' });
}

async function main() {
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

        // 一時ファイルパス
        const tmpPath = `/tmp/r2-upload-${Date.now()}.tmp`;

        // MinIOからダウンロード
        await downloadFromMinio(obj.Key, tmpPath);

        // R2にアップロード
        await uploadToR2(obj.Key, tmpPath);

        // 一時ファイル削除
        unlinkSync(tmpPath);

        successCount++;
        console.log(`  ✓ アップロード完了`);
      } catch (error) {
        failCount++;
        console.error(`  ✗ エラー: ${error.message}`);
      }
    }

    console.log(`\n✅ アップロード完了: 成功 ${successCount}件 / 失敗 ${failCount}件\n`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
