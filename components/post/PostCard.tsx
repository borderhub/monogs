import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTags } from '@/lib/db/queries';
import { getImageUrl } from '@/lib/utils/image-path';

interface PostCardProps {
  post: PostWithTags;
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

  // 画像URLを完全なURLに変換
  const imageUrl = getImageUrl(post.featureImage);

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <Link href={`/${post.slug}`}>
        {imageUrl && (
          <div className="aspect-video relative">
            <Image
              src={imageUrl}
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
            {post.title}
          </h3>
          {excerpt && <p className="text-gray-600 mb-4 line-clamp-3">{excerpt}</p>}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <time className="text-sm text-gray-500" dateTime={post.publishedAt || post.createdAt}>
              {formattedDate}
            </time>
          </div>
        </div>
      </Link>
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
