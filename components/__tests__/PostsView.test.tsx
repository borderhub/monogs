import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PostsView from '../PostsView';
import type { PostWithTags, Tag } from '@/lib/db/queries';

// Mock child components
vi.mock('../post/PostCard', () => ({
  default: ({ post }: { post: PostWithTags }) => (
    <div data-testid={`post-card-${post.id}`}>{post.title}</div>
  ),
}));

vi.mock('../post/PostList', () => ({
  default: ({ post }: { post: PostWithTags }) => (
    <div data-testid={`post-list-${post.id}`}>{post.title}</div>
  ),
}));

vi.mock('../post/PostSpace', () => ({
  default: ({ posts }: { posts: PostWithTags[] }) => (
    <div data-testid="post-space">
      {posts.map((p) => (
        <div key={p.id}>{p.title}</div>
      ))}
    </div>
  ),
}));

vi.mock('../ViewToggle', () => ({
  default: () => <div data-testid="view-toggle">View Toggle</div>,
}));

vi.mock('../SearchBar', () => ({
  default: () => <div data-testid="search-bar">Search Bar</div>,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PostsView', () => {
  const mockPosts: PostWithTags[] = [
    {
      id: '1',
      uuid: 'uuid-1',
      title: 'Test Post 1',
      slug: 'test-post-1',
      content: 'Content 1',
      html: '<p>HTML Content 1</p>',
      featureImage: null,
      galleryImages: null,
      featured: false,
      visibility: 'public',
      createdAt: '2025-01-01T00:00:00Z',
      publishedAt: '2025-01-01T00:00:00Z',
      updatedAt: null,
      customExcerpt: null,
      codeinjectionHead: null,
      codeinjectionFoot: null,
      customTemplate: null,
      canonicalUrl: null,
      authorId: 'author-1',
      status: 'published',
      tags: [
        {
          id: 'tag-1',
          name: 'Tag 1',
          slug: 'tag-1',
          description: null,
          featureImage: null,
          visibility: 'public',
          metaTitle: null,
          metaDescription: null,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: null,
        },
      ],
    },
    {
      id: '2',
      uuid: 'uuid-2',
      title: 'Test Post 2',
      slug: 'test-post-2',
      content: 'Content 2',
      html: '<p>HTML Content 2</p>',
      featureImage: null,
      galleryImages: null,
      featured: false,
      visibility: 'public',
      createdAt: '2025-01-02T00:00:00Z',
      publishedAt: '2025-01-02T00:00:00Z',
      updatedAt: null,
      customExcerpt: null,
      codeinjectionHead: null,
      codeinjectionFoot: null,
      customTemplate: null,
      canonicalUrl: null,
      authorId: 'author-1',
      status: 'published',
      tags: [
        {
          id: 'tag-2',
          name: 'Tag 2',
          slug: 'tag-2',
          description: null,
          featureImage: null,
          visibility: 'public',
          metaTitle: null,
          metaDescription: null,
          createdAt: '2025-01-02T00:00:00Z',
          updatedAt: null,
        },
      ],
    },
    {
      id: '3',
      uuid: 'uuid-3',
      title: 'Test Post 3',
      slug: 'test-post-3',
      content: 'Content 3',
      html: '<p>HTML Content 3</p>',
      featureImage: null,
      galleryImages: null,
      featured: false,
      visibility: 'public',
      createdAt: '2025-01-03T00:00:00Z',
      publishedAt: '2025-01-03T00:00:00Z',
      updatedAt: null,
      customExcerpt: null,
      codeinjectionHead: null,
      codeinjectionFoot: null,
      customTemplate: null,
      canonicalUrl: null,
      authorId: 'author-1',
      status: 'published',
      tags: [
        {
          id: 'tag-diary',
          name: 'diary',
          slug: 'diary',
          description: null,
          featureImage: null,
          visibility: 'public',
          metaTitle: null,
          metaDescription: null,
          createdAt: '2025-01-03T00:00:00Z',
          updatedAt: null,
        },
      ],
    },
  ];

  const mockTags: Tag[] = [
    {
      id: '1',
      name: 'Tag 1',
      slug: 'tag-1',
      description: null,
      featureImage: null,
      visibility: 'public',
      metaTitle: null,
      metaDescription: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: null,
    },
  ];

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should render all posts when getPosts already filtered excluded tags', () => {
    // getPosts関数がすでに除外タグ・タグなし記事でフィルタリングしているため、
    // PostsViewに渡される時点で除外タグを持つ投稿は含まれていない
    const filteredPosts = mockPosts.filter(p => !p.tags.some(t => t.slug === 'diary'));

    render(<PostsView posts={filteredPosts} tags={mockTags} />);

    // 除外タグを持つ投稿以外が表示される
    expect(screen.getByTestId('post-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-2')).toBeInTheDocument();

    // slug='diary'タグを持つ投稿は既にフィルタリング済みなので存在しない
    expect(screen.queryByTestId('post-card-3')).not.toBeInTheDocument();
  });

  it('should not apply additional filtering in PostsView', () => {
    // PostsViewはgetPostsから受け取った投稿をそのまま表示する
    // 追加のフィルタリングは不要
    render(<PostsView posts={mockPosts} tags={mockTags} />);

    // 全ての投稿が表示される（getPosts側でフィルタリングされていない場合）
    expect(screen.getByTestId('post-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-3')).toBeInTheDocument();
  });

  it('should render SearchBar and ViewToggle', () => {
    render(<PostsView posts={mockPosts} tags={mockTags} />);

    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
  });
});
