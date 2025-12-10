import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PostForm from '@/components/admin/PostForm';
import { getTags } from '@/lib/db/queries';

export default async function NewPostPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const allTags = await getTags();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/posts" className="text-blue-600 hover:underline">
            ← 投稿一覧に戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">新規投稿</h1>

        <div className="bg-white rounded-lg shadow-md p-8">
          <PostForm allTags={allTags} />
        </div>
      </div>
    </div>
  );
}
