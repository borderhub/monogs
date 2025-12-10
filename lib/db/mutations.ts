/**
 * Database Mutations
 * 投稿・タグの作成・更新・削除
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from './client';
import { posts, tags, postsTags } from './schema';
import { markdownToHtml } from '@/lib/markdown/converter';

export interface UpdatePostData {
  title?: string;
  slug?: string;
  content?: string;
  html?: string;
  featureImage?: string;
  galleryImages?: string;
  featured?: boolean;
  status?: string;
  visibility?: string;
  customExcerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

export interface CreatePostData {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  content?: string | null;
  html?: string | null;
  featureImage?: string | null;
  galleryImages?: string | null;
  featured?: boolean;
  status: string;
  visibility?: string;
  customExcerpt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  publishedAt?: string | null;
}

/**
 * Update a post
 */
export async function updatePost(
  db: DbClient,
  postId: string,
  data: UpdatePostData
): Promise<void> {
  const updateData: Record<string, any> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // If content is updated but html is not, generate html from content
  if (data.content && !data.html) {
    updateData.html = markdownToHtml(data.content);
  }

  // If status changes to 'published' and publishedAt is null, set it
  if (data.status === 'published') {
    const existingPost = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (existingPost.length > 0 && !existingPost[0].publishedAt) {
      updateData.publishedAt = new Date().toISOString();
    }
  }

  await db.update(posts).set(updateData).where(eq(posts.id, postId));
}

/**
 * Create a new post
 */
export async function createPost(
  db: DbClient,
  data: CreatePostData
): Promise<typeof posts.$inferSelect> {
  const now = new Date().toISOString();

  const insertData = {
    id: data.id,
    uuid: data.uuid,
    title: data.title,
    slug: data.slug,
    content: data.content || null,
    html: data.html || (data.content ? markdownToHtml(data.content) : null),
    featureImage: data.featureImage || null,
    galleryImages: data.galleryImages || null,
    featured: data.featured || false,
    status: data.status,
    visibility: data.visibility || 'public',
    customExcerpt: data.customExcerpt || null,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    publishedAt: data.status === 'published' ? (data.publishedAt || now) : null,
    createdAt: now,
    updatedAt: null,
  };

  await db.insert(posts).values(insertData);

  const result = await db.select().from(posts).where(eq(posts.id, data.id)).limit(1);
  return result[0];
}

/**
 * Delete a post
 */
export async function deletePost(db: DbClient, postId: string): Promise<void> {
  await db.delete(posts).where(eq(posts.id, postId));
}

/**
 * Update post tags
 */
export async function updatePostTags(
  db: DbClient,
  postId: string,
  tagIds: string[]
): Promise<void> {
  // Delete existing tags
  await db.delete(postsTags).where(eq(postsTags.postId, postId));

  // Insert new tags
  if (tagIds.length > 0) {
    const values = tagIds.map((tagId, index) => ({
      id: `${postId}-${tagId}`,
      postId,
      tagId,
      sortOrder: index,
    }));

    await db.insert(postsTags).values(values);
  }
}

/**
 * Create a new tag
 */
export async function createTag(
  db: DbClient,
  data: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    featureImage?: string | null;
  }
): Promise<typeof tags.$inferSelect> {
  const now = new Date().toISOString();

  await db.insert(tags).values({
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    featureImage: data.featureImage || null,
    createdAt: now,
    updatedAt: null,
  });

  const result = await db.select().from(tags).where(eq(tags.id, data.id)).limit(1);
  return result[0];
}
