/**
 * 画像パス生成ユーティリティ
 *
 * 新旧両方のパス形式に対応:
 * - 旧形式: /content/images/YYYY/MM/filename.ext
 * - 新形式: /content/images/YYYY/MM/[slug]/filename.ext
 */

/**
 * 画像パスを生成する
 * @param options - パス生成オプション
 * @returns 画像パス
 */
export function generateImagePath(options: {
  filename: string;
  slug?: string;
  isGallery?: boolean;
  year?: number;
  month?: number;
}): string {
  const { filename, slug, isGallery = false, year, month } = options;

  const now = new Date();
  const imageYear = year || now.getFullYear();
  const imageMonth = month || String(now.getMonth() + 1).padStart(2, '0');

  const galleryPath = isGallery ? 'gallery/' : '';

  if (slug) {
    // 新形式: /content/images/YYYY/MM/[slug]/[gallery/]filename.ext
    return `/content/images/${imageYear}/${imageMonth}/${slug}/${galleryPath}${filename}`;
  } else {
    // 旧形式（後方互換性のため）: /content/images/YYYY/MM/filename.ext
    return `/content/images/${imageYear}/${imageMonth}/${filename}`;
  }
}

/**
 * 画像パスから情報を抽出する
 * @param path - 画像パス
 * @returns パス情報
 */
export function parseImagePath(path: string): {
  year?: string;
  month?: string;
  slug?: string;
  isGallery: boolean;
  filename: string;
  isNewFormat: boolean;
} | null {
  // /content/images/ で始まるパスのみ処理
  if (!path.startsWith('/content/images/')) {
    return null;
  }

  // /content/images/YYYY/MM/... の形式を想定
  const match = path.match(/^\/content\/images\/(\d{4})\/(\d{2})\/(.+)$/);

  if (!match) {
    return null;
  }

  const [, year, month, rest] = match;

  // 残りのパスを解析
  const parts = rest.split('/');

  if (parts.length === 1) {
    // 旧形式: /content/images/YYYY/MM/filename.ext
    return {
      year,
      month,
      isGallery: false,
      filename: parts[0],
      isNewFormat: false,
    };
  } else if (parts.length === 2) {
    // 新形式: /content/images/YYYY/MM/[slug]/filename.ext
    return {
      year,
      month,
      slug: parts[0],
      isGallery: false,
      filename: parts[1],
      isNewFormat: true,
    };
  } else if (parts.length === 3 && parts[1] === 'gallery') {
    // 新形式（ギャラリー）: /content/images/YYYY/MM/[slug]/gallery/filename.ext
    return {
      year,
      month,
      slug: parts[0],
      isGallery: true,
      filename: parts[2],
      isNewFormat: true,
    };
  }

  return null;
}

/**
 * 旧形式のパスを新形式に変換する
 * @param oldPath - 旧形式のパス
 * @param slug - 記事のslug
 * @returns 新形式のパス
 */
export function migrateImagePath(oldPath: string, slug: string): string | null {
  const parsed = parseImagePath(oldPath);

  if (!parsed || parsed.isNewFormat) {
    // すでに新形式、または解析できない
    return null;
  }

  return generateImagePath({
    filename: parsed.filename,
    slug,
    isGallery: parsed.isGallery,
    year: parseInt(parsed.year!),
    month: parseInt(parsed.month!),
  });
}

/**
 * 画像パスを完全なURLに変換する
 * @param path - 画像パス（例: /content/images/2025/10/slug/image.jpg）
 * @returns 完全なURL
 */
export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // すでに完全なURLの場合はそのまま返す
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // 画像ベースURL（環境変数から取得）
  const imagesUrl = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_IMAGES_URL
    : process.env.NEXT_PUBLIC_IMAGES_URL || 'http://localhost:9000/monogs-images';

  // パスの正規化: 先頭の/を削除
  const imagePath = path.startsWith('/') ? path.substring(1) : path;

  return `${imagesUrl}/${imagePath}`;
}
