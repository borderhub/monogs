import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTags } from '@/lib/db/queries';
import { getImageUrl } from '@/lib/utils/image-path';

interface PostListProps {
  post: PostWithTags;
}

export default function PostList({ post }: PostListProps) {
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
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition mb-6">
      <div className="flex flex-col md:flex-row">
        {/* 画像 */}
        {imageUrl && (
          <div className="md:w-1/3 aspect-video md:aspect-square relative flex-shrink-0">
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        )}

        {/* コンテンツ */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex-1">
            {post.featured && (
              <span className="inline-block px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full mb-3">
                Featured
              </span>
            )}
            <h3 className="text-2xl font-semibold mb-3 hover:text-blue-600 transition">
              <Link href={`/${post.slug}`}>{post.title}</Link>
            </h3>
            {excerpt && <p className="text-gray-600 mb-4 line-clamp-3">{excerpt}</p>}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
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
      </div>
    </article>
  );
}

// HTMLから抜粋を生成するヘルパー関数
function extractExcerpt(html: string | null, maxLength = 200): string {
  if (!html) return '';

  // HTMLタグを削除
  const text = html.replace(/<[^>]*>/g, '');

  // 改行や余分なスペースを削除
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // 最大長で切り詰め
  if (cleaned.length <= maxLength) return cleaned;

  return cleaned.substring(0, maxLength).trim() + '...';
}
