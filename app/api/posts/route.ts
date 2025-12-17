import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { createPost, createTag, updatePostTags } from '@/lib/db/mutations';

// POST: 新規投稿作成
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, content, customExcerpt, featureImage, status, tagIds = [], newTags = [], galleryImages } = body;

    // 必須フィールドのバリデーション
    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const postId = crypto.randomUUID();

    // 新しいタグを作成
    const allTagIds = [...tagIds];
    if (newTags && newTags.length > 0) {
      for (const tagName of newTags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const tagId = crypto.randomUUID();
        await createTag(db, {
          id: tagId,
          name: tagName,
          slug: tagSlug,
        });
        allTagIds.push(tagId);
      }
    }

    // 投稿を作成
    const post = await createPost(db, {
      id: postId,
      uuid: crypto.randomUUID(),
      title,
      slug,
      content,
      customExcerpt,
      featureImage,
      galleryImages: galleryImages ? JSON.stringify(galleryImages) : null,
      status: status || 'draft',
    });

    // タグを紐付け
    if (allTagIds.length > 0) {
      await updatePostTags(db, postId, allTagIds);
    }

    console.log('Created post:', {
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status,
    });

    return NextResponse.json(
      {
        message: 'Post created successfully',
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          status: post.status,
        },
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
