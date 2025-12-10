/**
 * Database Queries
 * ローカルSQLiteまたはD1から投稿・タグデータを取得
 */

import { eq, desc, and, inArray, notInArray } from 'drizzle-orm';
import { getDb } from './client';
import { posts, tags, postsTags } from './schema';
import { markdownToHtml } from '@/lib/markdown/converter';
import { EXCLUDED_TAG_SLUGS } from '@/lib/config/excluded-tags';

// Type definitions
export interface Post {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  content: string | null;
  html: string | null;
  featureImage: string | null;
  galleryImages: string | null; // JSON string of array
  featured: boolean;
  visibility: string;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string | null;
  customExcerpt: string | null;
  codeinjectionHead: string | null;
  codeinjectionFoot: string | null;
  customTemplate: string | null;
  canonicalUrl: string | null;
  authorId: string;
  status: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featureImage: string | null;
  visibility: string;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Convert database post to application Post type
 */
function convertPost(raw: typeof posts.$inferSelect): Post {
  // html が空、<p></p>のみ、または <p></p> で終わる場合は content から生成
  let html = raw.html;
  if (raw.content) {
    if (!html || html.trim() === '' || html.trim() === '<p></p>') {
      // htmlが空または<p></p>のみの場合、contentから全て生成
      html = markdownToHtml(raw.content);
    } else if (html.trim().endsWith('<p></p>') || html.trim().endsWith('\n<p></p>')) {
      // htmlが<p></p>で終わる場合、<p></p>を削除してcontentから生成したHTMLを追加
      html = html.replace(/\s*<p><\/p>\s*$/, '') + '\n\n' + markdownToHtml(raw.content);
    }
  }

  return {
    id: raw.id,
    uuid: raw.uuid,
    title: raw.title,
    slug: raw.slug,
    content: raw.content,
    html: html,
    featureImage: raw.featureImage,
    galleryImages: raw.galleryImages,
    featured: raw.featured,
    visibility: raw.visibility,
    createdAt: raw.createdAt,
    publishedAt: raw.publishedAt,
    updatedAt: raw.updatedAt,
    customExcerpt: raw.customExcerpt,
    codeinjectionHead: null,
    codeinjectionFoot: null,
    customTemplate: null,
    canonicalUrl: null,
    authorId: 'default-author',
    status: raw.status,
  };
}

/**
 * Filter posts by excluded tags
 */
async function filterPostsByExcludedTags(posts: Post[]): Promise<Post[]> {
  if (EXCLUDED_TAG_SLUGS.length === 0) {
    return posts;
  }

  const db = getDb();
  const filteredPosts: Post[] = [];

  for (const post of posts) {
    // Get tags for this post
    const postTagsList = await db
      .select({
        tagSlug: tags.slug,
      })
      .from(postsTags)
      .innerJoin(tags, eq(postsTags.tagId, tags.id))
      .where(eq(postsTags.postId, post.id));

    const hasExcludedTag = postTagsList.some(pt =>
      EXCLUDED_TAG_SLUGS.includes(pt.tagSlug)
    );

    if (!hasExcludedTag) {
      filteredPosts.push(post);
    }
  }

  return filteredPosts;
}

/**
 * Get all posts
 */
export async function getAllPosts(): Promise<Post[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(posts)
    .where(and(eq(posts.visibility, 'public')))
    .orderBy(desc(posts.publishedAt));

  return result.map(convertPost);
}

/**
 * Get all published posts
 */
export async function getPosts(): Promise<Post[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.visibility, 'public')))
    .orderBy(desc(posts.publishedAt));

  const allPosts = result.map(convertPost);
  return await filterPostsByExcludedTags(allPosts);
}

/**
 * Get post by slug
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const db = getDb();

  const result = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, 'published')))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return convertPost(result[0]);
}

/**
 * Get tags for a post
 */
export async function getPostTags(postId: string): Promise<Tag[]> {
  const db = getDb();

  const result = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      featureImage: tags.featureImage,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    })
    .from(postsTags)
    .innerJoin(tags, eq(postsTags.tagId, tags.id))
    .where(eq(postsTags.postId, postId))
    .orderBy(postsTags.sortOrder);

  return result.map(tag => ({
    ...tag,
    visibility: 'public',
    metaTitle: null,
    metaDescription: null,
    updatedAt: tag.updatedAt || null,
  }));
}

/**
 * Get all tags
 */
export async function getTags(): Promise<Tag[]> {
  const db = getDb();

  const result = await db.select().from(tags);

  return result.map(tag => ({
    ...tag,
    visibility: 'public',
    metaTitle: null,
    metaDescription: null,
    updatedAt: tag.updatedAt || null,
  }));
}

/**
 * Get tag by slug
 */
export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const db = getDb();

  const result = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0],
    visibility: 'public',
    metaTitle: null,
    metaDescription: null,
    updatedAt: result[0].updatedAt || null,
  };
}

/**
 * Search posts by keyword
 */
export async function searchPosts(keyword: string): Promise<Post[]> {
  if (!keyword || keyword.trim() === '') {
    return [];
  }

  const db = getDb();

  const result = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public')
      )
    )
    .orderBy(desc(posts.publishedAt));

  // Filter by keyword (title or content)
  const filtered = result.filter(post => {
    const titleMatch = post.title.toLowerCase().includes(keyword.toLowerCase());
    const contentMatch = post.content?.toLowerCase().includes(keyword.toLowerCase()) || false;
    const htmlMatch = post.html?.toLowerCase().includes(keyword.toLowerCase()) || false;
    return titleMatch || contentMatch || htmlMatch;
  });

  const allPosts = filtered.map(convertPost);
  return await filterPostsByExcludedTags(allPosts);
}

/**
 * Get posts by tag
 */
export async function getPostsByTag(tagSlug: string): Promise<Post[]> {
  const tag = await getTagBySlug(tagSlug);
  if (!tag) return [];

  const db = getDb();

  // Get post IDs for this tag
  const postIds = await db
    .select({ postId: postsTags.postId })
    .from(postsTags)
    .where(eq(postsTags.tagId, tag.id));

  if (postIds.length === 0) return [];

  // Get posts
  const result = await db
    .select()
    .from(posts)
    .where(
      and(
        inArray(posts.id, postIds.map(p => p.postId)),
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public')
      )
    )
    .orderBy(desc(posts.publishedAt));

  return result.map(convertPost);
}

/**
 * Get featured posts
 */
export async function getFeaturedPosts(): Promise<Post[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.featured, true),
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public')
      )
    )
    .orderBy(desc(posts.publishedAt))
    .limit(5);

  return result.map(convertPost);
}

/**
 * Get post count
 */
export async function getPostCount(): Promise<number> {
  const db = getDb();

  const result = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.visibility, 'public')));

  return result.length;
}

/**
 * Get post count by tag
 */
export async function getPostCountByTag(tagId: string): Promise<number> {
  const db = getDb();

  const postIds = await db
    .select({ postId: postsTags.postId })
    .from(postsTags)
    .where(eq(postsTags.tagId, tagId));

  if (postIds.length === 0) return 0;

  const result = await db
    .select()
    .from(posts)
    .where(
      and(
        inArray(posts.id, postIds.map(p => p.postId)),
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public')
      )
    );

  return result.length;
}

/**
 * Archive data interface
 */
export interface ArchiveMonth {
  year: number;
  month: number;
  count: number;
}

/**
 * Get archive list (year/month with post counts)
 */
export async function getArchiveList(): Promise<ArchiveMonth[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.visibility, 'public')))
    .orderBy(desc(posts.publishedAt));

  const archiveMap = new Map<string, number>();

  result.forEach(post => {
    if (post.publishedAt) {
      const date = new Date(post.publishedAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;
      archiveMap.set(key, (archiveMap.get(key) || 0) + 1);
    }
  });

  const archives: ArchiveMonth[] = [];
  archiveMap.forEach((count, key) => {
    const [year, month] = key.split('-').map(Number);
    archives.push({ year, month, count });
  });

  // Sort by year and month descending
  archives.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return archives;
}

/**
 * Get posts by year and month
 */
export async function getPostsByYearMonth(
  year: number,
  month: number
): Promise<Post[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.visibility, 'public')))
    .orderBy(desc(posts.publishedAt));

  // Filter by year and month
  const filtered = result.filter(post => {
    if (!post.publishedAt) return false;
    const date = new Date(post.publishedAt);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  const allPosts = filtered.map(convertPost);
  return await filterPostsByExcludedTags(allPosts);
}

/**
 * Get related posts by tags
 */
export async function getRelatedPosts(
  postId: string,
  limit: number = 5
): Promise<Post[]> {
  const db = getDb();

  // Get tags for the current post
  const currentPostTags = await db
    .select({ tagId: postsTags.tagId })
    .from(postsTags)
    .where(eq(postsTags.postId, postId));

  if (currentPostTags.length === 0) {
    return [];
  }

  const tagIds = currentPostTags.map(pt => pt.tagId);

  // Get other posts with the same tags
  const relatedPostIds = await db
    .select({ postId: postsTags.postId })
    .from(postsTags)
    .where(
      and(
        inArray(postsTags.tagId, tagIds),
        notInArray(postsTags.postId, [postId])
      )
    );

  if (relatedPostIds.length === 0) {
    return [];
  }

  // Count tag matches for each post
  const postTagCounts = new Map<string, number>();
  relatedPostIds.forEach(rp => {
    postTagCounts.set(rp.postId, (postTagCounts.get(rp.postId) || 0) + 1);
  });

  // Sort by number of matching tags
  const sortedPostIds = Array.from(postTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([postId]) => postId)
    .slice(0, limit * 2); // Get more than needed for filtering

  // Get the posts
  const result = await db
    .select()
    .from(posts)
    .where(
      and(
        inArray(posts.id, sortedPostIds),
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public')
      )
    )
    .orderBy(desc(posts.publishedAt));

  const allPosts = result.map(convertPost);
  const filteredPosts = await filterPostsByExcludedTags(allPosts);

  // Re-sort by tag match count and limit
  const finalPosts = filteredPosts
    .sort((a, b) => {
      const aCount = postTagCounts.get(a.id) || 0;
      const bCount = postTagCounts.get(b.id) || 0;
      return bCount - aCount;
    })
    .slice(0, limit);

  return finalPosts;
}
