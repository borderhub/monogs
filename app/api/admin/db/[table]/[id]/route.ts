import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRawAdapter } from '@/lib/db';

/* =================================================
 * GET: 単一レコード取得
 * ================================================= */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { table, id } = await params;

  try {
    const db = getRawAdapter();
    const tableName = table;
    const recordId = id;

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
     * カラム情報取得
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
     * Primary Key 判定
     * ----------------------------- */
    const primaryKey = columns.find((col) => col.pk === 1);

    if (!primaryKey) {
      return NextResponse.json(
        { error: 'Table has no primary key' },
        { status: 400 }
      );
    }

    /* -----------------------------
     * レコード取得
     * ----------------------------- */
    const record = await db.get<any>(
      `SELECT * FROM ${tableName} WHERE ${primaryKey.name} = ?`,
      [recordId]
    );

    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      table: tableName,
      columns: columns.map((col) => ({
        name: col.name,
        type: col.type,
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1,
      })),
      record,
    });
  } catch (error) {
    console.error('Error fetching record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch record' },
      { status: 500 }
    );
  }
}

/* =================================================
 * PUT: 単一レコード更新
 * ================================================= */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { table, id } = await params;

  try {
    const db = getRawAdapter();
    const tableName = table;
    const recordId = id;
    const body = await request.json();

    /* -----------------------------
     * カラム情報取得
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
     * Primary Key 判定
     * ----------------------------- */
    const primaryKey = columns.find((col) => col.pk === 1);

    if (!primaryKey) {
      return NextResponse.json(
        { error: 'Table has no primary key' },
        { status: 400 }
      );
    }

    /* -----------------------------
     * UPDATE対象カラム作成
     * ----------------------------- */
    const updateColumns = columns
      .filter((col) => col.pk !== 1)
      .map((col) => col.name);

    const setClause = updateColumns
      .map((col) => `${col} = ?`)
      .join(', ');

    const values = updateColumns.map((col) => body[col]);

    const sql = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE ${primaryKey.name} = ?
    `;

    await db.run(sql, [...values, recordId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { error: 'Failed to update record' },
      { status: 500 }
    );
  }
}
