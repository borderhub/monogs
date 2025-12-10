/**
 * Drizzle ORM スキーマ定義
 * Cloudflare D1 (SQLite) 用
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// Posts テーブル
// ============================================================================

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),

  // コンテンツ（Markdown変換後）
  content: text('content'),
  html: text('html'),

  // 画像
  featureImage: text('feature_image'),
  galleryImages: text('gallery_images'), // JSON array of image URLs

  // ステータス
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('draft'), // 'draft' | 'published'
  visibility: text('visibility').notNull().default('public'), // 'public' | 'private'

  // SEO メタデータ
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  customExcerpt: text('custom_excerpt'),

  // OGP / SNS
  ogImage: text('og_image'),
  ogTitle: text('og_title'),
  ogDescription: text('og_description'),
  twitterImage: text('twitter_image'),
  twitterTitle: text('twitter_title'),
  twitterDescription: text('twitter_description'),

  // タイムスタンプ（ISO 8601形式）
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at'),
}, (table) => ({
  slugIdx: index('posts_slug_idx').on(table.slug),
  statusIdx: index('posts_status_idx').on(table.status),
  publishedAtIdx: index('posts_published_at_idx').on(table.publishedAt),
}));

// ============================================================================
// Tags テーブル
// ============================================================================

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  featureImage: text('feature_image'),

  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at'),
}, (table) => ({
  slugIdx: index('tags_slug_idx').on(table.slug),
}));

// ============================================================================
// Posts-Tags リレーション
// ============================================================================

export const postsTags = sqliteTable('posts_tags', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  postIdIdx: index('posts_tags_post_id_idx').on(table.postId),
  tagIdIdx: index('posts_tags_tag_id_idx').on(table.tagId),
}));

// ============================================================================
// Users テーブル
// ============================================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // bcrypt ハッシュ
  bio: text('bio'),
  profileImage: text('profile_image'),

  status: text('status').notNull().default('active'), // 'active' | 'inactive'

  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at'),
  lastSeenAt: text('last_seen_at'),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  slugIdx: index('users_slug_idx').on(table.slug),
}));

// ============================================================================
// Settings テーブル
// ============================================================================

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),

  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at'),
}, (table) => ({
  keyIdx: index('settings_key_idx').on(table.key),
}));

// ============================================================================
// Sessions テーブル（NextAuth 用）
// ============================================================================

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: text('expires').notNull(),

  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  sessionTokenIdx: index('sessions_token_idx').on(table.sessionToken),
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

// ============================================================================
// 型エクスポート
// ============================================================================

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type PostTag = typeof postsTags.$inferSelect;
export type NewPostTag = typeof postsTags.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
