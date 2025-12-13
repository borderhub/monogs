import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SettingsForm from '@/components/admin/SettingsForm';
import { getSettings } from '@/lib/db/queries';

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // データベースから設定を取得
  const settingsData = await getSettings([
    'site_title',
    'site_description',
    'site_url',
    'og_image',
    'x_handle',
    'instagram',
    'facebook',
    'bandcamp',
    'github',
  ]);

  const settings = {
    siteTitle: settingsData.site_title || 'monogs web site',
    siteDescription: settingsData.site_description || 'monogs works and art project',
    siteUrl: settingsData.site_url || 'https://monogs.net',
    ogImage: settingsData.og_image || '',
    xHandle: settingsData.x_handle || '',
    instagram: settingsData.instagram || '',
    facebook: settingsData.facebook || '',
    bandcamp: settingsData.bandcamp || '',
    github: settingsData.github || '',
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
