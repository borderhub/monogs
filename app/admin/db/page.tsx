import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getRawAdapter } from '@/lib/db';

// 型定義は環境に合わせる必要があります
interface Table {
  name: string;
  count: number;
  schema: string;
}

// getRawDb() の返り値の型に合わせて、D1Database または LoaclDB を想定
type DB = any;

async function getTables(): Promise<Table[]> {
  try {
    const db = getRawAdapter();

    /* -----------------------------
     * テーブル一覧取得
     * ----------------------------- */
    const tables = await db.all<{
      name: string;
      sql: string;
    }>(`
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    /* -----------------------------
     * 各テーブルの件数取得
     * ----------------------------- */
    const tablesWithCount = await Promise.all(
      tables.map(async (table) => {
        try {
          const row = await db.get<{ count: number }>(
            `SELECT COUNT(*) AS count FROM ${table.name}`
          );

          return {
            name: table.name,
            count: row?.count ?? 0,
            schema: table.sql,
          };
        } catch (e) {
          console.error(
            `Error counting records for table ${table.name}:`,
            e
          );
          return {
            name: table.name,
            count: 0,
            schema: table.sql,
          };
        }
      })
    );

    return tablesWithCount;
  } catch (error) {
    console.error('Error fetching tables:', error);
    return [];
  }
}

export default async function AdminDbPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const tables = await getTables();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">データベース管理</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  テーブル名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  レコード数
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tables.map((table) => (
                <tr key={table.name}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {table.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table.count.toLocaleString()} レコード
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/db/${table.name}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      表示
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tables.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">テーブルがありません</p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link href="/admin" className="text-blue-600 hover:underline">
            ← 管理画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
