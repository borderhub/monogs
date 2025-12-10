import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminPostsPage from '../page';

// モック
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: '1', email: 'admin@monogs.net', name: 'Admin' },
  }),
}));

vi.mock('@/lib/db/queries', () => ({
  getPosts: vi.fn().mockResolvedValue([
    {
      id: '1',
      title: 'Test Post 1',
      slug: 'test-post-1',
      status: 'published',
      publishedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      title: 'Test Post 2',
      slug: 'test-post-2',
      status: 'draft',
      publishedAt: null,
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ]),
}));

describe('Admin Posts Page', () => {
  it('should render page title', async () => {
    const PageComponent = await AdminPostsPage();
    render(PageComponent);

    expect(screen.getByRole('heading', { level: 1, name: /投稿管理/i })).toBeInTheDocument();
  });

  it('should render create new post button', async () => {
    const PageComponent = await AdminPostsPage();
    render(PageComponent);

    const createButton = screen.getByRole('link', { name: /新規投稿/i });
    expect(createButton).toBeInTheDocument();
    expect(createButton).toHaveAttribute('href', '/admin/posts/new');
  });

  it('should display posts list', async () => {
    const PageComponent = await AdminPostsPage();
    render(PageComponent);

    expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    expect(screen.getByText('Test Post 2')).toBeInTheDocument();
  });

  it('should show post status', async () => {
    const PageComponent = await AdminPostsPage();
    render(PageComponent);

    expect(screen.getByText(/published/i)).toBeInTheDocument();
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });

  it('should have edit links for each post', async () => {
    const PageComponent = await AdminPostsPage();
    render(PageComponent);

    const editLinks = screen.getAllByRole('link', { name: /編集/i });
    expect(editLinks.length).toBeGreaterThan(0);
  });
});
