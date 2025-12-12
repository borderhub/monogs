'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const publicNavItems = [
  { label: 'Home', url: '/' },
  { label: 'Biography', url: '/biography' },
  { label: 'Exhibition', url: '/tag/exhibition' },
  { label: 'Works', url: '/tag/works' },
  { label: 'Music', url: '/tag/music' },
  { label: 'tips', url: '/tag/tips' },
  { label: 'diary', url: '/tag/diary' },
  { label: 'Links', url: '/links' },
];

const adminNavItems = [
  { label: 'ダッシュボード', url: '/admin' },
  { label: '投稿管理', url: '/admin/posts' },
  { label: 'タグ管理', url: '/admin/tags' },
  { label: 'メディア管理', url: '/admin/media' },
  { label: '設定', url: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Auto-detect if we're on an admin page
  const isAdmin = pathname.startsWith('/admin');

  // Initialize sidebar state from localStorage and window size
  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem('sidebarOpen');
    const isDesktop = window.innerWidth >= 1024;

    if (stored !== null) {
      setIsOpen(stored === 'true');
    } else {
      // Default: open on desktop, closed on mobile
      setIsOpen(isDesktop);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sidebarOpen', String(isOpen));
    }
  }, [isOpen, isMounted]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const navItems = isAdmin ? adminNavItems : publicNavItems;

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleSidebar}
        className={`fixed z-50 p-1 transition ${isOpen
          ? `left-[255px] top-3 bg-gray-200 text-gray-700 hover:bg-gray-100 transition` // Open: PC side edge, mobile fixed
          : 'lg:left-4 left-3 top-3 bg-gray-800 text-white hover:bg-gray-700 rounded-md' // Closed: Both fixed left
          }`}
        style={{
          transition: 'left 0.3s ease',
        }}
        aria-label="Toggle sidebar"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-100 border-r border-gray-300 shadow-lg z-40 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-300">
            <Link href="/" className="text-2xl font-bold text-gray-800">
              monogs
            </Link>
            {isAdmin && (
              <p className="text-sm text-gray-600 mt-1">管理画面</p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.url}>
                  <Link
                    href={item.url}
                    className={`block px-4 py-2 rounded-md transition ${pathname === item.url
                      ? 'bg-gray-800 text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    onClick={() => {
                      // Close sidebar on mobile after clicking
                      if (window.innerWidth < 1024) {
                        setIsOpen(false);
                      }
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-300">
            <p className="text-xs text-gray-500 text-center">
              © 2025 monogs
            </p>
          </div>
        </div>
      </aside>

      {/* Spacer to push content when sidebar is open on desktop */}
      <div
        className={`hidden lg:block transition-all duration-300 ${isOpen ? 'w-64' : 'w-0'
          }`}
      />
    </>
  );
}
