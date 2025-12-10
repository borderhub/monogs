import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface StorageConfig {
  type: 'minio' | 'r2';
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  publicUrl: string;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

class StorageClient {
  private s3Client: S3Client;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;

    if (config.type === 'minio') {
      // MinIO configuration
      this.s3Client = new S3Client({
        endpoint: config.endpoint,
        region: config.region || 'us-east-1',
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: true, // MinIO requires path-style URLs
      });
    } else {
      // Cloudflare R2 configuration
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: config.endpoint,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }
  }

  /**
   * Upload a file to storage
   */
  async upload(key: string, body: Buffer, contentType: string): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    const url = `${this.config.publicUrl}/${key}`;

    return {
      url,
      key,
      bucket: this.config.bucket,
    };
  }

  /**
   * Delete a file from storage
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Get a file from storage
   */
  async get(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as any;
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  /**
   * Get public URL for a key
   */
  getPublicUrl(key: string): string {
    return `${this.config.publicUrl}/${key}`;
  }
}

// Singleton instance
let storageClient: StorageClient | null = null;

export function getStorageClient(): StorageClient {
  if (storageClient) {
    return storageClient;
  }

  const storageType = process.env.STORAGE_TYPE || 'minio';

  if (storageType === 'minio') {
    const config: StorageConfig = {
      type: 'minio',
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
      bucket: process.env.MINIO_BUCKET || 'monogs-images',
      publicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000/monogs-images',
    };
    storageClient = new StorageClient(config);
  } else if (storageType === 'r2') {
    const accountId = process.env.R2_ACCOUNT_ID;
    if (!accountId) {
      throw new Error('R2_ACCOUNT_ID is required for R2 storage');
    }

    const config: StorageConfig = {
      type: 'r2',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      bucket: process.env.R2_BUCKET || 'monogs-images',
      publicUrl: process.env.R2_PUBLIC_URL || 'https://images.monogs.net',
    };
    storageClient = new StorageClient(config);
  } else {
    throw new Error(`Invalid STORAGE_TYPE: ${storageType}`);
  }

  return storageClient;
}

export default StorageClient;
