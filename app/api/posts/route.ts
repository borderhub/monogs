import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { markdownToHtml } from '@/lib/markdown/converter';

// POST: 新規投稿作成
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, content, customExcerpt, featureImage, status, tagIds, newTags, galleryImages } = body;

    // マークダウンをHTMLに変換
    const html = content ? markdownToHtml(content) : '';

    // 必須フィールドのバリデーション
    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }

    // TODO: D1データベースに保存する実装
    // 現在はJSONファイルから読み込んでいるため、実際の保存は行わない
    // Cloudflare D1統合時に以下のような実装に置き換える:
    /*
    const db = await getDb();
    const postId = crypto.randomUUID();

    // 投稿を作成
    await db.insert(posts).values({
      id: postId,
      uuid: crypto.randomUUID(),
      title,
      slug,
      content,
      html: markdownToHtml(content),
      customExcerpt,
      featureImage,
      status,
      visibility: 'public',
      featured: false,
      createdAt: new Date().toISOString(),
      publishedAt: status === 'published' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
      authorId: session.user.id,
    });

    // 新しいタグを作成
    if (newTags && newTags.length > 0) {
      for (const tagName of newTags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const tagId = crypto.randomUUID();
        await db.insert(tags).values({
          id: tagId,
          name: tagName,
          slug: tagSlug,
          visibility: 'public',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        tagIds.push(tagId);
      }
    }

    // タグを紐付け
    if (tagIds && tagIds.length > 0) {
      for (let i = 0; i < tagIds.length; i++) {
        await db.insert(postsTags).values({
          id: crypto.randomUUID(),
          postId: postId,
          tagId: tagIds[i],
          sortOrder: i,
        });
      }
    }
    */

    console.log('Creating post:', {
      title,
      slug,
      content: content ? `${content.substring(0, 100)}...` : '',
      html: html ? `${html.substring(0, 100)}...` : '',
      status,
      tagIds,
      newTags,
      galleryImages,
    });

    return NextResponse.json(
      {
        message: 'Post created successfully (mock)',
        post: { title, slug, status, content, html },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
