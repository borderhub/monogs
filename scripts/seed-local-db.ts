/**
 * Seed local SQLite database with migration data
 * JSONファイルからローカルSQLiteデータベースにデータをインポート
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../lib/db/schema';
import postsData from '../migration-data/posts-final.json';
import tagsData from '../migration-data/tags.json';
import postsTagsData from '../migration-data/posts_tags.json';

async function main() {
  const dbPath = process.env.DATABASE_URL || './drizzle/local.db';

  console.log('='.repeat(60));
  console.log('Seeding Local SQLite Database');
  console.log('='.repeat(60));
  console.log(`Database Path: ${dbPath}`);
  console.log('');

  // Initialize database
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });

  // Seed posts
  console.log('Importing posts...');
  let postsCount = 0;
  for (const post of postsData) {
    try {
      await db.insert(schema.posts).values({
        id: post.id,
        uuid: post.uuid,
        title: post.title,
        slug: post.slug,
        content: post.content || null,
        html: post.html || null,
        featureImage: post.feature_image || null,
        featured: post.featured === 1,
        status: post.status,
        visibility: post.visibility,
        metaTitle: post.meta_title || null,
        metaDescription: post.meta_description || null,
        customExcerpt: post.custom_excerpt || null,
        ogImage: post.og_image || null,
        ogTitle: post.og_title || null,
        ogDescription: post.og_description || null,
        twitterImage: post.twitter_image || null,
        twitterTitle: post.twitter_title || null,
        twitterDescription: post.twitter_description || null,
        publishedAt: post.published_at || null,
        createdAt: post.created_at,
        updatedAt: post.updated_at || null,
      }).onConflictDoNothing();
      postsCount++;
    } catch (error) {
      console.error(`Error importing post ${post.id}:`, error);
    }
  }
  console.log(`✓ Imported ${postsCount} posts`);

  // Seed tags
  console.log('Importing tags...');
  let tagsCount = 0;
  for (const tag of tagsData) {
    try {
      await db.insert(schema.tags).values({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description || null,
        featureImage: tag.feature_image || null,
        createdAt: tag.created_at || new Date().toISOString(),
        updatedAt: tag.updated_at || null,
      }).onConflictDoNothing();
      tagsCount++;
    } catch (error) {
      console.error(`Error importing tag ${tag.id}:`, error);
    }
  }
  console.log(`✓ Imported ${tagsCount} tags`);

  // Seed posts_tags relations
  console.log('Importing posts-tags relations...');
  let relationsCount = 0;
  for (const relation of postsTagsData) {
    try {
      await db.insert(schema.postsTags).values({
        id: relation.id,
        postId: relation.post_id,
        tagId: relation.tag_id,
        sortOrder: relation.sort_order,
      }).onConflictDoNothing();
      relationsCount++;
    } catch (error) {
      console.error(`Error importing relation ${relation.id}:`, error);
    }
  }
  console.log(`✓ Imported ${relationsCount} posts-tags relations`);

  // Close database
  sqlite.close();

  console.log('');
  console.log('='.repeat(60));
  console.log('Database Seeding Complete');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
