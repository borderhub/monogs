import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TagForm from '@/components/admin/TagForm';

export default async function NewTagPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/tags" className="text-blue-600 hover:underline">
            ← タグ一覧に戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">新規タグ</h1>

        <div className="bg-white rounded-lg shadow-md p-8">
          <TagForm />
        </div>
      </div>
    </div>
  );
}
