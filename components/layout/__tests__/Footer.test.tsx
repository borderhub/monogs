import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from '../Footer';

describe('Footer Component', () => {
  it('should render footer element', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  it('should have gray-100 background color', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('bg-gray-100');
  });

  it('should display copyright text with current year', () => {
    const currentYear = new Date().getFullYear();
    render(<Footer />);
    const copyrightText = screen.getByText(new RegExp(`© ${currentYear} monogs`, 'i'));
    expect(copyrightText).toBeInTheDocument();
  });

  it('should display "All rights reserved" text', () => {
    render(<Footer />);
    const rightsText = screen.getByText(/all rights reserved/i);
    expect(rightsText).toBeInTheDocument();
  });

  it('should display "Powered by" text', () => {
    render(<Footer />);
    const poweredByText = screen.getByText(/powered by next.js \+ cloudflare/i);
    expect(poweredByText).toBeInTheDocument();
  });

  it('should have proper padding', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('p-8');
  });

  it('should have top margin', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('mt-12');
  });

  it('should have centered text container', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    const container = footer.querySelector('.container');
    expect(container).toHaveClass('mx-auto');
    expect(container).toHaveClass('text-center');
  });

  it('should apply gray-600 color to copyright text', () => {
    render(<Footer />);
    const copyrightText = screen.getByText(/© \d{4} monogs/i);
    expect(copyrightText).toHaveClass('text-gray-600');
  });

  it('should apply text-sm and gray-500 to powered by text', () => {
    render(<Footer />);
    const poweredByText = screen.getByText(/powered by next.js \+ cloudflare/i);
    expect(poweredByText).toHaveClass('text-sm');
    expect(poweredByText).toHaveClass('text-gray-500');
  });
});
