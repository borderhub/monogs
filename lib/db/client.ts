/**
 * Database Client
 * ローカル: SQLite、本番: Cloudflare D1
 */

import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

let db: ReturnType<typeof drizzleSQLite> | null = null;

/**
 * Get database client
 * ローカル開発環境ではSQLite、本番環境ではD1を使用
 */
export function getDb() {
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (dbType === 'd1') {
    // Cloudflare D1 (本番環境)
    // D1はCloudflare Workers/Pages Functions環境でのみ使用可能
    // Next.jsビルド時はこのパスは通らない想定
    throw new Error('D1 is only available in Cloudflare Workers environment. Use getD1Db() instead.');
  }

  // ローカル SQLite
  if (db) {
    return db;
  }

  const dbPath = process.env.DATABASE_URL || './drizzle/local.db';
  const sqlite = new Database(dbPath);

  // WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');

  db = drizzleSQLite(sqlite, { schema });
  return db;
}

/**
 * Get D1 database client (Cloudflare Workers/Pages Functions)
 * @param d1Database - D1Database instance from Cloudflare environment
 */
export function getD1Db(d1Database: IDBDatabase) {
  return drizzleD1(d1Database, { schema });
}

export type DbClient = ReturnType<typeof getDb>;
