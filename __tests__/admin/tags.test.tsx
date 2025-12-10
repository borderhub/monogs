import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminTagsPage from '@/app/admin/tags/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock queries
vi.mock('@/lib/db/queries', () => ({
  getTags: vi.fn(),
}));

describe('AdminTagsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tags management page', async () => {
    const { auth } = await import('@/lib/auth');
    const { getTags } = await import('@/lib/db/queries');

    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', email: 'admin@monogs.net', name: 'Admin' },
    } as any);

    vi.mocked(getTags).mockResolvedValue([
      {
        id: '1',
        name: 'Exhibition',
        slug: 'exhibition',
        description: 'Art exhibitions',
        featureImage: null,
        visibility: 'public',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        name: 'Works',
        slug: 'works',
        description: 'Art works',
        featureImage: null,
        visibility: 'public',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const page = await AdminTagsPage();
    render(page);

    expect(screen.getByText('タグ管理')).toBeInTheDocument();
    expect(screen.getByText('Exhibition')).toBeInTheDocument();
    expect(screen.getByText('Works')).toBeInTheDocument();
  });

  it('should have a create new tag button', async () => {
    const { auth } = await import('@/lib/auth');
    const { getTags } = await import('@/lib/db/queries');

    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', email: 'admin@monogs.net', name: 'Admin' },
    } as any);

    vi.mocked(getTags).mockResolvedValue([]);

    const page = await AdminTagsPage();
    render(page);

    expect(screen.getByText('新規タグ')).toBeInTheDocument();
  });

  it('should display tag slug', async () => {
    const { auth } = await import('@/lib/auth');
    const { getTags } = await import('@/lib/db/queries');

    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', email: 'admin@monogs.net', name: 'Admin' },
    } as any);

    vi.mocked(getTags).mockResolvedValue([
      {
        id: '1',
        name: 'Exhibition',
        slug: 'exhibition',
        description: 'Art exhibitions',
        featureImage: null,
        visibility: 'public',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const page = await AdminTagsPage();
    render(page);

    expect(screen.getByText('exhibition')).toBeInTheDocument();
  });

  it('should have edit links for each tag', async () => {
    const { auth } = await import('@/lib/auth');
    const { getTags } = await import('@/lib/db/queries');

    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', email: 'admin@monogs.net', name: 'Admin' },
    } as any);

    vi.mocked(getTags).mockResolvedValue([
      {
        id: '1',
        name: 'Exhibition',
        slug: 'exhibition',
        description: 'Art exhibitions',
        featureImage: null,
        visibility: 'public',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const page = await AdminTagsPage();
    render(page);

    const editLinks = screen.getAllByText('編集');
    expect(editLinks.length).toBeGreaterThan(0);
  });

  it('should redirect to signin if not authenticated', async () => {
    const { auth } = await import('@/lib/auth');
    const { redirect } = await import('next/navigation');

    vi.mocked(auth).mockResolvedValue(null);

    await AdminTagsPage();

    expect(redirect).toHaveBeenCalledWith('/auth/signin');
  });
});
