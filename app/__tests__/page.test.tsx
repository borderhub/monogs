import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../page';

// クエリ関数をモック
vi.mock('@/lib/db/queries', () => ({
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
  ]),
  getTags: vi.fn().mockResolvedValue([
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
}));

describe('Home Page', () => {
  it('should render the page title', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toBeInTheDocument();
  });

  it('should display all posts', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);

    expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    expect(screen.getByText('Test Post 2')).toBeInTheDocument();
  });

  it('should render post links with correct href', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);

    const post1Link = screen.getByRole('link', { name: /test post 1/i });
    const post2Link = screen.getByRole('link', { name: /test post 2/i });

    expect(post1Link).toHaveAttribute('href', '/test-post-1');
    expect(post2Link).toHaveAttribute('href', '/test-post-2');
  });

  it('should display feature image when available', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);

    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('should display custom excerpt when available', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);

    expect(screen.getByText('Test excerpt 1')).toBeInTheDocument();
  });

  it('should display published date', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);

    // 日付フォーマットは実装により異なるため、年のみチェック
    expect(screen.getAllByText(/2024/i).length).toBeGreaterThan(0);
  });

  it('should show featured badge for featured posts', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);

    // featured: trueの投稿にバッジが表示されることを確認
    const featuredBadges = screen.queryAllByText(/featured/i);
    expect(featuredBadges.length).toBeGreaterThan(0);
  });
});
