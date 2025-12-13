/**
 * Next.js Image Loader
 *
 * 開発環境: MinIO から画像を配信
 * 本番環境: Cloudflare R2 から画像を配信
 *
 * NEXT_PUBLIC_IMAGES_URL 環境変数で切り替え
 *
 * 対応パス形式:
 * - 旧形式: /content/images/YYYY/MM/filename.ext
 * - 新形式: /content/images/YYYY/MM/[slug]/filename.ext
 * - 新形式（ギャラリー）: /content/images/YYYY/MM/[slug]/gallery/filename.ext
 */

export default function cloudflareImageLoader({ src, width, quality }: {
  src: string;
  width: number;
  quality?: number;
}) {
  // すでに完全なURLの場合はそのまま返す
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // 画像ベースURL（MinIO または R2）
  const imagesUrl = process.env.NEXT_PUBLIC_IMAGES_URL;

  // パスの正規化: 先頭の/を削除（ストレージのキーとして使用）
  let imagePath = src.startsWith('/') ? src.substring(1) : src;

  // /content/images/ パスの場合、そのまま使用（新旧両方の形式に対応）
  // MinIO/R2 のストレージキーとして直接使用される
  if (imagePath.startsWith('content/images/')) {
    if (imagesUrl) {
      return `${imagesUrl}/${imagePath}`;
    }
    // 環境変数が未設定の場合は Next.js のリダイレクトルールを使用
    return `/${imagePath}`;
  }

  // その他のパスの場合はそのまま返す
  if (imagesUrl) {
    return `${imagesUrl}/${imagePath}`;
  }

  // フォールバック: publicディレクトリから直接読み込み
  return src.startsWith('/') ? src : `/${src}`;
}
