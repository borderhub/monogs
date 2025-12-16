'use client';

type ViewMode = 'grid' | 'list' | 'space';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  const handleViewChange = (mode: ViewMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('postViewMode', mode);
    }
    onViewChange(mode);
  };

  const baseClass =
    'p-2 rounded transition flex items-center justify-center';

  const activeClass = 'bg-gray-800 text-white';
  const inactiveClass =
    'bg-gray-100 text-gray-600 hover:bg-gray-200';

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
      <span className="text-sm text-gray-600 mr-2 hidden sm:block">
        View:
      </span>

      {/* Grid */}
      <button
        onClick={() => handleViewChange('grid')}
        className={`${baseClass} ${viewMode === 'grid' ? activeClass : inactiveClass
          }`}
        title="Grid View"
        aria-label="Grid View"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>

      {/* List */}
      <button
        onClick={() => handleViewChange('list')}
        className={`${baseClass} ${viewMode === 'list' ? activeClass : inactiveClass
          }`}
        title="List View"
        aria-label="List View"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Space */}
      <button
        onClick={() => handleViewChange('space')}
        className={`${baseClass} ${viewMode === 'space' ? activeClass : inactiveClass
          }`}
        title="Spatial View"
        aria-label="Spatial View"
      >
        {/* Orbital / space icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="3" strokeWidth={2} />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2 12c3-6 15-6 20 0M2 12c3 6 15 6 20 0"
          />
        </svg>
      </button>
    </div>
  );
}
