/**
 * Initialize local SQLite database with schema
 * ローカルSQLiteデータベースを初期化してスキーマを作成
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../lib/db/schema';

const dbPath = process.env.DATABASE_URL || './drizzle/local.db';

console.log('='.repeat(60));
console.log('Initializing Local SQLite Database');
console.log('='.repeat(60));
console.log(`Database Path: ${dbPath}`);
console.log('');

// Initialize database
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
const db = drizzle(sqlite, { schema });

// Create tables directly using SQL
console.log('Creating tables...');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS posts (
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

  CREATE INDEX IF NOT EXISTS posts_slug_idx ON posts (slug);
  CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status);
  CREATE INDEX IF NOT EXISTS posts_published_at_idx ON posts (published_at);

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    feature_image TEXT,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT
  );

  CREATE INDEX IF NOT EXISTS tags_slug_idx ON tags (slug);

  CREATE TABLE IF NOT EXISTS posts_tags (
    id TEXT PRIMARY KEY NOT NULL,
    post_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS posts_tags_post_id_idx ON posts_tags (post_id);
  CREATE INDEX IF NOT EXISTS posts_tags_tag_id_idx ON posts_tags (tag_id);

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    bio TEXT,
    profile_image TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT,
    last_seen_at TEXT
  );

  CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
  CREATE INDEX IF NOT EXISTS users_slug_idx ON users (slug);

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT
  );

  CREATE INDEX IF NOT EXISTS settings_key_idx ON settings (key);

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    expires TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions (session_token);
  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
`);

console.log('✓ Tables created successfully');

// Close database
sqlite.close();

console.log('');
console.log('='.repeat(60));
console.log('Database Initialization Complete');
console.log('='.repeat(60));
