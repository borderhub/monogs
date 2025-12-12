'use client';

import { useState } from 'react';
import PostCard from '@/components/post/PostCard';
import PostList from '@/components/post/PostList';
import ViewToggle from '@/components/ViewToggle';
import SearchBar from '@/components/SearchBar';
import type { Post, Tag } from '@/lib/db/queries';
import { EXCLUDED_TAG_SLUGS } from '@/lib/config/excluded-tags';

type ViewMode = 'grid' | 'list';

interface PostsViewProps {
  posts: Post[];
  tags?: Tag[]
}

export default function PostsView({ posts, tags }: PostsViewProps) {
  // localStorageから初期値を取得（SSR時はデフォルト値）
  const getInitialViewMode = (): ViewMode => {
    if (typeof window === 'undefined') return 'grid';
    const stored = localStorage.getItem('postViewMode') as ViewMode | null;
    return (stored === 'grid' || stored === 'list') ? stored : 'grid';
  };

  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

  const allowdPosts = (post: Post) => {
    return (!EXCLUDED_TAG_SLUGS.includes(post.slug) &&
      tags && tags.length > 0) || !tags;
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6 gap-2">
        <div className="flex-2 max-w-3xl">
          <SearchBar />
        </div>
        <div className="flex flex-0">  {/* max-w-3xl で広すぎ防止も可 */}
          <ViewToggle viewMode={viewMode} onViewChange={handleViewChange} />
        </div>
      </div>

      {/* Posts Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            allowdPosts(post) && <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            allowdPosts(post) && <PostList key={post.id} post={post} />)
          )}
        </div>
      )}
    </div>
  );
}
