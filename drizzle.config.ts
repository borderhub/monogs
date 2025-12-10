/**
 * Drizzle Kit Configuration
 * ローカル開発: better-sqlite3、本番: Cloudflare D1
 */

import { defineConfig } from 'drizzle-kit';

const dbType = process.env.DB_TYPE || 'sqlite';

export default defineConfig(
  dbType === 'd1'
    ? {
        // Cloudflare D1 Configuration (本番環境)
        schema: './lib/db/schema.ts',
        out: './drizzle/migrations',
        dialect: 'sqlite',
        driver: 'd1-http',
        dbCredentials: {
          accountId: process.env.R2_ACCOUNT_ID!,
          databaseId: process.env.D1_DATABASE_ID || 'd7781133-52aa-41f4-8a30-af1e6c0934b4',
          token: process.env.CLOUDFLARE_API_TOKEN || '',
        },
        verbose: true,
        strict: true,
      }
    : {
        // Local SQLite Configuration (開発環境)
        schema: './lib/db/schema.ts',
        out: './drizzle/migrations',
        dialect: 'sqlite',
        dbCredentials: {
          url: process.env.DATABASE_URL || './drizzle/local.db',
        },
        verbose: true,
        strict: true,
      }
);
