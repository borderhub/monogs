import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { markdownToHtml } from '@/lib/markdown/converter';
import { getDb } from '@/lib/db/client';
import { updatePost, deletePost, updatePostTags, createTag } from '@/lib/db/mutations';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PUT: Update post
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, slug, content, customExcerpt, featureImage, status, tagIds, newTags, galleryImages } = body;

    // Validate required fields
    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }

    // Convert Markdown to HTML
    const html = content ? markdownToHtml(content) : '';

    const db = getDb();

    // Update post
    await updatePost(db, id, {
      title,
      slug,
      content,
      html,
      customExcerpt,
      featureImage,
      galleryImages: galleryImages ? JSON.stringify(galleryImages) : undefined,
      status,
    });

    // Handle new tags
    const allTagIds = [...(tagIds || [])];
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

    // Update post tags
    await updatePostTags(db, id, allTagIds);

    console.log('Post updated:', {
      id,
      title,
      slug,
      status,
      tagIds: allTagIds,
    });

    return NextResponse.json({
      message: 'Post updated successfully',
      post: { id, title, slug, status, content, html },
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE: Delete post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    await deletePost(db, id);

    console.log('Post deleted:', { id });

    return NextResponse.json({
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
