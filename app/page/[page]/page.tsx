import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPosts, getTags } from '@/lib/db/queries';
import PostsView from '@/components/PostsView';
import Pagination from '@/components/Pagination';

const POSTS_PER_PAGE = 10;

interface PageProps {
  params: Promise<{
    page: string;
  }>;
}

export default async function PaginatedHome({ params }: PageProps) {
  const { page } = await params;
  const currentPage = parseInt(page, 10);

  if (isNaN(currentPage) || currentPage < 1) {
    redirect('/');
  }

  const allPosts = await getPosts();
  const tags = await getTags();
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

  if (currentPage > totalPages && totalPages > 0) {
    redirect(`/page/${totalPages}`);
  }

  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const posts = allPosts.slice(startIndex, endIndex);

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to monogs</h1>
        <p className="text-lg text-gray-600">
          monogs works and art project
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Recent Posts</h2>
        {posts.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">記事準備中</h3>
            <p className="text-gray-600">
              記事データをロード中です
            </p>
          </div>
        ) : (
          <>
            <PostsView posts={posts} />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              maxDisplay={5}
              baseUrl="/page"
            />
          </>
        )}
      </section>

      {tags.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Categories</h2>
          <div className="flex flex-wrap gap-3">
            {tags.map(tag => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
