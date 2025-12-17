import type { NextConfig } from 'next';

// 本番環境かどうかを判定（ローカル開発以外はすべて本番扱い）
const isProduction = process.env.NODE_ENV !== 'development';

const nextConfig: NextConfig = {
  // 環境変数の設定（NEXT_PUBLIC_* はクライアントに埋め込まれる）
  env: {
    NEXT_PUBLIC_IMAGES_URL: isProduction
      ? 'https://images.monogs.net'
      : 'http://localhost:9000/monogs-images',
  },
  // 画像最適化（Cloudflare R2対応）
  images: {
    // Cloudflare Workers環境では画像最適化がサポートされないため unoptimized: true
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/monogs-images/**',
      },
      {
        protocol: 'https',
        hostname: 'images.monogs.net',
        pathname: '/**',
      },
    ],
  },

  // リダイレクト設定
  async redirects() {
    // 開発環境ではMinIO、本番環境ではR2カスタムドメインを使用
    const isDevelopment = process.env.NODE_ENV === 'development';
    const imageBaseUrl = isDevelopment
      ? 'http://localhost:9000/monogs-images'
      : 'https://images.monogs.net';

    return [
      // Ghost CMSの画像パスをストレージにリダイレクト
      {
        source: '/content/images/:path*',
        destination: `${imageBaseUrl}/content/images/:path*`,
        permanent: !isDevelopment,
      },
      // RSS/Atom フィード (Ghostの標準パス)
      {
        source: '/rss',
        destination: '/api/rss',
        permanent: true,
      },
      {
        source: '/feed',
        destination: '/api/rss',
        permanent: true,
      },
      // 旧Ghostの著者ページ（実装がない場合はホームへリダイレクト）
      {
        source: '/author/:slug',
        destination: '/',
        permanent: false,
      },
    ];
  },

  // TypeScript設定
  typescript: {
    // ビルド時の型チェックを有効化
    ignoreBuildErrors: false,
  },

  // Cloudflare Pages対応
  // @opennextjs/cloudflare を使用する場合、ビルド後に自動で変換されるため
  // 特別な設定は不要ですが、環境変数の扱いに注意
  experimental: {
    // Cloudflare Workers環境でのパフォーマンス最適化
    optimizePackageImports: ['react', 'react-dom', 'next-auth'],
  },

  // Turbopack設定（Next.js 16+）
  turbopack: {},

  // Webpack設定: Cloudflare Workersで不要なパッケージを除外
  webpack: (config, { isServer }) => {
    if (isServer) {
      // better-sqlite3はローカル開発専用。Cloudflare WorkersではD1を使用
      config.externals = config.externals || [];
      config.externals.push('better-sqlite3');
    }
    return config;
  },
};

export default nextConfig;
