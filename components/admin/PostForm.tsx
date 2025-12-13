'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
// import { toast } from 'react-hot-toast'; // トースト通知ライブラリを使用する場合はインポート
import type { Post, Tag } from '@/lib/db/queries'; // Post, Tag の型をインポート
import ImageUploader from './ImageUploader';
import ImageGalleryUploader from './ImageGalleryUploader';
import MarkdownEditor from './MarkdownEditor';
import { htmlToShortcodes, shortcodesToHtml, type ShortcodeCard } from '@/lib/utils/shortcode-converter';

// ----------------------------------------------------------------------
// ヘルパー関数: Mobiledoc処理
// ----------------------------------------------------------------------

// Mobiledocを編集可能なMarkdownと編集対象外のカードに分離するヘルパー関数
function parseMobiledoc(mobiledocJson: string | null | undefined): { initialMarkdown: string, nonEditableCards: any[] } {
  if (!mobiledocJson) {
    return { initialMarkdown: '', nonEditableCards: [] };
  }

  try {
    const mobiledoc = JSON.parse(mobiledocJson);
    let markdownContent = '';
    const nonEditableCards: any[] = [];

    if (Array.isArray(mobiledoc.cards)) {
      for (const card of mobiledoc.cards) {
        const [cardType, cardPayload] = card;

        if (cardType === 'markdown' && typeof cardPayload.markdown === 'string') {
          // 複数のmarkdownカードを結合（YouTube Iframeの前後にMarkdownがある場合を考慮）
          markdownContent += cardPayload.markdown + '\n\n';
        } else if (cardType === 'html' || cardType === 'gallery') {
          // HTMLカード（iframeを含む）やGalleryカードは編集対象外として保持
          nonEditableCards.push(card);
        }
      }
    }

    // MarkdownEditorに渡す前に前後の空行を削除
    return {
      initialMarkdown: markdownContent.trim(),
      nonEditableCards: nonEditableCards
    };
  } catch (e) {
    console.error("Mobiledoc parsing failed:", e);
    return { initialMarkdown: '', nonEditableCards: [] };
  }
}

// 編集後のMarkdownとカードを結合してMobiledocを再構築するヘルパー関数
function reconstructMobiledoc(markdownContent: string, nonEditableCards: any[]) {
  // 1. 編集後のMarkdownを新しいMobiledocカードとして定義
  const editedMarkdownCard = [
    "markdown",
    { "markdown": markdownContent.trim() }
  ];

  // 2. 編集可能なMarkdownカードと、編集対象外のカードを結合
  // Mobiledocはカードの順番を維持する必要があるため、編集Markdownを先頭に配置
  const allCards = [
    editedMarkdownCard,
    ...nonEditableCards
  ];

  // 3. Mobiledoc JSONを再構築
  const sections: any[] = allCards
    .map((_, index) => ([10, index])); // 10: カードセクション

  // 最後に空の段落セクションを追加（Mobiledocの一般的な仕様に合わせる）
  sections.push([1, "p", []]);

  return JSON.stringify({
    "version": "0.3.1",
    "atoms": [],
    "cards": allCards,
    "markups": [],
    "sections": sections
  });
}


// ----------------------------------------------------------------------
// コンポーネント定義
// ----------------------------------------------------------------------

// ★ 修正: mobiledocを明示的に許容する型を定義
interface PostFormData extends Partial<Post> {
  mobiledoc?: string | null;
}

interface PostFormProps {
  post?: PostFormData; // 修正された型を使用
  isEdit?: boolean;
  allTags?: Tag[];
  postTags?: Tag[];
}

export default function PostForm({ post, isEdit = false, allTags = [], postTags = [] }: PostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  // content の初期値は useEffect で mobiledoc から設定
  const [content, setContent] = useState(post?.content || '');
  const [customExcerpt, setCustomExcerpt] = useState(post?.customExcerpt || '');
  const [featureImage, setFeatureImage] = useState(post?.featureImage || '');
  const [status, setStatus] = useState(post?.status || 'draft');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ★ 編集対象外のカード（iframeなど）を保持する状態
  const [nonEditableCards, setNonEditableCards] = useState<any[]>([]);

  // ★ ショートコードカード（YouTube、ギャラリーなど）を保持する状態
  const [shortcodeCards, setShortcodeCards] = useState<ShortcodeCard[]>([]);

  // タグ関連の状態
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // ギャラリー画像の状態


  const parseGalleryImages = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (!value) return [];

    // 文字列の場合のみパースを試す
    if (typeof value === 'string') {
      // すでにJSON文字列っぽい？
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          return JSON.parse(value);
        } catch {
          // パース失敗 → 諦める
        }
      }
      // カンマ区切り？
      if (value.includes(',')) {
        return value.split(',').map(s => s.trim()).filter(Boolean);
      }
      // 1つのURLだけ
      return value.trim() ? [value.trim()] : [];
    }

    return [];
  };

  const [galleryImages, setGalleryImages] = useState<string[]>(
    parseGalleryImages(post?.galleryImages)
  );

  // 初期化処理
  useEffect(() => {
    // 既存の投稿の場合、紐付けられているタグを選択状態にする
    const initialTagIds = postTags?.map(tag => tag.id) || [];
    if (initialTagIds.length > 0)
      setSelectedTagIds(initialTagIds);

    // ★ HTMLコンテンツからショートコードを抽出
    if (post && post.content) {
      const { markdown, cards } = htmlToShortcodes(post.content);
      setContent(markdown);
      setShortcodeCards(cards);
      console.log('Extracted shortcode cards:', cards.length);
    } else if (post && post.mobiledoc) {
      // Fallback: Mobiledocのパース処理（互換性のため）
      const { initialMarkdown, nonEditableCards: cards } = parseMobiledoc(post.mobiledoc);
      setContent(initialMarkdown);
      setNonEditableCards(cards);
    } else {
      // 新規作成の場合
    }

  }, [post, postTags]);

  // タイトルからスラッグを自動生成
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9ぁ-んァ-ヶー一-龯]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEdit) {
      setSlug(generateSlug(value));
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleAddNewTag = () => {
    if (!newTagInput.trim()) return;

    // 新しいタグを追加する（実際にはAPIに送信して、サーバー側で処理）
    // ここでは一時的にnewTagInputを保持しておく
    setNewTagInput('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isEdit ? `/api/posts/${post?.id}` : '/api/posts';
      const method = isEdit ? 'PUT' : 'POST';

      // ★ ショートコードをHTMLに変換
      const finalContent = shortcodesToHtml(content, shortcodeCards);
      console.log('Submitting content with', shortcodeCards.length, 'cards');

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          slug,
          content: finalContent,
          customExcerpt,
          featureImage,
          status,
          tagIds: selectedTagIds,
          newTags: newTagInput ? [newTagInput] : [],
          galleryImages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save post');
      }

      router.push('/admin/posts');
      router.refresh();
    } catch (err) {
      setError('投稿の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" role="form">
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 右側: タイトルと本文 */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              タイトル *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="投稿のタイトルを入力"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              スラッグ *
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="url-slug"
            />
            <p className="mt-1 text-sm text-gray-500">URL: /{slug}</p>
          </div>

          <div>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              label="本文（Markdown）"
              height={600}
              shortcodeCards={shortcodeCards}
              onCardsChange={setShortcodeCards}
              onImageUpload={async (file) => {
                const formData = new FormData();
                formData.append('file', file);
                if (slug) {
                  formData.append('slug', slug);
                }
                const response = await fetch('/api/upload', {
                  method: 'POST',
                  body: formData,
                });
                if (!response.ok) throw new Error('Upload failed');
                const data = await response.json();
                return data.url;
              }}
            />
          </div>
        </div>

        {/* 左側: その他の項目 */}
        <div className="space-y-6">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              ステータス *
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </div>

          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
              抜粋
            </label>
            <textarea
              id="excerpt"
              value={customExcerpt}
              onChange={(e) => setCustomExcerpt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="記事の抜粋（任意）"
            />
          </div>

          <div>
            <ImageUploader
              onUpload={(url) => setFeatureImage(url)}
              currentImage={featureImage}
              label="アイキャッチ画像"
              slug={slug}
            />
            <div className="mt-2">
              <label htmlFor="featureImage" className="block text-sm font-medium text-gray-700 mb-2">
                またはURLを直接入力
              </label>
              <input
                id="featureImage"
                type="text"
                value={featureImage}
                onChange={(e) => setFeatureImage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://images.monogs.net/image.jpg"
              />
            </div>
          </div>

          <div>
            <ImageGalleryUploader
              images={galleryImages}
              onChange={setGalleryImages}
              maxImages={9}
              slug={slug}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タグ
            </label>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
              {allTags.length === 0 ? (
                <p className="text-sm text-gray-500">タグがありません</p>
              ) : (
                allTags.map((tag) => (
                  <label key={tag.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => handleTagToggle(tag.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{tag.name}</span>
                  </label>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="新しいタグを入力"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleAddNewTag}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                追加
              </button>
            </div>
            {newTagInput && (
              <p className="mt-1 text-sm text-gray-500">
                ※ 新しいタグは投稿保存時に作成されます
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '保存中...' : isEdit ? '更新する' : '作成する'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
