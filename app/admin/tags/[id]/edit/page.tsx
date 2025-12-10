import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import TagForm from '@/components/admin/TagForm';
import { getTags } from '@/lib/db/queries';

interface EditTagPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTagPage({ params }: EditTagPageProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const { id } = await params;
  const tags = await getTags();
  const tag = tags.find((t) => t.id === id);

  if (!tag) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/tags" className="text-blue-600 hover:underline">
            ← タグ一覧に戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">タグ編集</h1>

        <div className="bg-white rounded-lg shadow-md p-8">
          <TagForm tag={tag} isEdit={true} />
        </div>
      </div>
    </div>
  );
}
