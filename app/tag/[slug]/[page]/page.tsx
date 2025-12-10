import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTagBySlug, getPostsByTag } from '@/lib/db/queries';
import PostsView from '@/components/PostsView';
import Pagination from '@/components/Pagination';
import type { Metadata } from 'next';

const POSTS_PER_PAGE = 10;

interface TagPageProps {
  params: Promise<{
    slug: string;
    page: string;
  }>;
}

// メタデータ生成
export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);

  if (!tag) {
    return {
      title: 'Tag Not Found',
    };
  }

  return {
    title: `${tag.name} | monogs`,
    description: tag.description || `Posts tagged with ${tag.name}`,
  };
}

export default async function PaginatedTagPage({ params }: TagPageProps) {
  const { slug, page } = await params;
  const currentPage = parseInt(page, 10);

  if (isNaN(currentPage) || currentPage < 1) {
    redirect(`/tag/${slug}`);
  }

  const tag = await getTagBySlug(slug);

  if (!tag) {
    notFound();
  }

  const allPosts = await getPostsByTag(slug);
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

  if (currentPage > totalPages && totalPages > 0) {
    redirect(`/tag/${slug}/${totalPages}`);
  }

  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const posts = allPosts.slice(startIndex, endIndex);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4">{tag.name}</h1>
        {tag.description && <p className="text-lg text-gray-600 mb-4">{tag.description}</p>}
        <p className="text-gray-500">
          {allPosts.length} {allPosts.length === 1 ? 'post' : 'posts'}
        </p>
      </header>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No posts found with this tag yet.</p>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      ) : (
        <>
          <PostsView posts={posts} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            maxDisplay={5}
            baseUrl={`/tag/${slug}`}
          />
        </>
      )}
    </div>
  );
}
