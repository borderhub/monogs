import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/db/queries';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  // 公開日をフォーマット
  const dateString = post.publishedAt || post.createdAt;
  const publishedDate = dateString ? new Date(dateString) : new Date();
  const formattedDate = !isNaN(publishedDate.getTime())
    ? publishedDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  // 抜粋テキストを取得（customExcerptまたはhtmlから生成）
  const excerpt = post.customExcerpt || extractExcerpt(post.html);

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      {post.featureImage && (
        <div className="aspect-video relative">
          <Image
            src={post.featureImage}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-6">
        {post.featured && (
          <span className="inline-block px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full mb-3">
            Featured
          </span>
        )}
        <h3 className="text-xl font-semibold mb-2 hover:text-blue-600 transition">
          <Link href={`/${post.slug}`}>{post.title}</Link>
        </h3>
        {excerpt && <p className="text-gray-600 mb-4 line-clamp-3">{excerpt}</p>}
        <div className="flex items-center justify-between">
          <time className="text-sm text-gray-500" dateTime={post.publishedAt || post.createdAt}>
            {formattedDate}
          </time>
          <Link
            href={`/${post.slug}`}
            className="text-blue-600 hover:underline font-medium"
          >
            Read more →
          </Link>
        </div>
      </div>
    </article>
  );
}

// HTMLから抜粋を生成するヘルパー関数
function extractExcerpt(html: string | null, maxLength = 160): string {
  if (!html) return '';

  // HTMLタグを削除
  const text = html.replace(/<[^>]*>/g, '');

  // 改行や余分なスペースを削除
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // 最大長で切り詰め
  if (cleaned.length <= maxLength) return cleaned;

  return cleaned.substring(0, maxLength).trim() + '...';
}
