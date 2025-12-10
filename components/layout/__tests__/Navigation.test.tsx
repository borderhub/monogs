import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navigation from '../Navigation';

// Next.js の usePathname をモック
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Navigation Component', () => {
  it('should render navigation element', () => {
    render(<Navigation />);
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('should render all 8 navigation items', () => {
    render(<Navigation />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(8);
  });

  it('should render Home link', () => {
    render(<Navigation />);
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should render Biography link', () => {
    render(<Navigation />);
    const bioLink = screen.getByRole('link', { name: /biography/i });
    expect(bioLink).toHaveAttribute('href', '/biography');
  });

  it('should render Exhibition link', () => {
    render(<Navigation />);
    const exhibitionLink = screen.getByRole('link', { name: /exhibition/i });
    expect(exhibitionLink).toHaveAttribute('href', '/tag/exhibition');
  });

  it('should render Works link', () => {
    render(<Navigation />);
    const worksLink = screen.getByRole('link', { name: /works/i });
    expect(worksLink).toHaveAttribute('href', '/tag/works');
  });

  it('should render Music link', () => {
    render(<Navigation />);
    const musicLink = screen.getByRole('link', { name: /music/i });
    expect(musicLink).toHaveAttribute('href', '/tag/music');
  });

  it('should render tips link', () => {
    render(<Navigation />);
    const tipsLink = screen.getByRole('link', { name: /tips/i });
    expect(tipsLink).toHaveAttribute('href', '/tag/tips');
  });

  it('should render diary link', () => {
    render(<Navigation />);
    const diaryLink = screen.getByRole('link', { name: /diary/i });
    expect(diaryLink).toHaveAttribute('href', '/tag/diary');
  });

  it('should render Links link', () => {
    render(<Navigation />);
    const linksLink = screen.getByRole('link', { name: /links/i });
    expect(linksLink).toHaveAttribute('href', '/links');
  });

  it('should apply hover transition classes to links', () => {
    render(<Navigation />);
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveClass('hover:text-gray-600');
      expect(link).toHaveClass('transition');
    });
  });

  it('should display links in a flex container with gap', () => {
    render(<Navigation />);
    const list = screen.getByRole('list');
    expect(list).toHaveClass('flex');
    expect(list).toHaveClass('gap-6');
  });
});
