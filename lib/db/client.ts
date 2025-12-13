/**
 * Database Client
 * ローカル: SQLite、本番: Cloudflare D1
 */

import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import * as schema from './schema';
import { cache } from 'react';

// Cloudflare D1Database型定義
type D1Database = any;

let localDb: any = null;
let rawSqlite: any = null;

/**
 * Get database client
 * Workers環境ではD1、ローカル開発環境ではSQLiteを使用
 */
export const getDb = cache((): any => {
  // Cloudflare Workers環境の検出とD1使用
  try {
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const { env } = getCloudflareContext();
    if (env && env.DB) {
      // Cloudflare D1を使用
      return drizzleD1(env.DB, { schema });
    }
  } catch (e) {
    // OpenNext Cloudflare環境でない場合はローカルSQLiteにフォールバック
  }

  // ローカル SQLite (動的インポート)
  if (localDb) {
    return localDb;
  }

  // 動的にインポート (Workers環境では実行されない)
  const { drizzle: drizzleSQLite } = require('drizzle-orm/better-sqlite3');
  const Database = require('better-sqlite3');

  const dbPath = process.env.DATABASE_URL || './drizzle/local.db';
  const sqlite = new Database(dbPath);

  // WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');

  localDb = drizzleSQLite(sqlite, { schema });
  return localDb;
});

/**
 * Get raw SQLite database instance
 * API routes用に生のSQLiteインスタンスを取得
 */
export const getRawDb = cache((): any => {
  // Cloudflare Workers環境の検出
  try {
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const { env } = getCloudflareContext();
    if (env && env.DB) {
      // D1の場合はD1インスタンスを返す
      return env.DB;
    }
  } catch (e) {
    // OpenNext Cloudflare環境でない場合はローカルSQLiteにフォールバック
  }

  // ローカル SQLite (動的インポート)
  if (rawSqlite) {
    return rawSqlite;
  }

  const Database = require('better-sqlite3');
  const dbPath = process.env.DATABASE_URL || './drizzle/local.db';
  rawSqlite = new Database(dbPath);

  // WAL mode for better concurrency
  rawSqlite.pragma('journal_mode = WAL');

  return rawSqlite;
});

/**
 * Get D1 database client (Cloudflare Workers/Pages Functions)
 * @param d1Database - D1Database instance from Cloudflare environment
 */
export function getD1Db(d1Database: D1Database) {
  return drizzleD1(d1Database, { schema });
}

// 型定義を緩和して互換性を確保
export type DbClient = any;
