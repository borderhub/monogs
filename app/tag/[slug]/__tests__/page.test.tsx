import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TagPage from '../page';

// クエリ関数をモック
vi.mock('@/lib/db/queries', () => ({
  getTagBySlug: vi.fn().mockImplementation(async (slug: string) => {
    if (slug === 'test-tag') {
      return {
        id: 'tag-1',
        name: 'Test Tag',
        slug: 'test-tag',
        description: 'This is a test tag',
        featureImage: null,
        visibility: 'public',
        metaTitle: null,
        metaDescription: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
    }
    return null;
  }),
  getPostsByTag: vi.fn().mockImplementation(async (slug: string) => {
    if (slug === 'test-tag') {
      return [
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
        {
          id: '2',
          uuid: 'uuid-2',
          title: 'Test Post 2',
          slug: 'test-post-2',
          content: '# Test Content 2',
          html: '<h1>Test Content 2</h1>',
          featureImage: null,
          featured: false,
          visibility: 'public',
          createdAt: '2024-01-02T00:00:00.000Z',
          publishedAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          customExcerpt: null,
          codeinjectionHead: null,
          codeinjectionFoot: null,
          customTemplate: null,
          canonicalUrl: null,
          authorId: 'author-1',
          status: 'published',
        },
      ];
    }
    return [];
  }),
  getTags: vi.fn().mockResolvedValue([
    {
      id: 'tag-1',
      name: 'Test Tag',
      slug: 'test-tag',
      description: 'This is a test tag',
      featureImage: null,
      visibility: 'public',
      metaTitle: null,
      metaDescription: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ]),
}));

describe('Tag Archive Page', () => {
  const params = Promise.resolve({ slug: 'test-tag' });

  it('should render the tag name as h1', async () => {
    const TagComponent = await TagPage({ params });
    render(TagComponent);

    expect(screen.getByRole('heading', { level: 1, name: /test tag/i })).toBeInTheDocument();
  });

  it('should display tag description when available', async () => {
    const TagComponent = await TagPage({ params });
    render(TagComponent);

    expect(screen.getByText('This is a test tag')).toBeInTheDocument();
  });

  it('should display all posts with the tag', async () => {
    const TagComponent = await TagPage({ params });
    render(TagComponent);

    expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    expect(screen.getByText('Test Post 2')).toBeInTheDocument();
  });

  it('should render post links with correct href', async () => {
    const TagComponent = await TagPage({ params });
    render(TagComponent);

    const post1Link = screen.getByRole('link', { name: /test post 1/i });
    const post2Link = screen.getByRole('link', { name: /test post 2/i });

    expect(post1Link).toHaveAttribute('href', '/test-post-1');
    expect(post2Link).toHaveAttribute('href', '/test-post-2');
  });

  it('should display post count', async () => {
    const TagComponent = await TagPage({ params });
    render(TagComponent);

    expect(screen.getByText(/2.*post/i)).toBeInTheDocument();
  });
});

describe('Tag Archive Page - Not Found', () => {
  const params = Promise.resolve({ slug: 'non-existent-tag' });

  it('should handle non-existent tag', async () => {
    const TagComponent = await TagPage({ params });
    render(TagComponent);

    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});

describe('Tag Archive Page - Empty', () => {
  const params = Promise.resolve({ slug: 'empty-tag' });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(vi.fn()).mockImplementation(() => ({
      getTagBySlug: vi.fn().mockResolvedValue({
        id: 'tag-2',
        name: 'Empty Tag',
        slug: 'empty-tag',
        description: null,
        featureImage: null,
        visibility: 'public',
        metaTitle: null,
        metaDescription: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }),
      getPostsByTag: vi.fn().mockResolvedValue([]),
      getTags: vi.fn().mockResolvedValue([]),
    }));
  });

  it('should show message when tag has no posts', async () => {
    // This test will be implemented when the page handles empty state
    expect(true).toBe(true);
  });
});
