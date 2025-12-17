import Image from 'next/image';
import Link from 'next/link';
import { getPostBySlug, getPostTags, getPosts, getSettings } from '@/lib/db/queries';
import ImageGallery from '@/components/ImageGallery';
import { getImageUrl } from '@/lib/utils/image-path';
import type { Metadata } from 'next';

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// 静的パラメータ生成
export async function generateStaticParams() {
  const posts = await getPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// HTMLからテキストを抽出する関数
function extractTextFromHtml(html: string, maxLength: number = 160): string {
  // HTMLタグを削除
  const text = html.replace(/<[^>]*>/g, '');
  // 連続する空白を1つにする
  const cleaned = text.replace(/\s+/g, ' ').trim();
  // 指定された長さに切り詰め
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + '...'
    : cleaned;
}

// HTMLの画像URLを変換する関数
function convertImageUrlsInHtml(html: string): string {
  if (!html) return '';

  // img タグの src 属性を置換
  return html.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, src, after) => {
      const fullUrl = getImageUrl(src);
      return `<img${before}src="${fullUrl}"${after}>`;
    }
  );
}

// メタデータ生成
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  // descriptionを決定：custom_excerptがあればそれを使用、なければhtmlから抽出
  const description = post.customExcerpt ||
    (post.html ? extractTextFromHtml(post.html) : undefined);

  // 画像URLを決定（完全なURLに変換）
  let imageUrl: string | undefined = undefined;

  if (post.featureImage) {
    // 記事のアイキャッチ画像がある場合
    imageUrl = getImageUrl(post.featureImage) || undefined;
  } else {
    // アイキャッチ画像がない場合はデフォルトOG画像を取得
    const settings = await getSettings(['og_image']);
    if (settings.og_image) {
      imageUrl = getImageUrl(settings.og_image) || undefined;
    }
  }

  return {
    title: `${post.title} | monogs`,
    description,
    openGraph: {
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
      type: 'article',
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt || undefined,
      siteName: 'monogs web site',
      url: `https://monogs.net/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
      site: '@monogs',
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const tags = await getPostTags(post.id);
  const dateString = post.publishedAt || post.createdAt;
  const publishedDate = dateString ? new Date(dateString) : new Date();
  const formattedDate = !isNaN(publishedDate.getTime())
    ? publishedDate.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : '';

  // post.html は既に convertPost 関数で生成されている
  // 画像URLを完全なURLに変換
  const contentHtml = convertImageUrlsInHtml(post.html || '');

  // Parse gallery images from JSON and convert to full URLs
  const galleryImages: string[] = post.galleryImages
    ? JSON.parse(post.galleryImages).map((img: string) => getImageUrl(img) || img)
    : [];

  // アイキャッチ画像のURLを変換
  const featureImageUrl = getImageUrl(post.featureImage);

  return (
    <article className="container mx-auto px-4 py-12 overflow-x-hidden">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <header className="mb-8">
          {featureImageUrl && (
            <div className="aspect-video relative mb-8 rounded-lg overflow-hidden w-full">
              <Image
                src={featureImageUrl}
                alt={post.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 768px, 768px"
              />
            </div>
          )}

          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

          <div className="flex items-center gap-4 text-gray-600 mb-6">
            <time dateTime={post.publishedAt || post.createdAt}>{formattedDate}</time>
            {post.featured && (
              <span className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
                Featured
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="px-3 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300 transition"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* Gallery Images */}
        {galleryImages.length > 0 && <ImageGallery images={galleryImages} />}

        {/* Content */}
        <div
          className="posts prose prose-lg max-w-none prose-headings:font-bold prose-a:text-cyan-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto prose-table:block prose-table:overflow-x-auto prose-pre:max-w-full prose-pre:overflow-x-auto w-full"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </footer>
      </div>
    </article>
  );
}
