import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTagBySlug, getPostsByTag, getTags } from '@/lib/db/queries';
import PostsView from '@/components/PostsView';
import Pagination from '@/components/Pagination';
import type { Metadata } from 'next';

const POSTS_PER_PAGE = 10;

interface TagPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// 静的パラメータ生成
export async function generateStaticParams() {
  const tags = await getTags();

  return tags.map((tag) => ({
    slug: tag.slug,
  }));
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

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);

  if (!tag) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Tag Not Found</h1>
          <p className="text-gray-600 mb-8">
            The tag you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const allPosts = await getPostsByTag(slug);
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const posts = allPosts.slice(0, POSTS_PER_PAGE);

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
            currentPage={1}
            totalPages={totalPages}
            maxDisplay={5}
            baseUrl={`/tag/${slug}`}
          />
        </>
      )}
    </div>
  );
}
