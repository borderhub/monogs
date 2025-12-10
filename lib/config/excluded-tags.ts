/**
 * 記事一覧から除外するタグのslugを指定
 * これらのタグが付いた記事は一覧に表示されません
 */
export const EXCLUDED_TAG_SLUGS: string[] = [
  // 例: 'private', 'draft', 'hidden'
  'diary', 'works'
];

/**
 * タグが除外リストに含まれているかチェック
 */
export function isTagExcluded(tagSlug: string): boolean {
  return EXCLUDED_TAG_SLUGS.includes(tagSlug);
}
