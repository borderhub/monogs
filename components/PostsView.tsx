'use client';

import { useState, useEffect } from 'react';
import PostCard from '@/components/post/PostCard';
import PostList from '@/components/post/PostList';
import ViewToggle from '@/components/ViewToggle';
import type { Post, Tag } from '@/lib/db/queries';
import { EXCLUDED_TAG_SLUGS } from '@/lib/config/excluded-tags';

type ViewMode = 'grid' | 'list';

interface PostsViewProps {
  posts: Post[];
  tags?: Tag[]
}

export default function PostsView({ posts, tags }: PostsViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem('postViewMode') as ViewMode | null;
    if (stored && (stored === 'grid' || stored === 'list')) {
      setViewMode(stored);
    }
  }, []);

  const allowdPosts = (post: Post) => {
    return (!EXCLUDED_TAG_SLUGS.includes(post.slug) &&
      tags && tags.length > 0) || !tags;
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    // Return a placeholder with the same structure during SSR
    return (
      <div className="space-y-6">
        <div className="flex justify-end mb-6">
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex justify-end mb-6">
        <ViewToggle onViewChange={handleViewChange} />
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
