import { notFound } from 'next/navigation';
import { getPostsByYearMonth, getTags } from '@/lib/db/queries';
import PostsView from '@/components/PostsView';
import Pagination from '@/components/Pagination';

const POSTS_PER_PAGE = 10;

interface ArchiveYearMonthPageProps {
  params: Promise<{ year: string; month: string }>;
}

export default async function ArchiveYearMonthPage({
  params,
}: ArchiveYearMonthPageProps) {
  const { year, month } = await params;
  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);

  if (
    isNaN(yearNum) ||
    isNaN(monthNum) ||
    monthNum < 1 ||
    monthNum > 12 ||
    yearNum < 2000 ||
    yearNum > 2100
  ) {
    notFound();
  }

  const allPosts = await getPostsByYearMonth(yearNum, monthNum);
  const tags = await getTags();
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const posts = allPosts.slice(0, POSTS_PER_PAGE);

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-12">
        <h1 className="text-3xl font-bold mb-4">
          {yearNum}年{monthNames[monthNum - 1]}の記事
        </h1>
        <p className="text-gray-600 mb-6">
          {allPosts.length} 件の記事
        </p>

        {posts.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600">この期間の記事はありません。</p>
          </div>
        ) : (
          <>
            <PostsView posts={posts} tags={tags} />
            {totalPages > 1 && (
              <Pagination
                currentPage={1}
                totalPages={totalPages}
                maxDisplay={5}
                baseUrl={`/archive/${year}/${month}/page`}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
