import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PUT: タグ更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, description } = body;

    // 必須フィールドのバリデーション
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // TODO: D1データベースで更新する実装
    // 現在はJSONファイルから読み込んでいるため、実際の更新は行わない
    // Cloudflare D1統合時に以下のような実装に置き換える:
    /*
    const db = await getDb();
    const result = await db.update(tags)
      .set({
        name,
        slug,
        description,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tags.id, id));
    */

    console.log('Updating tag:', { id, name, slug, description });

    return NextResponse.json({
      message: 'Tag updated successfully (mock)',
      tag: { id, name, slug, description },
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// DELETE: タグ削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // TODO: D1データベースで削除する実装
    // 現在はJSONファイルから読み込んでいるため、実際の削除は行わない
    // Cloudflare D1統合時に以下のような実装に置き換える:
    /*
    const db = await getDb();
    await db.delete(tags).where(eq(tags.id, id));
    */

    console.log('Deleting tag:', { id });

    return NextResponse.json({
      message: 'Tag deleted successfully (mock)',
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
