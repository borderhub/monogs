/**
 * Fix posts with missing kg-gallery elements
 * Restore original HTML from posts.json to database
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../lib/db/schema';
import originalPosts from '../migration-data/posts.json';

async function main() {
  const dbPath = process.env.DATABASE_URL || './drizzle/local.db';

  console.log('='.repeat(60));
  console.log('Fixing posts with kg-gallery elements');
  console.log('='.repeat(60));
  console.log(`Database Path: ${dbPath}`);
  console.log('');

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });

  // Find posts with kg-gallery in original data
  const postsWithGallery = originalPosts.filter(post =>
    post.html && post.html.includes('kg-gallery')
  );

  console.log(`Found ${postsWithGallery.length} posts with kg-gallery elements`);
  console.log('');

  for (const post of postsWithGallery) {
    console.log(`Updating post: ${post.title}`);
    console.log(`  ID: ${post.id}`);

    try {
      // Update both content and html with original HTML
      await db.update(schema.posts)
        .set({
          content: post.html,
          html: post.html,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.posts.id, post.id));

      console.log(`  ✓ Updated successfully`);
    } catch (error) {
      console.error(`  ❌ Error updating post:`, error);
    }
    console.log('');
  }

  sqlite.close();

  console.log('='.repeat(60));
  console.log('Fix Complete');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
