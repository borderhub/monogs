/**
 * Database Mutations Test
 * 投稿・タグの作成・更新・削除のテスト
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { updatePost, createPost, deletePost } from '@/lib/db/mutations';

describe('Database Mutations', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeAll(() => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Create tables
    sqlite.exec(`
      CREATE TABLE posts (
        id TEXT PRIMARY KEY NOT NULL,
        uuid TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        content TEXT,
        html TEXT,
        feature_image TEXT,
        featured INTEGER DEFAULT 0 NOT NULL,
        status TEXT DEFAULT 'draft' NOT NULL,
        visibility TEXT DEFAULT 'public' NOT NULL,
        meta_title TEXT,
        meta_description TEXT,
        custom_excerpt TEXT,
        og_image TEXT,
        og_title TEXT,
        og_description TEXT,
        twitter_image TEXT,
        twitter_title TEXT,
        twitter_description TEXT,
        published_at TEXT,
        created_at TEXT DEFAULT (datetime('now')) NOT NULL,
        updated_at TEXT
      );

      CREATE TABLE tags (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        feature_image TEXT,
        created_at TEXT DEFAULT (datetime('now')) NOT NULL,
        updated_at TEXT
      );

      CREATE TABLE posts_tags (
        id TEXT PRIMARY KEY NOT NULL,
        post_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    // Insert test data
    sqlite.exec(`
      INSERT INTO posts (id, uuid, title, slug, content, html, status, visibility, created_at)
      VALUES ('test-post-1', 'uuid-1', 'Test Post', 'test-post', '# Test Content', '<h1>Test Content</h1>', 'published', 'public', datetime('now'));
    `);
  });

  afterAll(() => {
    sqlite.close();
  });

  describe('updatePost', () => {
    it('should update post title', async () => {
      await updatePost(db, 'test-post-1', {
        title: 'Updated Title',
      });

      const result = await db.select().from(schema.posts).where(eq(schema.posts.id, 'test-post-1'));
      expect(result[0].title).toBe('Updated Title');
    });

    it('should update post content and html', async () => {
      await updatePost(db, 'test-post-1', {
        content: '## New Content',
        html: '<h2>New Content</h2>',
      });

      const result = await db.select().from(schema.posts).where(eq(schema.posts.id, 'test-post-1'));
      expect(result[0].content).toBe('## New Content');
      expect(result[0].html).toBe('<h2>New Content</h2>');
    });

    it('should update post status', async () => {
      await updatePost(db, 'test-post-1', {
        status: 'draft',
      });

      const result = await db.select().from(schema.posts).where(eq(schema.posts.id, 'test-post-1'));
      expect(result[0].status).toBe('draft');
    });

    it('should update multiple fields at once', async () => {
      await updatePost(db, 'test-post-1', {
        title: 'Multi Update',
        content: 'New content',
        status: 'published',
        customExcerpt: 'Test excerpt',
      });

      const result = await db.select().from(schema.posts).where(eq(schema.posts.id, 'test-post-1'));
      expect(result[0].title).toBe('Multi Update');
      expect(result[0].content).toBe('New content');
      expect(result[0].status).toBe('published');
      expect(result[0].customExcerpt).toBe('Test excerpt');
    });

    it('should set updatedAt timestamp', async () => {
      const beforeUpdate = new Date().toISOString();

      await updatePost(db, 'test-post-1', {
        title: 'Timestamp Test',
      });

      const result = await db.select().from(schema.posts).where(eq(schema.posts.id, 'test-post-1'));
      expect(result[0].updatedAt).toBeTruthy();
      expect(new Date(result[0].updatedAt!).getTime()).toBeGreaterThanOrEqual(new Date(beforeUpdate).getTime());
    });
  });

  describe('createPost', () => {
    it('should create a new post', async () => {
      const newPost = await createPost(db, {
        id: 'test-post-2',
        uuid: 'uuid-2',
        title: 'New Post',
        slug: 'new-post',
        content: 'Content',
        html: '<p>Content</p>',
        status: 'draft',
      });

      expect(newPost.id).toBe('test-post-2');
      expect(newPost.title).toBe('New Post');

      const result = await db.select().from(schema.posts).where(eq(schema.posts.id, 'test-post-2'));
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('New Post');
    });
  });

  describe('deletePost', () => {
    it('should delete a post', async () => {
      // Create a post to delete
      await db.insert(schema.posts).values({
        id: 'test-post-delete',
        uuid: 'uuid-delete',
        title: 'To Delete',
        slug: 'to-delete',
        status: 'draft',
        visibility: 'public',
        featured: false,
        createdAt: new Date().toISOString(),
      });

      await deletePost(db, 'test-post-delete');

      const result = await db.select().from(schema.posts).where(eq(schema.posts.id, 'test-post-delete'));
      expect(result.length).toBe(0);
    });
  });
});
