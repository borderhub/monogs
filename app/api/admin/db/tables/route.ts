import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRawDb } from '@/lib/db';

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getRawDb();

    // SQLiteのテーブル一覧を取得
    const tables = db
      .prepare(
        `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      )
      .all() as { name: string; sql: string }[];

    // 各テーブルのレコード数を取得
    const tablesWithCount = tables.map((table) => {
      const countResult = db
        .prepare(`SELECT COUNT(*) as count FROM ${table.name}`)
        .get() as { count: number };

      return {
        name: table.name,
        count: countResult.count,
        schema: table.sql,
      };
    });

    return NextResponse.json({ tables: tablesWithCount });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
