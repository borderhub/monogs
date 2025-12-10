/**
 * Next.js Image Loader
 *
 * 開発環境: MinIO から画像を配信
 * 本番環境: Cloudflare R2 から画像を配信
 *
 * NEXT_PUBLIC_IMAGES_URL 環境変数で切り替え
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

  // 相対パスの場合は先頭の/を削除（ストレージのキーとして使用）
  const imagePath = src.startsWith('/') ? src.substring(1) : src;

  // ストレージのベースURLが設定されている場合
  if (imagesUrl) {
    // Cloudflare Image Resizingを使用する場合（R2のみ）
    // 注: 無料プランでは利用不可、必要に応じてコメント解除
    // if (imagesUrl.includes('r2.cloudflarestorage.com') || imagesUrl.includes('images.monogs.net')) {
    //   return `${imagesUrl}/cdn-cgi/image/width=${width},quality=${quality || 75}/${imagePath}`;
    // }

    return `${imagesUrl}/${imagePath}`;
  }

  // フォールバック: publicディレクトリから直接読み込み
  return src.startsWith('/') ? src : `/${src}`;
}
