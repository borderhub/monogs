import { notFound } from 'next/navigation';
import { searchPosts, getTags } from '@/lib/db/queries';
import PostsView from '@/components/PostsView';
import Pagination from '@/components/Pagination';

const POSTS_PER_PAGE = 9;

interface SearchPageProps {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPaginationPage({
  params,
  searchParams,
}: SearchPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const page = parseInt(resolvedParams.page, 10);
  const query = resolvedSearchParams.q || '';

  if (isNaN(page) || page < 1 || !query.trim()) {
    notFound();
  }

  const allPosts = await searchPosts(query);
  const tags = await getTags();
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

  if (page > totalPages) {
    notFound();
  }

  const startIndex = (page - 1) * POSTS_PER_PAGE;
  const posts = allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-12">
        <h1 className="text-3xl font-bold mb-4">
          検索結果: &quot;{query}&quot; (ページ {page})
        </h1>
        <p className="text-gray-600 mb-6">
          {allPosts.length} 件の記事が見つかりました
        </p>

        {posts.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600">
              検索条件に一致する記事が見つかりませんでした。
            </p>
          </div>
        ) : (
          <>
            <PostsView posts={posts} tags={tags} />
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                maxDisplay={5}
                baseUrl={`/search/page?q=${encodeURIComponent(query)}`}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
