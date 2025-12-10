# Ghost → Next.js (Cloudflare) 移行進捗

最終更新: 2025-12-07 02:32

---

## ✅ Phase 1: データ抽出（完了）

**実行日**: 2025-12-07 02:07
**結果**: 62記事、16タグ、270画像パス検出

---

## ✅ Phase 2: データ変換（完了）

**実行日**: 2025-12-07 02:08-02:09
**結果**: mobiledoc→Markdown変換、日付・スラッグ正規化

---

## ✅ Phase 3: Cloudflare D1 シード準備（完了）

**実行日**: 2025-12-07 02:20-02:25
**結果**: Drizzleスキーマ定義、マイグレーション生成、シードスクリプト作成

**次のアクション**: D1データベース作成・シード実行
詳細: `migration-data/PHASE3_D1_SETUP.md`

---

## ✅ Phase 4: Next.js プロジェクトセットアップ（完了）

**実行日**: 2025-12-07 02:26-02:32

### 完了項目

#### 1. Next.js 15 + React 19 インストール
- next@^15.1.3
- react@^19.0.0
- react-dom@^19.0.0
- next-auth@^5.0.0-beta.25
- その他20+パッケージ

#### 2. Cloudflare Pages 対応設定
- `next.config.ts`: output: 'export', 画像ローダー, リダイレクト
- `@cloudflare/next-on-pages` 設定（OpenNext移行推奨）

#### 3. Tailwind CSS v4 セットアップ
- `tailwind.config.ts`
- `postcss.config.mjs`
- `app/globals.css`
- Interフォント、参照サイトのカラーパレット

#### 4. ディレクトリ構造作成
```
app/
├── layout.tsx, page.tsx, globals.css
├── [slug]/                    # 記事詳細
├── tag/[slug]/                # タグページ
├── admin/posts/, admin/tags/  # 管理画面
└── api/auth/[...nextauth]/    # 認証API

components/
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Navigation.tsx
├── posts/      # Phase 5で実装
├── admin/      # Phase 6で実装
└── ui/         # Phase 5で実装

lib/
├── db/         # client.ts, queries.ts (Phase 5)
├── auth/       # config.ts (Phase 6)
├── r2/         # client.ts (Phase 7)
└── utils/
    └── image-loader.ts
```

#### 5. 基本レイアウトコンポーネント
- ✅ Header: ロゴ + ナビゲーション
- ✅ Navigation: 8項目（Home, Biography, Exhibition, Works, Music, tips, diary, Links）
- ✅ Footer: コピーライト

#### 6. ユーティリティ
- ✅ R2画像ローダー（`lib/utils/image-loader.ts`）
- ✅ 環境変数テンプレート（`.env.local.example`）

#### 7. 設定ファイル
- ✅ TypeScript設定更新（Next.jsプラグイン、JSX、パスエイリアス）
- ✅ .gitignore更新

**開発サーバー起動**:
```bash
npm run dev
# → http://localhost:3000
```

**詳細**: `migration-data/PHASE4_NEXTJS_SETUP.md`

---

## 🔜 Phase 5: フロントエンド実装（未着手）

### 実装予定

- [ ] **D1接続とデータ取得**
  - lib/db/client.ts: D1クライアント
  - lib/db/queries.ts: クエリ関数（getPosts, getPost, getTags等）

- [ ] **記事表示コンポーネント**
  - components/posts/PostCard.tsx: カード表示
  - components/posts/PostList.tsx: 一覧
  - components/posts/PostContent.tsx: 詳細（Markdown レンダリング）

- [ ] **動的ページ実装**
  - app/[slug]/page.tsx: 記事詳細
  - app/tag/[slug]/page.tsx: タグページ
  - ページネーション実装

- [ ] **静的ページ**
  - app/biography/page.tsx
  - app/links/page.tsx

- [ ] **SEO最適化**
  - app/sitemap.ts: 動的sitemap
  - app/robots.ts: robots.txt
  - OGP画像設定

---

## 🔜 Phase 6: 管理画面実装（未着手）

- [ ] NextAuth.js設定（lib/auth/config.ts）
- [ ] 認証ミドルウェア
- [ ] 記事CRUD API（app/api/admin/posts/*）
- [ ] Markdownエディタ
- [ ] 画像アップローダー（R2）
- [ ] タグ管理CRUD

---

## 🔜 Phase 7: Cloudflare デプロイ（未着手）

- [ ] R2バケット作成・画像アップロード（270件）
- [ ] Pagesプロジェクト作成
- [ ] 環境変数設定
- [ ] ステージングデプロイ・動作確認

---

## 🔜 Phase 8: 本番切替（未着手）

- [ ] DNS設定（メールサーバー共存）
- [ ] SSL/TLS設定
- [ ] 全機能テスト
- [ ] 本番ドメイン切替
- [ ] ロールバック手順確認

---

## 📊 全体進捗: 50% (4/8 Phase 完了)

```
[####################··················] 50%
 ✅ P1  ✅ P2  ✅ P3  ✅ P4  ⬜ P5  ⬜ P6  ⬜ P7  ⬜ P8
```

---

## 📁 プロジェクト構成（最新）

```
monogs/
├── app/                           ✅ Next.js App Router
│   ├── layout.tsx                 ✅
│   ├── page.tsx                   ✅ トップページ
│   ├── globals.css                ✅
│   ├── [slug]/                    ✅ 構造のみ
│   ├── tag/[slug]/                ✅ 構造のみ
│   └── admin/                     ✅ 構造のみ
├── components/
│   ├── layout/
│   │   ├── Header.tsx             ✅
│   │   ├── Footer.tsx             ✅
│   │   └── Navigation.tsx         ✅
│   ├── posts/                     ⬜ Phase 5
│   ├── admin/                     ⬜ Phase 6
│   └── ui/                        ⬜ Phase 5
├── lib/
│   ├── db/
│   │   ├── schema.ts              ✅ Phase 3
│   │   ├── client.ts              ⬜ Phase 5
│   │   └── queries.ts             ⬜ Phase 5
│   ├── auth/
│   │   └── config.ts              ⬜ Phase 6
│   ├── r2/
│   │   └── client.ts              ⬜ Phase 7
│   └── utils/
│       └── image-loader.ts        ✅
├── scripts/
│   ├── extract-ghost-data.js      ✅ Phase 1
│   ├── convert-mobiledoc.js       ✅ Phase 2
│   ├── update-image-urls.js       ✅ Phase 2
│   ├── upload-to-r2.js            ⬜ Phase 7
│   └── seed-d1.js                 ✅ Phase 3
├── drizzle/
│   └── migrations/                ✅ Phase 3
├── migration-data/
│   ├── posts-final.json           ✅
│   ├── tags.json, etc.            ✅
│   ├── CONVERSION_REPORT.md       ✅ Phase 2
│   ├── PHASE3_D1_SETUP.md         ✅ Phase 3
│   ├── PHASE4_NEXTJS_SETUP.md     ✅ Phase 4
│   └── PHASE_PROGRESS.md          ✅ 本ファイル
├── next.config.ts                 ✅ Phase 4
├── tailwind.config.ts             ✅ Phase 4
├── tsconfig.json                  ✅ Phase 4
├── wrangler.toml                  ✅ Phase 3
├── drizzle.config.ts              ✅ Phase 3
└── package.json                   ✅ 全Phase
```

---

## 🚀 次のアクション

### Phase 5 開始前の準備

1. **D1データベース作成（Phase 3の続き）**
   ```bash
   npx wrangler login
   npx wrangler d1 create monogs-db
   # wrangler.tomlのdatabase_idを更新
   npm run db:migrate:local
   npm run db:seed:local
   ```

2. **開発サーバー確認**
   ```bash
   npm run dev
   # → http://localhost:3000
   ```

3. **Phase 5 開始**
   - D1クライアント実装
   - データ取得クエリ実装
   - 記事表示コンポーネント実装

---

## 📋 リファレンス

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [NextAuth.js v5](https://authjs.dev/)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
- [参照サイト: Tetra Archives](https://borderhub.github.io/tetra-archives/)
