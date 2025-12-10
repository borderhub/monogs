import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// POST: 新規タグ作成
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description } = body;

    // 必須フィールドのバリデーション
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // TODO: D1データベースに保存する実装
    // 現在はJSONファイルから読み込んでいるため、実際の保存は行わない
    // Cloudflare D1統合時に以下のような実装に置き換える:
    /*
    const db = await getDb();
    const result = await db.insert(tags).values({
      id: crypto.randomUUID(),
      name,
      slug,
      description,
      featureImage: null,
      visibility: 'public',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    */

    console.log('Creating tag:', { name, slug, description });

    return NextResponse.json(
      {
        message: 'Tag created successfully (mock)',
        tag: { name, slug, description },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
