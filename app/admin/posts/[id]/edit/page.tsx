import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import PostForm from '@/components/admin/PostForm';
import { getAllPosts, getTags, getPostTags } from '@/lib/db/queries';

interface EditPostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const { id } = await params;
  const posts = await getAllPosts();
  const post = posts.find((p) => p.id === id);

  if (!post) {
    notFound();
  }

  const allTags = await getTags();
  const postTags = await getPostTags(post.id);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/posts" className="text-blue-600 hover:underline">
            ← 投稿一覧に戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">投稿編集</h1>

        <div className="bg-white rounded-lg shadow-md p-8">
          <PostForm post={post} isEdit={true} allTags={allTags} postTags={postTags} />
        </div>
      </div>
    </div>
  );
}
