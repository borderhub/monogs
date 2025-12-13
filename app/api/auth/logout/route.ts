import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // NextAuthのセッションクッキーを削除
    // Cloudflare Workers環境で確実に動作させるため、Set-Cookieヘッダーで明示的に削除
    const response = NextResponse.json({ success: true }, { status: 200 });

    // セキュアなクッキー（HTTPS環境用）
    const secureCookieNames = [
      '__Secure-authjs.session-token',
      '__Host-authjs.csrf-token',
    ];

    // 通常のクッキー
    const normalCookieNames = [
      'authjs.session-token',
      'authjs.csrf-token',
      'authjs.callback-url',
    ];

    // セキュアなクッキーを削除（secure: true, sameSite: 'lax'が必要）
    secureCookieNames.forEach(name => {
      response.cookies.set(name, '', {
        maxAge: 0,
        expires: new Date(0),
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
      });
    });

    // 通常のクッキーを削除
    normalCookieNames.forEach(name => {
      response.cookies.set(name, '', {
        maxAge: 0,
        expires: new Date(0),
        path: '/',
      });
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
