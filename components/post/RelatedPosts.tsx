import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/db/queries';

interface RelatedPostsProps {
  posts: Post[];
}

export default function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t border-gray-300">
      <h2 className="text-2xl font-bold mb-6">関連記事</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => {
          const dateString = post.publishedAt || post.createdAt;
          const publishedDate = dateString ? new Date(dateString) : new Date();
          const formattedDate = !isNaN(publishedDate.getTime())
            ? publishedDate.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : '';

          return (
            <Link
              key={post.id}
              href={`/post/${post.slug}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
            >
              {post.featureImage && (
                <div className="aspect-video relative">
                  <Image
                    src={post.featureImage}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <time className="text-sm text-gray-500">{formattedDate}</time>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
