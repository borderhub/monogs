import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSettings, upsertSetting } from '@/lib/db/queries';

// GET: 設定取得
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settingsData = await getSettings([
      'site_title',
      'site_description',
      'site_url',
      'og_image',
      'twitter_handle',
    ]);

    return NextResponse.json({
      siteTitle: settingsData.site_title || 'monogs web site',
      siteDescription: settingsData.site_description || 'monogs works and art project',
      siteUrl: settingsData.site_url || 'https://monogs.net',
      ogImage: settingsData.og_image || '',
      twitterHandle: settingsData.twitter_handle || '@monogs',
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

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

    // D1データベースで設定を更新
    await upsertSetting('site_title', siteTitle);
    await upsertSetting('site_description', siteDescription);
    await upsertSetting('site_url', siteUrl);
    if (ogImage !== undefined) {
      await upsertSetting('og_image', ogImage || '');
    }
    if (twitterHandle !== undefined) {
      await upsertSetting('twitter_handle', twitterHandle || '');
    }

    console.log('Settings updated successfully:', {
      siteTitle,
      siteDescription,
      siteUrl,
      ogImage,
      twitterHandle,
    });

    return NextResponse.json({
      message: 'Settings updated successfully',
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
