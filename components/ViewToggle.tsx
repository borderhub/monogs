'use client';

import { useState, useEffect } from 'react';

type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  onViewChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ onViewChange }: ViewToggleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isMounted, setIsMounted] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem('postViewMode') as ViewMode | null;
    if (stored && (stored === 'grid' || stored === 'list')) {
      setViewMode(stored);
      onViewChange(stored);
    } else {
      // Default to grid
      setViewMode('grid');
      onViewChange('grid');
    }
  }, []);

  // Save to localStorage when changed
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('postViewMode', mode);
    onViewChange(mode);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
      <span className="text-sm text-gray-600 mr-2">View:</span>
      <button
        onClick={() => handleViewChange('grid')}
        className={`p-2 rounded transition ${
          viewMode === 'grid'
            ? 'bg-gray-800 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="Grid View"
        aria-label="Grid View"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>
      <button
        onClick={() => handleViewChange('list')}
        className={`p-2 rounded transition ${
          viewMode === 'list'
            ? 'bg-gray-800 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="List View"
        aria-label="List View"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}
