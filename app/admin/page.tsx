import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">管理画面</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Welcome, {session.user?.name || session.user?.email}</h2>
          <p className="text-gray-600 mb-4">
            monogs管理画面へようこそ。ここから投稿の管理やサイトの設定を行えます。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin/posts" className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">投稿管理</h3>
            <p className="text-gray-600">記事の作成、編集、削除を行います</p>
          </Link>

          <Link href="/admin/tags" className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">タグ管理</h3>
            <p className="text-gray-600">タグの追加、編集、削除を行います</p>
          </Link>

          <Link href="/admin/media" className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">メディア管理</h3>
            <p className="text-gray-600">画像やファイルのアップロードと管理を行います</p>
          </Link>

          <Link href="/admin/settings" className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">設定</h3>
            <p className="text-gray-600">サイトの基本設定を変更します</p>
          </Link>

          <Link href="/admin/db" className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">データベース</h3>
            <p className="text-gray-600">データベースの内容を確認・編集します</p>
          </Link>
        </div>

        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
