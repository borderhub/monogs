'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', url: '/' },
  { label: 'Biography', url: '/biography' },
  { label: 'Exhibition', url: '/tag/exhibition' },
  { label: 'Works', url: '/tag/works' },
  { label: 'Music', url: '/tag/music' },
  { label: 'tips', url: '/tag/tips' },
  { label: 'diary', url: '/tag/diary' },
  { label: 'Links', url: '/links' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav>
      <ul className="flex gap-6">
        {navItems.map((item) => (
          <li key={item.url}>
            <Link
              href={item.url}
              className={`hover:text-gray-600 transition ${
                pathname === item.url ? 'font-bold' : ''
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
