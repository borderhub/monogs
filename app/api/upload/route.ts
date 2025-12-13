import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getStorageClient } from '@/lib/storage/client';

// POST: 画像アップロード
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const slug = formData.get('slug') as string; // 記事のslugを使用
    const isGallery = formData.get('isGallery') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ファイルタイプの検証
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // ファイルサイズの検証（最大10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // ストレージにアップロード
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // ファイル名をサニタイズ
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}-${sanitizedFileName}`;

    // パスの構築: slugがある場合は記事専用ディレクトリ、ない場合は共通ディレクトリ
    let key: string;
    if (slug) {
      // slugベースのディレクトリ: /content/images/YYYY/MM/[slug]/[gallery/]filename
      const galleryPath = isGallery ? 'gallery/' : '';
      key = `content/images/${year}/${month}/${slug}/${galleryPath}${fileName}`;
    } else {
      // 共通ディレクトリ（後方互換性のため）
      key = `content/images/${year}/${month}/${fileName}`;
    }

    const storageClient = getStorageClient();
    const result = await storageClient.upload(key, buffer, file.type);

    console.log('File uploaded successfully:', {
      name: file.name,
      type: file.type,
      size: file.size,
      key: result.key,
      url: result.url,
    });

    return NextResponse.json({
      url: result.url,
      filename: file.name,
      size: file.size,
      type: file.type,
      key: result.key,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
