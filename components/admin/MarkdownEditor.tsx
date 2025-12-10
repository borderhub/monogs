'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { ChangeEvent } from 'react';
import type { ShortcodeCard } from '@/lib/utils/shortcode-converter';

// Dynamic import for MDEditor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  height?: number;
  onImageUpload?: (file: File) => Promise<string>;
  shortcodeCards?: ShortcodeCard[];
  onCardsChange?: (cards: ShortcodeCard[]) => void;
}

// Custom sanitize schema that allows iframe and Ghost gallery elements
const customSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    iframe: ['src', 'width', 'height', 'frameBorder', 'allow', 'allowFullScreen', 'title', 'referrerPolicy', 'style'],
    figure: ['className', 'class', 'style'],
    div: [...(defaultSchema.attributes?.div || []), 'className', 'class', 'style'],
    img: [...(defaultSchema.attributes?.img || []), 'srcSet', 'sizes', 'style'],
    audio: ['controls', 'src', 'type', 'style'],
    video: ['controls', 'src', 'type', 'style', 'width', 'height'],
    source: ['src', 'type'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'iframe',
    'figure',
    'figcaption',
    'audio',
    'video',
    'source',
  ],
};

export default function MarkdownEditor({
  value,
  onChange,
  label = 'Content (Markdown)',
  height = 500,
  onImageUpload,
  shortcodeCards = [],
  onCardsChange,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [mediaType, setMediaType] = useState<'youtube' | 'audio' | 'video' | ''>('');
  const [mediaUrl, setMediaUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Get textarea element from MDEditor
  const getTextarea = useCallback(() => {
    if (!editorContainerRef.current) return null;
    return editorContainerRef.current.querySelector('textarea') as HTMLTextAreaElement | null;
  }, []);

  // Get current cursor position
  const getCursorPosition = useCallback(() => {
    const textarea = getTextarea();
    if (textarea) {
      return textarea.selectionStart || 0;
    }
    return value.length;
  }, [getTextarea, value.length]);

  // Insert text at cursor position
  const insertAtCursor = useCallback((text: string) => {
    const textarea = getTextarea();
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const before = value.substring(0, start);
      const after = value.substring(end);
      const newValue = before + text + after;
      onChange(newValue);

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        const newPos = start + text.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      // Fallback: append to end
      onChange(value + text);
    }
  }, [getTextarea, value, onChange]);

  // Convert shortcodes to HTML for preview
  const previewContent = useMemo(() => {
    let html = value;

    // Replace shortcodes with actual HTML
    const cardMap = new Map(shortcodeCards.map(card => [card.id, card]));

    html = html.replace(/\{\{(youtube|gallery|audio|video):([^}]+)\}\}/g, (match, type, id) => {
      const card = cardMap.get(id);
      if (card) {
        return card.originalHtml;
      }
      // If card not found, show placeholder
      return `<div style="padding: 1rem; background: #f3f4f6; border: 2px dashed #cbd5e1; border-radius: 0.5rem; text-align: center; color: #64748b;">📎 ${type}: ${id}</div>`;
    });

    return html;
  }, [value, shortcodeCards]);

  // Handle image upload
  const handleImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !onImageUpload) return;

      setIsUploading(true);
      try {
        const url = await onImageUpload(file);
        // Insert image markdown at cursor position
        const imageMarkdown = `\n![${file.name}](${url})\n`;
        insertAtCursor(imageMarkdown);
      } catch (error) {
        console.error('Image upload failed:', error);
        alert('Image upload failed');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onImageUpload, insertAtCursor]
  );

  // Insert markdown format
  const insertMarkdown = (before: string, after: string = '') => {
    insertAtCursor(before + after);
  };

  // Insert media as shortcode
  const handleInsertMedia = () => {
    if (!mediaUrl) return;

    let shortcode = '';
    let newCard: ShortcodeCard | null = null;
    const cardIndex = shortcodeCards.length;

    if (mediaType === 'youtube') {
      // Extract YouTube video ID
      let videoId = '';
      try {
        const url = new URL(mediaUrl);
        if (url.hostname.includes('youtube.com')) {
          videoId = url.searchParams.get('v') || '';
        } else if (url.hostname.includes('youtu.be')) {
          videoId = url.pathname.slice(1);
        }
      } catch {
        // If not a valid URL, assume it's a video ID
        videoId = mediaUrl;
      }

      if (videoId) {
        const id = `youtube-${cardIndex}`;
        const originalHtml = `<iframe width="100%" height="400px" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;

        newCard = {
          type: 'youtube',
          id,
          data: { videoId },
          originalHtml,
        };
        shortcode = `\n\n{{youtube:${id}}}\n\n`;
      }
    } else if (mediaType === 'audio') {
      const id = `audio-${cardIndex}`;
      const originalHtml = `<audio controls style="width: 100%">\n  <source src="${mediaUrl}" type="audio/mpeg">\n  Your browser does not support the audio element.\n</audio>`;

      newCard = {
        type: 'audio',
        id,
        data: { src: mediaUrl },
        originalHtml,
      };
      shortcode = `\n\n{{audio:${id}}}\n\n`;
    } else if (mediaType === 'video') {
      const id = `video-${cardIndex}`;
      const originalHtml = `<video controls style="width: 100%">\n  <source src="${mediaUrl}" type="video/mp4">\n  Your browser does not support the video element.\n</video>`;

      newCard = {
        type: 'video',
        id,
        data: { src: mediaUrl },
        originalHtml,
      };
      shortcode = `\n\n{{video:${id}}}\n\n`;
    }

    if (shortcode && newCard) {
      insertAtCursor(shortcode);

      // Add new card to cards array
      if (onCardsChange) {
        onCardsChange([...shortcodeCards, newCard]);
      }
    }

    setShowMediaDialog(false);
    setMediaUrl('');
    setMediaType('');
  };

  return (
    <div className="space-y-2" ref={editorContainerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-t border border-b-0 border-gray-300 flex-wrap">
        <button
          type="button"
          onClick={() => insertMarkdown('**', '**')}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('*', '*')}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('\n## ')}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Heading"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('\n- ')}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="List"
        >
          List
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('\n```\n', '\n```\n')}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Code"
        >
          &lt;/&gt;
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('[Link Text](url)')}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Link"
        >
          Link
        </button>

        {onImageUpload && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              title="Upload Image"
            >
              {isUploading ? 'Uploading...' : 'Image'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </>
        )}

        <div className="h-6 w-px bg-gray-300"></div>

        <button
          type="button"
          onClick={() => {
            setMediaType('youtube');
            setShowMediaDialog(true);
          }}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Insert YouTube Video"
        >
          YouTube
        </button>
        <button
          type="button"
          onClick={() => {
            setMediaType('audio');
            setShowMediaDialog(true);
          }}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Insert Audio"
        >
          Audio
        </button>
        <button
          type="button"
          onClick={() => {
            setMediaType('video');
            setShowMediaDialog(true);
          }}
          className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Insert Video"
        >
          Video
        </button>

        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1 text-sm border border-gray-300 rounded ${showPreview ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'
              }`}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Media Dialog */}
      {showMediaDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Insert {mediaType === 'youtube' ? 'YouTube Video' : mediaType === 'audio' ? 'Audio' : 'Video'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {mediaType === 'youtube' ? 'YouTube URL or Video ID' : 'Media URL'}
                </label>
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={
                    mediaType === 'youtube'
                      ? 'https://www.youtube.com/watch?v=... or video ID'
                      : 'https://example.com/media.mp3'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowMediaDialog(false);
                    setMediaUrl('');
                    setMediaType('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertMedia}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={!mediaUrl}
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor or Preview */}
      {showPreview ? (
        <div
          className="p-4 bg-white border border-gray-300 rounded-b overflow-auto prose prose-sm max-w-none"
          style={{ minHeight: `${height}px` }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema]]}
          >
            {previewContent}
          </ReactMarkdown>
        </div>
      ) : (
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || '')}
          height={height}
          preview="edit"
          hideToolbar
          visibleDragbar={false}
        />
      )}

      <p className="text-xs text-gray-500 mt-1">
        Supports Markdown formatting: **bold**, *italic*, ## headings, - lists, ```code blocks```, [links](url), ![images](url)
      </p>
    </div>
  );
}
