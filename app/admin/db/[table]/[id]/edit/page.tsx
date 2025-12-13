import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DbRecordEditForm from '@/components/admin/DbRecordEditForm';
import { getRawDb } from '@/lib/db';

interface Column {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

interface RecordData {
  table: string;
  columns: Column[];
  record: Record<string, any>;
}

async function getRecord(
  tableName: string,
  recordId: string
): Promise<RecordData | null> {
  try {
    const db = getRawDb();

    // テーブルが存在するか確認
    const tableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      )
      .get(tableName);

    if (!tableExists) {
      return null;
    }

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

    // Primary Keyを取得
    const primaryKey = columns.find((col) => col.pk === 1);
    if (!primaryKey) {
      return null;
    }

    // レコードを取得
    const record = db
      .prepare(`SELECT * FROM ${tableName} WHERE ${primaryKey.name} = ?`)
      .get(recordId);

    if (!record) {
      return null;
    }

    return {
      table: tableName,
      columns: columns.map((col) => ({
        name: col.name,
        type: col.type,
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1,
      })),
      record,
    };
  } catch (error) {
    console.error('Error fetching record:', error);
    return null;
  }
}

export default async function AdminDbRecordEditPage({
  params,
}: {
  params: Promise<{ table: string; id: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const { table, id } = await params;
  const data = await getRecord(table, id);

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">レコードが見つかりません</h1>
          <Link
            href={`/admin/db/${table}`}
            className="text-blue-600 hover:underline"
          >
            ← テーブルに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">レコード編集</h1>
          <p className="text-gray-600">
            テーブル: <span className="font-mono">{data.table}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <DbRecordEditForm
            table={data.table}
            columns={data.columns}
            record={data.record}
            recordId={id}
          />
        </div>

        <div className="mt-6">
          <Link
            href={`/admin/db/${data.table}`}
            className="text-blue-600 hover:underline"
          >
            ← テーブルに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
