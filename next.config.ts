import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 画像最適化（Cloudflare R2対応）
  images: {
    unoptimized: true,
    loader: 'custom',
    loaderFile: './lib/utils/image-loader.ts',
  },

  // リダイレクト設定
  // 開発環境では不要、本番環境で必要に応じて設定
  // async redirects() {
  //   return [];
  // },

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
};

export default nextConfig;
