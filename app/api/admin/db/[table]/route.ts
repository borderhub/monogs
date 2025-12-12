import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRawDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { table } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  try {
    const db = getRawDb();
    const tableName = table;

    // テーブルが存在するか確認
    const tableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      )
      .get(tableName);

    if (!tableExists) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // 総レコード数を取得
    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
      .get() as { count: number };

    // テーブルのカラム情報を取得
    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
        pk: number;
      }>;

    // レコードを取得
    const records = db
      .prepare(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`)
      .all(limit, offset);

    return NextResponse.json({
      table: tableName,
      columns: columns.map((col) => ({
        name: col.name,
        type: col.type,
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1,
      })),
      records,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table data' },
      { status: 500 }
    );
  }
}
