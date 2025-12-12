import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { getRawDb } from '@/lib/db';

interface Column {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

interface TableData {
  table: string;
  columns: Column[];
  records: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function getTableData(
  tableName: string,
  page: number = 1
): Promise<TableData | null> {
  try {
    const db = getRawDb();
    const limit = 20;
    const offset = (page - 1) * limit;

    // テーブルが存在するか確認
    const tableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      )
      .get(tableName);

    if (!tableExists) {
      return null;
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

    return {
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
    };
  } catch (error) {
    console.error('Error fetching table data:', error);
    return null;
  }
}

export default async function AdminTablePage({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const { table } = await params;
  const data = await getTableData(table);

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">テーブルが見つかりません</h1>
          <Link href="/admin/db" className="text-blue-600 hover:underline">
            ← データベース管理に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">
            {data.table} ({data.pagination.total.toLocaleString()} レコード)
          </h1>
        </div>

        {/* カラム情報 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">テーブル構造</h2>
          <div className="flex flex-wrap gap-2">
            {data.columns.map((col) => (
              <div
                key={col.name}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded border border-gray-300 text-sm"
              >
                <span className="font-medium">{col.name}</span>
                <span className="text-gray-500">({col.type})</span>
                {col.primaryKey && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                    PK
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* データテーブル */}
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {data.columns.map((col) => (
                  <th
                    key={col.name}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.records.map((record, idx) => {
                const primaryKey = data.columns.find((col) => col.primaryKey);
                const recordId = primaryKey
                  ? record[primaryKey.name]
                  : idx;

                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    {data.columns.map((col) => (
                      <td
                        key={col.name}
                        className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate"
                        title={
                          record[col.name]
                            ? String(record[col.name])
                            : ''
                        }
                      >
                        {record[col.name] !== null &&
                        record[col.name] !== undefined
                          ? String(record[col.name]).substring(0, 100)
                          : '(null)'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <Link
                        href={`/admin/db/${data.table}/${recordId}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        編集
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.records.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">レコードがありません</p>
            </div>
          )}
        </div>

        {data.pagination.totalPages > 1 && (
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            maxDisplay={5}
            baseUrl={`/admin/db/${data.table}/page`}
          />
        )}

        <div className="mt-6">
          <Link href="/admin/db" className="text-blue-600 hover:underline">
            ← データベース管理に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
