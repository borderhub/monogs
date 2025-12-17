import { Suspense } from 'react';
import { searchPosts, getTags } from '@/lib/db/queries';
import PostsView from '@/components/PostsView';
import Pagination from '@/components/Pagination';

const POSTS_PER_PAGE = 9;

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';

  if (!query.trim()) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">検索</h1>
        <p className="text-gray-600">検索キーワードを入力してください。</p>
      </div>
    );
  }

  const allPosts = await searchPosts(query);
  const tags = await getTags();
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const posts = allPosts.slice(0, POSTS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-12">
        <h1 className="text-3xl font-bold mb-4">
          検索結果: &quot;{query}&quot;
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
                currentPage={1}
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
