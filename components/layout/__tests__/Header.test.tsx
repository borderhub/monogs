import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../Header';

describe('Header Component', () => {
  it('should render the header element', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('should have gray-300 background color', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-gray-300');
  });

  it('should render the logo with text "monogs"', () => {
    render(<Header />);
    const logo = screen.getByText('monogs');
    expect(logo).toBeInTheDocument();
  });

  it('should have a link to home page', () => {
    render(<Header />);
    const homeLink = screen.getByRole('link', { name: /monogs/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should render Navigation component', () => {
    render(<Header />);
    // Navigation コンポーネントが描画されることを確認
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('should have proper container styling', () => {
    render(<Header />);
    const container = screen.getByRole('banner').querySelector('.container');
    expect(container).toHaveClass('mx-auto');
  });
});
