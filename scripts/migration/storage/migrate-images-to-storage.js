/**
 * Migration script to upload images from public/content/images to MinIO/R2
 */

const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

// Get S3 client configuration
function getS3Client() {
  const storageType = process.env.STORAGE_TYPE || 'minio';

  if (storageType === 'minio') {
    return new S3Client({
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
      },
      forcePathStyle: true,
    });
  } else if (storageType === 'r2') {
    const accountId = process.env.R2_ACCOUNT_ID;
    if (!accountId) {
      throw new Error('R2_ACCOUNT_ID is required for R2 storage');
    }

    return new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  } else {
    throw new Error(`Invalid STORAGE_TYPE: ${storageType}`);
  }
}

// Get MIME type from file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Walk directory recursively
async function* walkDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath);
    } else {
      yield fullPath;
    }
  }
}

// Main function
async function main() {
  const publicImagesDir = path.join(process.cwd(), 'public', 'content', 'images');
  const bucket = process.env.STORAGE_TYPE === 'minio'
    ? (process.env.MINIO_BUCKET || 'monogs-images')
    : (process.env.R2_BUCKET || 'monogs-images');

  console.log('='.repeat(60));
  console.log('Image Migration Script');
  console.log('='.repeat(60));
  console.log(`Storage Type: ${process.env.STORAGE_TYPE || 'minio'}`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Source: ${publicImagesDir}`);
  console.log('='.repeat(60));
  console.log('');

  // Check if directory exists
  try {
    await fs.access(publicImagesDir);
  } catch (error) {
    console.error(`Error: ${publicImagesDir} not found`);
    process.exit(1);
  }

  const s3Client = getS3Client();
  let uploadedCount = 0;
  let errorCount = 0;
  const errors = [];

  // Walk through all files
  for await (const filePath of walkDirectory(publicImagesDir)) {
    // Filter image files only
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
      continue;
    }

    try {
      // Read file
      const fileBuffer = await fs.readFile(filePath);
      const mimeType = getMimeType(filePath);

      // Generate S3 key (remove public/content/images/ prefix)
      const relativePath = path.relative(publicImagesDir, filePath);
      const key = `content/images/${relativePath.replace(/\\/g, '/')}`;

      // Upload file
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await s3Client.send(command);
      uploadedCount++;
      console.log(`✓ ${key}`);
    } catch (error) {
      errorCount++;
      errors.push({ file: filePath, error: error.message });
      console.error(`✗ ${filePath}: ${error.message}`);
    }
  }

  // Print results
  console.log('');
  console.log('='.repeat(60));
  console.log('Migration Complete');
  console.log('='.repeat(60));
  console.log(`Success: ${uploadedCount} files`);
  console.log(`Failed: ${errorCount} files`);

  if (errorCount > 0) {
    console.log('');
    console.log('Error Details:');
    errors.forEach(({ file, error }) => {
      console.log(`  ${file}`);
      console.log(`    ${error}`);
    });
  }

  console.log('');
  console.log('Image URL Format:');
  const baseUrl = process.env.STORAGE_TYPE === 'minio'
    ? (process.env.MINIO_PUBLIC_URL || 'http://localhost:9000/monogs-images')
    : (process.env.R2_PUBLIC_URL || 'https://images.monogs.net');
  console.log(`  ${baseUrl}/content/images/YYYY/MM/filename.jpg`);
  console.log('');
}

main().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
