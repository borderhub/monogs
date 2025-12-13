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
      'x_handle',
      'instagram',
      'facebook',
      'bandcamp',
      'github',
    ]);

    return NextResponse.json({
      siteTitle: settingsData.site_title || 'monogs web site',
      siteDescription: settingsData.site_description || 'monogs works and art project',
      siteUrl: settingsData.site_url || 'https://monogs.net',
      ogImage: settingsData.og_image || '',
      xHandle: settingsData.x_handle || '',
      instagram: settingsData.instagram || '',
      facebook: settingsData.facebook || '',
      bandcamp: settingsData.bandcamp || '',
      github: settingsData.github || '',
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
    const { siteTitle, siteDescription, siteUrl, ogImage, xHandle, instagram, facebook, bandcamp, github } = body;

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
    if (xHandle !== undefined) {
      await upsertSetting('x_handle', xHandle || '');
    }
    if (instagram !== undefined) {
      await upsertSetting('instagram', instagram || '');
    }
    if (facebook !== undefined) {
      await upsertSetting('facebook', facebook || '');
    }
    if (bandcamp !== undefined) {
      await upsertSetting('bandcamp', bandcamp || '');
    }
    if (github !== undefined) {
      await upsertSetting('github', github || '');
    }

    console.log('Settings updated successfully:', {
      siteTitle,
      siteDescription,
      siteUrl,
      ogImage,
      xHandle,
      instagram,
      facebook,
      bandcamp,
      github,
    });

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: { siteTitle, siteDescription, siteUrl, ogImage, xHandle, instagram, facebook, bandcamp, github },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
