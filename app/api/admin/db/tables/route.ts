import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRawAdapter } from '@/lib/db';

interface TableRow {
  name: string;
  sql: string;
}

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const db = getRawAdapter();

    // テーブル一覧取得（SQLite / D1 共通）
    const tables = await db.all<TableRow>(
      `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
      `
    );

    // 各テーブルの件数を取得
    const tablesWithCount = await Promise.all(
      tables.map(async (table) => {
        const row = await db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${table.name}`
        );

        return {
          name: table.name,
          count: row?.count ?? 0,
          schema: table.sql,
        };
      })
    );

    return NextResponse.json({ tables: tablesWithCount });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
