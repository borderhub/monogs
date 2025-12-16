# Image Storage Setup Guide

## Overview

This project supports two image storage options:

- **Local Development**: MinIO - S3-compatible object storage running in Docker
- **Production**: Cloudflare R2 - Cloudflare's S3-compatible object storage

Storage type can be switched using the `STORAGE_TYPE` environment variable.

## MinIO Setup (Local Development)

### 1. Prerequisites

- Docker and Docker Compose must be installed

### 2. Environment Configuration

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with the following values:

```env
STORAGE_TYPE=minio

MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=monogs-images
MINIO_PUBLIC_URL=http://localhost:9000/monogs-images

NEXT_PUBLIC_IMAGES_URL=http://localhost:9000/monogs-images
```

### 3. Start MinIO

Start MinIO using Docker Compose:

```bash
npm run storage:up
```

Or directly:

```bash
docker compose up -d
```

### 4. Access MinIO Console

You can access the MinIO console to manage buckets and files:

- **MinIO Console**: http://localhost:9001
- **Username**: minioadmin
- **Password**: minioadmin123

### 5. Migrate Existing Images

Upload existing images from `public/content/images/` to MinIO:

```bash
npm run storage:migrate
```

This script will:

- Scan all image files in `public/content/images/`
- Upload them to MinIO's `monogs-images` bucket
- Preserve the original path structure (e.g., `content/images/2025/03/image.jpg`)

### 6. Stop MinIO

To stop MinIO:

```bash
npm run storage:down
```

Or directly:

```bash
docker compose down
```

### 7. View MinIO Logs

To view MinIO logs:

```bash
npm run storage:logs
```

## Cloudflare R2 Setup (Production)

### 1. Create R2 Bucket

1. Log in to Cloudflare Dashboard
2. Navigate to R2 Object Storage
3. Create a new bucket named `monogs-images`

### 2. Get R2 API Credentials

1. Go to R2 settings and create an API token
2. Create a new token with:
   - Name: monogs-r2-access
   - Permissions: Read and Write for the bucket
   - Bucket: monogs-images
3. Save the Account ID and API credentials

### 3. Configure Public Domain

To serve images from a custom domain:

1. Go to R2 bucket settings and configure a custom domain
2. Set up DNS for `images.monogs.net`
3. Configure DNS records

### 4. Environment Configuration

Configure production environment variables:

```env
STORAGE_TYPE=r2

R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET=monogs-images
R2_PUBLIC_URL=https://images.monogs.net

NEXT_PUBLIC_IMAGES_URL=https://images.monogs.net
```

### 5. Migrate Images

To migrate existing images to R2:

1. Update `STORAGE_TYPE` to `r2` in `.env.local`
2. Configure R2 credentials
3. Run the migration script

```bash
npm run storage:migrate
```

## Usage

### Upload Image API

You can upload images using the upload API, which automatically uses MinIO or R2:

```typescript
// POST /api/upload
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log(data.url); // http://localhost:9000/monogs-images/content/images/2025/12/1234567890-image.jpg
```

### Display Images

Using Next.js Image component:

```tsx
import Image from 'next/image';

<Image
  src="content/images/2025/03/image.jpg"
  alt="Sample"
  width={800}
  height={600}
/>
```

Or using regular img tag:

```tsx
<img
  src={`${process.env.NEXT_PUBLIC_IMAGES_URL}/content/images/2025/03/image.jpg`}
  alt="Sample"
/>
```

## File Structure

```
monogs/
├─ docker-compose.yml          # MinIO configuration
├─ .env.example                # Environment template
├─ .env.local                  # Local environment (gitignored)
├─ lib/
│  └─ storage/
│     └─ client.ts             # Storage abstraction layer
├─ app/
│  └─ api/
│     └─ upload/
│        └─ route.ts           # Upload API
├─ scripts/
│  └─ migrate-images-to-storage.js  # Image migration script
└─ public/
   └─ content/
      └─ images/               # Original images (can be removed after migration)
```

## Troubleshooting

### Cannot Connect to MinIO

**Issue**: `ECONNREFUSED` error

**Solution**:
1. Check if MinIO is running: `docker ps`
2. Restart MinIO: `npm run storage:down && npm run storage:up`
3. Verify ports 9000 and 9001 are not in use by other applications

### Images Not Loading

**Issue**: URLs are correct but images don't load

**Solution**:
1. Verify bucket exists in MinIO console (http://localhost:9001)
2. Check if bucket has public read permissions
3. Verify `NEXT_PUBLIC_IMAGES_URL` is correctly configured
4. Restart Next.js development server to pick up environment changes

### Migration Script Fails

**Issue**: `npm run storage:migrate` fails

**Solution**:
1. Verify MinIO is running
2. Check `.env.local` configuration
3. Verify `public/content/images/` directory exists

### Cannot Connect to R2

**Issue**: Production deployment cannot connect to R2

**Solution**:
1. Verify R2 API credentials are correct
2. Verify bucket name is correct
3. Verify Account ID is correct
4. Verify custom domain URL is correct

## Security Notes

### MinIO (Local Development)

- Default credentials (minioadmin/minioadmin123) are **for development only**
- Do not use these credentials in production

### Cloudflare R2 (Production)

- Keep API credentials in `.env` file and never commit to Git
- Use appropriate permissions (read/write only for specific bucket)
- Consider enabling CORS if needed

## References

- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for JavaScript v3 - S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
