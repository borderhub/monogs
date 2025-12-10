import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SettingsForm from '@/components/admin/SettingsForm';

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // TODO: D1データベースから設定を取得する
  // 現在はモック実装
  const settings = {
    siteTitle: 'monogs web site',
    siteDescription: 'monogs works and art project',
    siteUrl: 'https://monogs.net',
    ogImage: '',
    twitterHandle: '@monogs',
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:underline">
            ← ダッシュボードに戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">サイト設定</h1>

        <div className="bg-white rounded-lg shadow-md p-8">
          <SettingsForm settings={settings} />
        </div>
      </div>
    </div>
  );
}
