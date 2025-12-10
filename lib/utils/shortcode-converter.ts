/**
 * Shortcode Converter
 * Convert HTML cards (iframe, gallery, etc.) to safe shortcodes for editing,
 * and convert back to HTML when saving
 */

export interface ShortcodeCard {
  type: 'youtube' | 'gallery' | 'html' | 'audio' | 'video';
  id: string;
  data: any;
  originalHtml: string;
}

/**
 * Extract YouTube video ID from iframe
 */
function extractYouTubeId(iframeHtml: string): string | null {
  const srcMatch = iframeHtml.match(/src="([^"]+)"/);
  if (!srcMatch) return null;

  const src = srcMatch[1];
  const idMatch = src.match(/\/embed\/([^?&"]+)/);
  return idMatch ? idMatch[1] : null;
}

/**
 * Extract gallery images from kg-gallery HTML
 */
function extractGalleryImages(galleryHtml: string): string[] {
  const images: string[] = [];
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  let match;

  while ((match = imgRegex.exec(galleryHtml)) !== null) {
    images.push(match[1]);
  }

  return images;
}

/**
 * Extract width and height from gallery images
 */
function extractImageDimensions(galleryHtml: string): Array<{src: string; width?: string; height?: string}> {
  const images: Array<{src: string; width?: string; height?: string}> = [];
  const imgRegex = /<img[^>]+>/g;
  let match;

  while ((match = imgRegex.exec(galleryHtml)) !== null) {
    const imgTag = match[0];
    const srcMatch = imgTag.match(/src="([^"]+)"/);
    const widthMatch = imgTag.match(/width="([^"]+)"/);
    const heightMatch = imgTag.match(/height="([^"]+)"/);

    if (srcMatch) {
      images.push({
        src: srcMatch[1],
        width: widthMatch ? widthMatch[1] : undefined,
        height: heightMatch ? heightMatch[1] : undefined,
      });
    }
  }

  return images;
}

/**
 * Convert HTML content to shortcodes
 * Extracts iframe, gallery, and other HTML elements and converts them to shortcodes
 */
export function htmlToShortcodes(html: string): { markdown: string; cards: ShortcodeCard[] } {
  let markdown = html;
  const cards: ShortcodeCard[] = [];
  let cardIndex = 0;

  // Convert YouTube iframes
  const iframeRegex = /<iframe[^>]+src="[^"]*youtube\.com\/embed\/[^"]*"[^>]*>[\s\S]*?<\/iframe>/g;
  markdown = markdown.replace(iframeRegex, (match) => {
    const videoId = extractYouTubeId(match);
    if (videoId) {
      const id = `youtube-${cardIndex++}`;
      cards.push({
        type: 'youtube',
        id,
        data: { videoId },
        originalHtml: match,
      });
      return `\n\n{{youtube:${id}}}\n\n`;
    }
    return match;
  });

  // Convert audio elements
  const audioRegex = /<audio[^>]*>[\s\S]*?<\/audio>/g;
  markdown = markdown.replace(audioRegex, (match) => {
    const srcMatch = match.match(/src="([^"]+)"/);
    if (srcMatch) {
      const id = `audio-${cardIndex++}`;
      cards.push({
        type: 'audio',
        id,
        data: { src: srcMatch[1] },
        originalHtml: match,
      });
      return `\n\n{{audio:${id}}}\n\n`;
    }
    return match;
  });

  // Convert video elements
  const videoRegex = /<video[^>]*>[\s\S]*?<\/video>/g;
  markdown = markdown.replace(videoRegex, (match) => {
    const srcMatch = match.match(/src="([^"]+)"/);
    if (srcMatch) {
      const id = `video-${cardIndex++}`;
      cards.push({
        type: 'video',
        id,
        data: { src: srcMatch[1] },
        originalHtml: match,
      });
      return `\n\n{{video:${id}}}\n\n`;
    }
    return match;
  });

  // Convert kg-gallery cards
  const galleryRegex = /<figure[^>]*class="[^"]*kg-gallery-card[^"]*"[^>]*>[\s\S]*?<\/figure>/g;
  markdown = markdown.replace(galleryRegex, (match) => {
    const images = extractImageDimensions(match);
    if (images.length > 0) {
      const id = `gallery-${cardIndex++}`;
      const widthWide = match.includes('kg-width-wide');
      cards.push({
        type: 'gallery',
        id,
        data: { images, widthWide },
        originalHtml: match,
      });
      return `\n\n{{gallery:${id}}}\n\n`;
    }
    return match;
  });

  return { markdown: markdown.trim(), cards };
}

/**
 * Convert shortcodes back to HTML
 * Replaces shortcode placeholders with original HTML
 */
export function shortcodesToHtml(markdown: string, cards: ShortcodeCard[]): string {
  let html = markdown;

  // Create a map for quick lookup
  const cardMap = new Map(cards.map(card => [card.id, card]));

  // Replace YouTube shortcodes
  html = html.replace(/\{\{youtube:([^}]+)\}\}/g, (match, id) => {
    const card = cardMap.get(id);
    if (card && card.type === 'youtube') {
      return card.originalHtml;
    }
    return match;
  });

  // Replace audio shortcodes
  html = html.replace(/\{\{audio:([^}]+)\}\}/g, (match, id) => {
    const card = cardMap.get(id);
    if (card && card.type === 'audio') {
      return card.originalHtml;
    }
    return match;
  });

  // Replace video shortcodes
  html = html.replace(/\{\{video:([^}]+)\}\}/g, (match, id) => {
    const card = cardMap.get(id);
    if (card && card.type === 'video') {
      return card.originalHtml;
    }
    return match;
  });

  // Replace gallery shortcodes
  html = html.replace(/\{\{gallery:([^}]+)\}\}/g, (match, id) => {
    const card = cardMap.get(id);
    if (card && card.type === 'gallery') {
      return card.originalHtml;
    }
    return match;
  });

  return html;
}

/**
 * Generate human-readable placeholder for shortcode
 * This is displayed in the editor to indicate what the shortcode represents
 */
export function getShortcodePlaceholder(card: ShortcodeCard): string {
  switch (card.type) {
    case 'youtube':
      return `📺 YouTube動画: ${card.data.videoId}`;
    case 'gallery':
      return `🖼️ ギャラリー: ${card.data.images.length}枚の画像`;
    case 'audio':
      return `🔊 音声プレイヤー`;
    case 'video':
      return `🎬 動画プレイヤー`;
    default:
      return `📎 ${card.type}`;
  }
}

/**
 * Create a new shortcode card from editor insertion
 * Used when inserting new media via the editor toolbar
 */
export function createShortcodeCard(
  type: 'youtube' | 'audio' | 'video',
  data: any,
  cardIndex: number
): { shortcode: string; card: ShortcodeCard } {
  const id = `${type}-${cardIndex}`;
  let originalHtml = '';

  switch (type) {
    case 'youtube':
      originalHtml = `<iframe width="100%" height="400px" src="https://www.youtube.com/embed/${data.videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
      break;
    case 'audio':
      originalHtml = `<audio controls style="width: 100%">\n  <source src="${data.src}" type="audio/mpeg">\n  Your browser does not support the audio element.\n</audio>`;
      break;
    case 'video':
      originalHtml = `<video controls style="width: 100%">\n  <source src="${data.src}" type="video/mp4">\n  Your browser does not support the video element.\n</video>`;
      break;
  }

  const card: ShortcodeCard = {
    type,
    id,
    data,
    originalHtml,
  };

  return {
    shortcode: `{{${type}:${id}}}`,
    card,
  };
}
