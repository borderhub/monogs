import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignInPage from '../page';

// Next.jsのルーターとNextAuthをモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

describe('SignIn Page', () => {
  it('should render the page title', () => {
    render(<SignInPage />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('should have "Sign In" in the title', () => {
    render(<SignInPage />);

    expect(screen.getByRole('heading', { level: 1, name: /sign in/i })).toBeInTheDocument();
  });

  it('should render email input field', () => {
    render(<SignInPage />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should render password input field', () => {
    render(<SignInPage />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should render sign in button', () => {
    render(<SignInPage />);

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();
  });

  it('should have a form element', () => {
    render(<SignInPage />);

    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });
});
