import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRawAdapter } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { table } = await params;
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  try {
    const db = getRawAdapter();
    const tableName = table;

    /* -----------------------------
     * テーブル存在確認
     * ----------------------------- */
    const tableExists = await db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
      [tableName]
    );

    if (!tableExists) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    /* -----------------------------
     * 総レコード数
     * ----------------------------- */
    const countRow = await db.get<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${tableName}`
    );
    const total = countRow?.count ?? 0;

    /* -----------------------------
     * カラム情報
     * ----------------------------- */
    const columns = await db.all<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>(`PRAGMA table_info(${tableName})`);

    /* -----------------------------
     * レコード取得
     * ----------------------------- */
    const records = await db.all<any>(
      `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`,
      [limit, offset]
    );

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
        total,
        totalPages: Math.ceil(total / limit),
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
