import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 参照サイト（Tetra Archives）のカラーパレット
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        gray: {
          300: '#d1d5db', // 背景色（参照サイト）
        },
      },
      fontFamily: {
        // Inter font stack (参照サイトと同様)
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        revolution: {
          '0%': { transform: 'rotateY(0deg) translate3d(var(--orbit-radius), 0, 0) rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg) translate3d(var(--orbit-radius), 0, 0) rotateY(-360deg)' },
        },
      },
      // 2. アニメーションクラスの定義 (CSS変数を使用)
      animation: {
        revolution: 'revolution var(--revolution-duration) linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
