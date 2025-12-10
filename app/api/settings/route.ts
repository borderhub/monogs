import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// PUT: 設定更新
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { siteTitle, siteDescription, siteUrl, ogImage, twitterHandle } = body;

    // 必須フィールドのバリデーション
    if (!siteTitle || !siteDescription || !siteUrl) {
      return NextResponse.json(
        { error: 'Site title, description, and URL are required' },
        { status: 400 }
      );
    }

    // TODO: D1データベースで設定を更新する実装
    // 現在はモック実装
    // Cloudflare D1統合時に以下のような実装に置き換える:
    /*
    const db = await getDb();
    await db.update(settings)
      .set({
        siteTitle,
        siteDescription,
        siteUrl,
        ogImage,
        twitterHandle,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(settings.id, '1')); // 設定は通常1レコード
    */

    console.log('Updating settings:', {
      siteTitle,
      siteDescription,
      siteUrl,
      ogImage,
      twitterHandle,
    });

    return NextResponse.json({
      message: 'Settings updated successfully (mock)',
      settings: { siteTitle, siteDescription, siteUrl, ogImage, twitterHandle },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
