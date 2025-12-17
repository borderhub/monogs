/**
 * Database Queries
 * ローカルSQLiteまたはD1から投稿・タグデータを取得
 */

import { eq, desc, and, inArray, notInArray } from 'drizzle-orm';
import { getDb } from './client';
import { posts, tags, postsTags, settings } from './schema';
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

export type PostWithTags = Post & { tags: Tag[] };

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
 * Filter posts by tags (optimized - single query)
 * - Exclude posts without any tags
 * - Exclude posts with excluded tags
 */
async function filterPostsByExcludedTags(posts: Post[]): Promise<Post[]> {
  if (posts.length === 0) {
    return posts;
  }

  const db = getDb();
  const postIds = posts.map(p => p.id);

  // Get all post-tag relationships in a single query
  const allPostTags = await db
    .select({
      postId: postsTags.postId,
      tagSlug: tags.slug,
    })
    .from(postsTags)
    .innerJoin(tags, eq(postsTags.tagId, tags.id))
    .where(inArray(postsTags.postId, postIds));

  // Build sets for filtering
  const postsWithTags = new Set<string>();
  const excludedPostIds = new Set<string>();

  allPostTags.forEach((pt: any) => {
    postsWithTags.add(pt.postId);
    if (EXCLUDED_TAG_SLUGS.includes(pt.tagSlug)) {
      excludedPostIds.add(pt.postId);
    }
  });

  // Filter: must have tags AND not have excluded tags
  return posts.filter(post => postsWithTags.has(post.id) && !excludedPostIds.has(post.id));
}

/**
 * Attach tags to posts (optimized - single query)
 */
async function attachTagsToPosts(posts: Post[]): Promise<PostWithTags[]> {
  if (posts.length === 0) {
    return posts as PostWithTags[];
  }

  const db = getDb();
  const postIds = posts.map(p => p.id);

  // Get all tags for all posts in a single query
  const postTagsData = await db
    .select({
      postId: postsTags.postId,
      tagId: tags.id,
      tagName: tags.name,
      tagSlug: tags.slug,
      tagDescription: tags.description,
      tagFeatureImage: tags.featureImage,
      tagCreatedAt: tags.createdAt,
      tagUpdatedAt: tags.updatedAt,
      sortOrder: postsTags.sortOrder,
    })
    .from(postsTags)
    .innerJoin(tags, eq(postsTags.tagId, tags.id))
    .where(inArray(postsTags.postId, postIds))
    .orderBy(postsTags.sortOrder);

  // Group tags by post ID
  const tagsByPostId = new Map<string, Tag[]>();
  postTagsData.forEach((data: any) => {
    if (!tagsByPostId.has(data.postId)) {
      tagsByPostId.set(data.postId, []);
    }
    tagsByPostId.get(data.postId)!.push({
      id: data.tagId,
      name: data.tagName,
      slug: data.tagSlug,
      description: data.tagDescription,
      featureImage: data.tagFeatureImage,
      visibility: 'public',
      metaTitle: null,
      metaDescription: null,
      createdAt: data.tagCreatedAt,
      updatedAt: data.tagUpdatedAt || null,
    });
  });

  // Attach tags to posts
  return posts.map(post => ({
    ...post,
    tags: tagsByPostId.get(post.id) || [],
  }));
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
 * Get all published posts with optional limit
 */
export async function getPosts(limit?: number): Promise<PostWithTags[]> {
  const db = getDb();

  let query = db
    .select()
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.visibility, 'public')))
    .orderBy(desc(posts.publishedAt));

  if (limit) {
    // Get more than needed to account for potential filtering
    // 除外タグが多い場合を考慮して3倍取得
    query = query.limit(limit * 3);
  }

  const result = await query;
  const allPosts = result.map(convertPost);
  const filteredPosts = await filterPostsByExcludedTags(allPosts);
  const postsWithTags = await attachTagsToPosts(filteredPosts);

  // Apply the actual limit after filtering
  return limit ? postsWithTags.slice(0, limit) : postsWithTags;
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

  return result.map((tag: any) => ({
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

  return result.map((tag: any) => ({
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
export async function searchPosts(keyword: string): Promise<PostWithTags[]> {
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
  const filtered = result.filter((post: any) => {
    const titleMatch = post.title.toLowerCase().includes(keyword.toLowerCase());
    const contentMatch = post.content?.toLowerCase().includes(keyword.toLowerCase()) || false;
    const htmlMatch = post.html?.toLowerCase().includes(keyword.toLowerCase()) || false;
    return titleMatch || contentMatch || htmlMatch;
  });

  const allPosts = filtered.map(convertPost);
  const filteredPosts = await filterPostsByExcludedTags(allPosts);
  return await attachTagsToPosts(filteredPosts);
}

/**
 * Get posts by tag
 */
export async function getPostsByTag(tagSlug: string): Promise<PostWithTags[]> {
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
        inArray(posts.id, postIds.map((p: any) => p.postId)),
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public')
      )
    )
    .orderBy(desc(posts.publishedAt));

  const allPosts = result.map(convertPost);
  return await attachTagsToPosts(allPosts);
}

/**
 * Get featured posts
 */
export async function getFeaturedPosts(): Promise<PostWithTags[]> {
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

  const allPosts = result.map(convertPost);
  const filteredPosts = await filterPostsByExcludedTags(allPosts);
  return await attachTagsToPosts(filteredPosts);
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
        inArray(posts.id, postIds.map((p: any) => p.postId)),
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

  result.forEach((post: any) => {
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
): Promise<PostWithTags[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.visibility, 'public')))
    .orderBy(desc(posts.publishedAt));

  // Filter by year and month
  const filtered = result.filter((post: any) => {
    if (!post.publishedAt) return false;
    const date = new Date(post.publishedAt);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  const allPosts = filtered.map(convertPost);
  const filteredPosts = await filterPostsByExcludedTags(allPosts);
  return await attachTagsToPosts(filteredPosts);
}

/**
 * Get related posts by tags
 */
export async function getRelatedPosts(
  postId: string,
  limit: number = 5
): Promise<PostWithTags[]> {
  const db = getDb();

  // Get tags for the current post
  const currentPostTags = await db
    .select({ tagId: postsTags.tagId })
    .from(postsTags)
    .where(eq(postsTags.postId, postId));

  if (currentPostTags.length === 0) {
    return [];
  }

  const tagIds = currentPostTags.map((pt: any) => pt.tagId);

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
  relatedPostIds.forEach((rp: any) => {
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
  const postsWithTags = await attachTagsToPosts(filteredPosts);

  // Re-sort by tag match count and limit
  const finalPosts = postsWithTags
    .sort((a, b) => {
      const aCount = postTagCounts.get(a.id) || 0;
      const bCount = postTagCounts.get(b.id) || 0;
      return bCount - aCount;
    })
    .slice(0, limit);

  return finalPosts;
}

// ============================================================================
// Settings Functions
// ============================================================================

/**
 * Get a setting value by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  return result[0]?.value || null;
}

/**
 * Get multiple settings
 */
export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const db = await getDb();
  const result = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, keys));

  const settingsMap: Record<string, string | null> = {};
  keys.forEach(key => {
    settingsMap[key] = null;
  });

  result.forEach((row: { key: string; value: any }) => {
    settingsMap[row.key] = row.value;
  });

  return settingsMap;
}

/**
 * Update or insert a setting
 */
export async function upsertSetting(key: string, value: string): Promise<void> {
  const db = await getDb();

  // Check if setting exists
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  if (existing.length > 0) {
    // Update
    await db
      .update(settings)
      .set({
        value,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(settings.key, key));
  } else {
    // Insert
    await db.insert(settings).values({
      id: `setting_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      key,
      value,
    });
  }
}
