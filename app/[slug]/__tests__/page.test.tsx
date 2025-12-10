import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostPage from '../page';

// クエリ関数をモック
vi.mock('@/lib/db/queries', () => ({
  getPostBySlug: vi.fn().mockImplementation(async (slug: string) => {
    if (slug === 'test-post-1') {
      return {
        id: '1',
        uuid: 'uuid-1',
        title: 'Test Post 1',
        slug: 'test-post-1',
        content: '# Test Content 1\n\nThis is test content.',
        html: '<h1>Test Content 1</h1><p>This is test content.</p>',
        featureImage: 'https://images.monogs.net/test1.jpg',
        featured: true,
        visibility: 'public',
        createdAt: '2024-01-01T00:00:00.000Z',
        publishedAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        customExcerpt: 'Test excerpt 1',
        codeinjectionHead: null,
        codeinjectionFoot: null,
        customTemplate: null,
        canonicalUrl: null,
        authorId: 'author-1',
        status: 'published',
      };
    }
    return null;
  }),
  getPostTags: vi.fn().mockResolvedValue([
    {
      id: 'tag-1',
      name: 'Test Tag',
      slug: 'test-tag',
      description: null,
      featureImage: null,
      visibility: 'public',
      metaTitle: null,
      metaDescription: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ]),
  getPosts: vi.fn().mockResolvedValue([
    {
      id: '1',
      uuid: 'uuid-1',
      title: 'Test Post 1',
      slug: 'test-post-1',
      content: '# Test Content 1',
      html: '<h1>Test Content 1</h1>',
      featureImage: 'https://images.monogs.net/test1.jpg',
      featured: true,
      visibility: 'public',
      createdAt: '2024-01-01T00:00:00.000Z',
      publishedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      customExcerpt: 'Test excerpt 1',
      codeinjectionHead: null,
      codeinjectionFoot: null,
      customTemplate: null,
      canonicalUrl: null,
      authorId: 'author-1',
      status: 'published',
    },
  ]),
}));

describe('Post Detail Page', () => {
  const params = Promise.resolve({ slug: 'test-post-1' });

  it('should render the post title', async () => {
    const PostComponent = await PostPage({ params });
    render(PostComponent);

    expect(screen.getByRole('heading', { level: 1, name: 'Test Post 1' })).toBeInTheDocument();
  });

  it('should render the post content', async () => {
    const PostComponent = await PostPage({ params });
    render(PostComponent);

    expect(screen.getByText(/this is test content/i)).toBeInTheDocument();
  });

  it('should display the feature image', async () => {
    const PostComponent = await PostPage({ params });
    render(PostComponent);

    const image = screen.getByRole('img', { name: 'Test Post 1' });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('alt', 'Test Post 1');
  });

  it('should display published date', async () => {
    const PostComponent = await PostPage({ params });
    render(PostComponent);

    expect(screen.getByText(/2024/i)).toBeInTheDocument();
  });

  it('should display post tags', async () => {
    const PostComponent = await PostPage({ params });
    render(PostComponent);

    expect(screen.getByText('Test Tag')).toBeInTheDocument();
  });

  it('should render tag links with correct href', async () => {
    const PostComponent = await PostPage({ params });
    render(PostComponent);

    const tagLink = screen.getByRole('link', { name: /test tag/i });
    expect(tagLink).toHaveAttribute('href', '/tag/test-tag');
  });

  it('should have article element', async () => {
    const PostComponent = await PostPage({ params });
    render(PostComponent);

    const article = screen.getByRole('article');
    expect(article).toBeInTheDocument();
  });
});

describe('Post Detail Page - Not Found', () => {
  const params = Promise.resolve({ slug: 'non-existent-post' });

  it('should handle non-existent post', async () => {
    const PostComponent = await PostPage({ params });
    render(PostComponent);

    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
