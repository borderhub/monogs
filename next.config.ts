import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 画像最適化（Cloudflare R2対応）
  images: {
    unoptimized: true,
    loader: 'custom',
    loaderFile: './lib/utils/image-loader.ts',
  },

  // リダイレクト設定
  async redirects() {
    return [
      // Ghost CMSの画像パスをR2カスタムドメインにリダイレクト
      // Note: カスタムドメイン設定(Phase 4-6)完了後に有効化
      // {
      //   source: '/content/images/:path*',
      //   destination: 'https://images.monogs.net/:path*',
      //   permanent: true,
      // },
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
