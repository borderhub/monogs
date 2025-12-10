import { marked } from 'marked';

/**
 * Convert Markdown to HTML
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // Configure marked options
  marked.setOptions({
    gfm: true, // GitHub Flavored Markdown
    breaks: true, // Convert line breaks to <br>
  });

  // Convert Markdown to HTML
  const html = marked.parse(markdown) as string;

  return html;
}

/**
 * Extract plain text from HTML (for meta description, etc.)
 */
export function htmlToPlainText(html: string, maxLength: number = 160): string {
  if (!html) return '';

  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, '');
  // Convert consecutive whitespace to single space
  const cleaned = text.replace(/\s+/g, ' ').trim();
  // Truncate to specified length
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + '...'
    : cleaned;
}
