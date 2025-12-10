import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
// ★ ステップ1で作成したClient Componentをインポート
import MediaFileCard from './MediaFileCard';

export default async function AdminMediaPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // TODO: D1またはR2から実際のメディアリストを取得する
  const mediaFiles = [
    {
      id: '1',
      url: '/content/images/sample1.jpg',
      filename: 'sample1.jpg',
      size: 1024000,
      type: 'image/jpeg',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      url: '/content/images/sample2.png',
      filename: 'sample2.png',
      size: 2048000,
      type: 'image/png',
      createdAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* ... (ヘッダー部分省略) ... */}
        {/* ファイル一覧部分 */}
        {mediaFiles.length === 0 ? (
          <p className="text-center text-gray-500">メディアファイルが見つかりません。</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaFiles.map((file) => (
              // ★ Client Componentにデータを渡す
              <MediaFileCard key={file.id} file={file} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
