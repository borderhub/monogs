'use client';

import { useState } from 'react';
import PostCard from '@/components/post/PostCard';
import PostList from '@/components/post/PostList';
import PostSpace from '@/components/post/PostSpace';
import ViewToggle from '@/components/ViewToggle';
import SearchBar from '@/components/SearchBar';
import type { PostWithTags, Tag } from '@/lib/db/queries';

type ViewMode = 'grid' | 'list' | 'space';

interface PostsViewProps {
  posts: PostWithTags[];
  tags?: Tag[]
}

export default function PostsView({ posts, tags }: PostsViewProps) {
  // localStorageから初期値を取得（SSR時はデフォルト値）
  const getInitialViewMode = (): ViewMode => {
    if (typeof window === 'undefined') return 'grid';
    const stored = localStorage.getItem('postViewMode') as ViewMode | null;
    return stored === 'grid' || stored === 'list' || stored === 'space'
      ? stored
      : 'grid';
  };

  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // getPosts関数で既にEXCLUDED_TAG_SLUGSによるフィルタリングが実行されているため、
  // ここでは追加のフィルタリングは不要

  return (
    <div className="posts space-y-6">
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
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostList key={post.id} post={post} />
          ))}
        </div>
      )}

      {viewMode === 'space' && (
        <PostSpace posts={posts} />
      )}
    </div>
  );
}
