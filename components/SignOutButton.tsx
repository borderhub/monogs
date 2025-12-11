'use client';

import { useState } from 'react';

export default function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      // カスタムログアウトAPIを呼び出し
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // 強制的にサインインページへリダイレクト
        window.location.href = '/auth/signin';
      } else {
        console.error('Logout failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'ログアウト中...' : 'ログアウト'}
    </button>
  );
}
