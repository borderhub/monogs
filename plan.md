# Ghost to Next.js (Cloudflare) 移行計画書

## 概要

Ghost CMS で運用中の monogs.net を **Next.js (App Router) + Cloudflare Pages/D1/R2** 構成に移行する。
管理画面は NextAuth.js による認証で保護し、記事データは Cloudflare D1、画像は R2 から配信する。

---

## 1. Spec（仕様）

### 1.1 完成時の状態

移行完了後の monogs.net は、Cloudflare のエッジネットワーク上で動作する高速な静的サイト生成（ISR/SSG）対応の Next.js アプリケーションとなる。既存の Ghost で管理していた 61 件の公開記事、25 件の画像ファイル、16 種類のタグは全て新環境に移行され、過去の URL 構造（`/slug` 形式）を維持したまま、SEO の継続性を確保する。

### 1.2 エンドユーザー視点

- **トップページ**: 最新記事一覧がカード形式で表示される（参照サイトの UI/UX を踏襲）
- **記事詳細**: Markdown/HTML でレンダリングされた記事本文、OGP 対応、関連タグ表示
- **タグページ**: `/tag/{slug}` でタグ別記事一覧を閲覧可能
- **ナビゲーション**: Home / Biography / Exhibition / Works / Music / tips / diary / Links
- **レスポンシブ**: モバイル・タブレット・デスクトップ対応（Tailwind CSS）
- **高速表示**: Cloudflare CDN + Edge Runtime による低レイテンシ配信

### 1.3 管理者（編集者）視点

```
[ブラウザ] → [/admin] → [NextAuth認証] → [管理画面]
                                              ↓
                            [Markdown エディタ + 画像アップローダー]
                                              ↓
                            [API Routes] → [Cloudflare D1 (記事)]
                                        → [Cloudflare R2 (画像)]
```

- **ログイン**: NextAuth.js (Credentials Provider) でメールアドレス/パスワード認証
- **記事管理**: 新規作成 / 編集 / 削除 / 下書き保存 / 公開
- **画像管理**: R2 への直接アップロード、記事への埋め込み
- **タグ管理**: タグの追加・編集・削除

---

## 2. Plan（アプローチ）

### 2.1 技術スタック

| カテゴリ | 技術選定 | 理由 |
|---------|---------|------|
| **フレームワーク** | Next.js 16 (App Router) | 最新の React Server Components、Turbopack 安定版、Edge Runtime 対応 |
| **スタイリング** | Tailwind CSS v4 | ユーティリティファースト、参照サイトと同様 |
| **ORM** | Drizzle ORM | D1 ネイティブ対応、型安全、軽量 |
| **認証** | NextAuth.js v5 (Auth.js) | Cloudflare 対応、Credentials Provider |
| **データベース** | Cloudflare D1 | SQLite 互換、Edge Runtime、無料枠あり |
| **画像ストレージ** | Cloudflare R2 | S3 互換 API、無料の帯域幅 |
| **デプロイ** | Cloudflare Pages | @opennextjs/cloudflare による最適化 |
| **Markdown** | unified + remark + rehype | Ghost の mobiledoc から変換 |

### 2.2 アーキテクチャ設計

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Next.js App Router                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ Public Pages │  │  Admin Pages │  │ API Routes │  │   │
│  │  │  (SSG/ISR)   │  │  (Protected) │  │  (Edge)    │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│              ┌────────────┼────────────┐                    │
│              ▼            ▼            ▼                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Cloudflare D1│  │ Cloudflare R2│  │   NextAuth   │      │
│  │  (Articles)  │  │   (Images)   │  │  (Sessions)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    外部 VPS (既存)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Dovecot メールサーバー                    │   │
│  │              mail.monogs.net (DNS Only)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Ghost → D1/R2 データ移行戦略

#### Phase 1: データ抽出
```bash
# Ghost SQLite からデータを JSON/Markdown に抽出
node scripts/extract-ghost-data.js \
  --db ../ghost/content/data/ghost-dev.db \
  --output ./migration-data/
```

#### Phase 2: データ変換
- `mobiledoc` → Markdown/HTML 変換（Ghost 独自形式の解析）
- 画像パス `/content/images/*` → R2 URL への置換
- 日付形式・スラッグの正規化

#### Phase 3: D1 シード
```bash
# Drizzle ORM でスキーマ作成 & シード
npx drizzle-kit push:d1
node scripts/seed-d1.js --input ./migration-data/
```

#### Phase 4: R2 アップロード
```bash
# wrangler で画像を R2 にアップロード
node scripts/upload-to-r2.js \
  --source ../ghost/content/images/ \
  --bucket monogs-images
```

### 2.4 なぜこの設計を選ぶのか

1. **Cloudflare D1**: Ghost の SQLite と互換性があり、移行が容易。Edge Runtime でのクエリが高速。
2. **Drizzle ORM**: D1 公式サポート、TypeScript 型安全、マイグレーション管理が簡潔。
3. **R2**: S3 互換で既存ツールが使える。帯域課金なしで画像配信に最適。
4. **NextAuth.js**: Edge Runtime 対応、D1 をセッションストアに使用可能。
5. **@opennextjs/cloudflare**: Next.js の全機能を Cloudflare で動作させる公式サポート。

---

## 3. Tasks（タスクリスト）

### Phase 0: 環境構築（前提なし）

- [ ] **T0-1**: Next.js プロジェクト初期化 (`npx create-next-app@latest`)
- [ ] **T0-2**: Tailwind CSS v4 セットアップ
- [ ] **T0-3**: Cloudflare アカウント・wrangler CLI セットアップ
- [ ] **T0-4**: D1 データベース作成 (`wrangler d1 create monogs-db`)
- [ ] **T0-5**: R2 バケット作成 (`wrangler r2 bucket create monogs-images`)
- [ ] **T0-6**: Drizzle ORM セットアップ & スキーマ定義

### Phase 1: データ移行スクリプト作成（T0 完了後）

- [ ] **T1-1**: Ghost SQLite → JSON 抽出スクリプト (`scripts/extract-ghost-data.js`)
  - posts テーブル: id, slug, title, mobiledoc, html, feature_image, status, published_at, meta_*
  - tags テーブル: id, name, slug, description
  - posts_tags テーブル: リレーション
  - users テーブル: id, name, email, bio
  - settings テーブル: navigation, title, description
- [ ] **T1-2**: mobiledoc → Markdown/HTML 変換ロジック実装
- [ ] **T1-3**: 画像パス `/content/images/*` → R2 URL 置換ロジック
- [ ] **T1-4**: D1 シードスクリプト (`scripts/seed-d1.js`)
- [ ] **T1-5**: R2 アップロードスクリプト (`scripts/upload-to-r2.js`)
- [ ] **T1-6**: 移行データ検証スクリプト（記事数・画像数の整合性チェック）

### Phase 2: 公開サイト（フロントエンド）構築（T0, T1-4 完了後）

- [ ] **T2-1**: レイアウトコンポーネント（Header, Footer, Navigation）
- [ ] **T2-2**: トップページ（記事一覧カード、ページネーション）
- [ ] **T2-3**: 記事詳細ページ (`/[slug]`)
- [ ] **T2-4**: タグ一覧・タグ別記事ページ (`/tag/[slug]`)
- [ ] **T2-5**: 静的ページ（Biography, Links）
- [ ] **T2-6**: 検索機能（オプション）
- [ ] **T2-7**: next/image カスタムローダー（R2 配信用）
- [ ] **T2-8**: OGP / メタデータ動的生成
- [ ] **T2-9**: sitemap.xml / robots.txt 生成
- [ ] **T2-10**: RSS フィード生成

### Phase 3: 管理画面構築（T0, T1 完了後）

- [ ] **T3-1**: NextAuth.js セットアップ（Credentials Provider）
- [ ] **T3-2**: 管理者ユーザー認証ロジック（D1 連携）
- [ ] **T3-3**: 管理画面レイアウト (`/admin/*`)
- [ ] **T3-4**: 記事一覧・編集 CRUD API (`/api/admin/posts/*`)
- [ ] **T3-5**: Markdown エディタ実装（react-markdown-editor-lite 等）
- [ ] **T3-6**: 画像アップローダー（R2 直接アップロード）
- [ ] **T3-7**: タグ管理 CRUD
- [ ] **T3-8**: 下書き / 公開 / 非公開ワークフロー
- [ ] **T3-9**: 管理画面 UI/UX 最終調整

### Phase 4: Cloudflare デプロイ設定（T2, T3 完了後）

- [ ] **T4-1**: `@opennextjs/cloudflare` 設定
- [ ] **T4-2**: `wrangler.toml` 設定（D1, R2 バインディング）
- [ ] **T4-3**: 環境変数設定（`NEXTAUTH_SECRET`, `DATABASE_URL` 等）
- [ ] **T4-4**: Cloudflare Pages プロジェクト作成・連携
- [ ] **T4-5**: ステージング環境デプロイ・動作確認
- [ ] **T4-6**: R2 カスタムドメイン設定（`images.monogs.net` 等）

### Phase 5: URL 互換・リダイレクト設定（T4 完了後）

- [ ] **T5-1**: 旧 URL → 新 URL マッピング調査
- [ ] **T5-2**: `next.config.js` リダイレクト設定
- [ ] **T5-3**: Cloudflare Redirect Rules 設定（必要に応じて）
- [ ] **T5-4**: 画像 URL リダイレクト（`/content/images/*` → R2）

### Phase 6: DNS・メール設定（T4 完了後）

- [ ] **T6-1**: 現行 DNS レコード一覧取得・記録
- [ ] **T6-2**: Cloudflare DNS ゾーン設定
- [ ] **T6-3**: メール関連レコード設定（MX, SPF, DKIM, DMARC）- **DNS Only**
- [ ] **T6-4**: mail.monogs.net A レコード（VPS IP）- **DNS Only**
- [ ] **T6-5**: monogs.net A/AAAA レコード（Cloudflare プロキシ）
- [ ] **T6-6**: SSL/TLS 設定（Full (strict) 推奨）
- [ ] **T6-7**: メール送受信テスト

### Phase 7: 本番切替・検証（T5, T6 完了後）

- [ ] **T7-1**: 全記事表示テスト
- [ ] **T7-2**: 全画像表示テスト
- [ ] **T7-3**: 管理画面 CRUD テスト
- [ ] **T7-4**: SEO チェック（OGP, sitemap, robots）
- [ ] **T7-5**: パフォーマンステスト（Lighthouse）
- [ ] **T7-6**: 本番ドメイン切替
- [ ] **T7-7**: 旧環境バックアップ保存

### Phase 8: ロールバック手順（常時準備）

- [ ] **T8-1**: ロールバック手順書作成
- [ ] **T8-2**: DNS 切り戻し手順（Cloudflare → 旧サーバー）
- [ ] **T8-3**: Ghost 環境復旧手順

---

## 4. Context（コンテキスト）

### 4.1 Ghost 側ディレクトリ構成

```
ghost/
├── content/
│   ├── data/
│   │   └── ghost-dev.db          # SQLite DB（移行対象）
│   ├── images/
│   │   └── 2019/01/              # 画像ファイル（25件）
│   ├── themes/
│   │   ├── casper/               # デフォルトテーマ
│   │   └── editorial-master/     # カスタムテーマ
│   └── settings/
├── core/                         # Ghost コアロジック（参照のみ）
└── package.json
```

### 4.2 SQLite 主要テーブル構造

#### posts テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| id | varchar(24) | プライマリキー |
| uuid | varchar(36) | 一意識別子 |
| title | varchar(2000) | 記事タイトル |
| slug | varchar(191) | URL スラッグ（ユニーク） |
| mobiledoc | text | Ghost 独自形式の記事データ |
| html | text | レンダリング済み HTML |
| feature_image | varchar(2000) | サムネイル画像パス |
| status | varchar(50) | draft / published |
| published_at | datetime | 公開日時 |
| meta_title | varchar(2000) | SEO タイトル |
| meta_description | varchar(2000) | SEO 説明 |
| og_image, twitter_image | varchar(2000) | SNS 用画像 |

**統計**: 62 件（公開: 61, 下書き: 1）

#### tags テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| id | varchar(24) | プライマリキー |
| name | varchar(191) | タグ名 |
| slug | varchar(191) | URL スラッグ（ユニーク） |
| description | text | タグ説明 |

**統計**: 16 件（diary, exhibition, works, music, tips, art, trip 等）

#### users テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| id | varchar(24) | プライマリキー |
| name | varchar(191) | ユーザー名 |
| email | varchar(191) | メールアドレス（ユニーク） |
| password | varchar(60) | bcrypt ハッシュ |
| bio | text | 自己紹介 |

**統計**: 2 件（monogs, Ghost）

#### posts_tags テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| post_id | varchar(24) | FK → posts.id |
| tag_id | varchar(24) | FK → tags.id |
| sort_order | integer | 表示順 |

#### settings テーブル（重要な値）
| key | value |
|-----|-------|
| title | monogs web site |
| description | monogs works and art project |
| navigation | [{"label":"Home","url":"https://monogs.net"}, ...] |
| logo | /content/images/2019/01/...png |

### 4.3 Next.js 想定ディレクトリ構成

```
monogs/
├── app/
│   ├── layout.tsx                # ルートレイアウト
│   ├── page.tsx                  # トップページ（記事一覧）
│   ├── [slug]/
│   │   └── page.tsx              # 記事詳細
│   ├── tag/
│   │   └── [slug]/
│   │       └── page.tsx          # タグ別一覧
│   ├── admin/
│   │   ├── layout.tsx            # 管理画面レイアウト（認証ガード）
│   │   ├── page.tsx              # ダッシュボード
│   │   ├── posts/
│   │   │   ├── page.tsx          # 記事一覧
│   │   │   ├── new/page.tsx      # 新規作成
│   │   │   └── [id]/edit/page.tsx # 編集
│   │   └── tags/page.tsx         # タグ管理
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── admin/
│   │       ├── posts/route.ts    # CRUD API
│   │       ├── posts/[id]/route.ts
│   │       ├── tags/route.ts
│   │       └── upload/route.ts   # R2 アップロード
│   ├── sitemap.ts                # 動的 sitemap
│   ├── robots.ts                 # robots.txt
│   └── feed.xml/route.ts         # RSS フィード
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   ├── posts/
│   │   ├── PostCard.tsx
│   │   ├── PostList.tsx
│   │   └── PostContent.tsx
│   ├── admin/
│   │   ├── MarkdownEditor.tsx
│   │   └── ImageUploader.tsx
│   └── ui/                       # 共通 UI コンポーネント
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Drizzle スキーマ
│   │   ├── client.ts             # D1 クライアント
│   │   └── queries.ts            # クエリ関数
│   ├── auth/
│   │   └── config.ts             # NextAuth 設定
│   ├── r2/
│   │   └── client.ts             # R2 クライアント
│   └── utils/
│       ├── markdown.ts           # Markdown パーサー
│       └── image-loader.ts       # next/image ローダー
├── scripts/
│   ├── extract-ghost-data.js     # Ghost データ抽出
│   ├── seed-d1.js                # D1 シード
│   └── upload-to-r2.js           # R2 アップロード
├── drizzle/
│   └── migrations/               # マイグレーションファイル
├── public/
│   └── favicon.ico
├── wrangler.toml                 # Cloudflare 設定
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
└── package.json
```

---

## 5. Risks & Considerations

### 5.1 Ghost 特有機能の喪失と代替案

| Ghost 機能 | 状況 | 代替案 |
|-----------|------|--------|
| `{{ghost_head}}` | 使用不可 | Next.js `<head>` / Metadata API で再実装 |
| `{{ghost_foot}}` | 使用不可 | カスタムスクリプトをレイアウトに配置 |
| mobiledoc エディタ | 使用不可 | Markdown エディタ + HTML プレビュー |
| メンバーシップ機能 | 使用不可 | 今回の要件外（必要時は別途実装） |
| ニュースレター | 使用不可 | 今回の要件外 |
| 画像最適化 | Ghost 内蔵 | next/image + R2 カスタムローダー |

### 5.2 SQLite → D1 移行時の注意点

| リスク | 対策 |
|--------|------|
| データ型の不一致 | Drizzle スキーマで明示的に型定義、移行スクリプトでバリデーション |
| 文字エンコーディング | UTF-8 で統一、特殊文字のエスケープ確認 |
| NULL 値の扱い | スキーマで NULL 許容を明示、デフォルト値設定 |
| 日付形式 | ISO 8601 形式に正規化 |
| ID 形式 | Ghost の varchar(24) を維持 or UUID に変換（一貫性重視で維持推奨） |
| mobiledoc 解析失敗 | フォールバックとして html カラムを使用 |

### 5.3 Cloudflare 無料枠の制限

| サービス | 無料枠 | 想定使用量 | 対策 |
|---------|-------|-----------|------|
| **D1** | 5GB ストレージ, 5M 行読取/日 | 62 記事 ≈ 1MB | 十分余裕あり |
| **R2** | 10GB ストレージ, 10M リクエスト/月 | 25 画像 ≈ 50MB | 十分余裕あり |
| **Pages** | 500 ビルド/月, 無制限リクエスト | - | 十分余裕あり |
| **Workers** | 100K リクエスト/日 | 管理画面 API | 十分余裕あり |

**注意**: 画像が増加した場合、R2 ストレージの監視が必要。

### 5.4 メールサーバー（VPS）との共存リスク

| リスク | 対策 |
|--------|------|
| MX レコードのプロキシ化 | **絶対禁止**: MX レコードは必ず DNS Only（グレークラウド） |
| mail.monogs.net の Cloudflare 経由 | A レコードを DNS Only に設定 |
| SPF/DKIM の伝播遅延 | TTL を短く設定（300秒）、移行前に事前設定 |
| VPS IP 変更時の更新漏れ | ドキュメント化、定期確認 |
| DMARC ポリシー設定ミス | p=none から始め、段階的に p=quarantine → p=reject |

### 5.5 SEO・URL 互換性リスク

| リスク | 対策 |
|--------|------|
| URL 構造変更による 404 | Ghost の `/slug` 形式を維持、変更がある場合は 301 リダイレクト |
| OGP 欠落 | Metadata API で動的生成、og:image は R2 URL を使用 |
| sitemap.xml 欠落 | Next.js の sitemap.ts で動的生成 |
| robots.txt 欠落 | Next.js の robots.ts で生成 |
| インデックス喪失 | Google Search Console で移行通知、新 sitemap 送信 |

### 5.6 その他の考慮事項

- **ロールバック時間**: DNS TTL に依存（300秒設定推奨）
- **データロスリスク**: 移行前に Ghost DB とローカルファイルの完全バックアップ必須
- **管理者パスワード**: Ghost のパスワードハッシュ（bcrypt）は NextAuth でそのまま使用可能
- **セッション管理**: Edge Runtime での NextAuth セッションは D1 または Cookie ベースで実装

---

## 6. 受け入れ基準（再掲）

以下をすべて満たしたときに **移行完了とすること**：

- [ ] 記事一覧・記事詳細が https://monogs.net で表示される
- [ ] 過去の画像がすべて R2 から正常に配信される
- [ ] 管理画面（/admin）にログインし、D1 に対して記事の新規作成・更新・削除が可能
- [ ] メール送受信が既存 VPS 経由で正常に行える（DNS 設定が正しい）
- [ ] 旧 URL からのアクセスが新 URL に正しくリダイレクトされる
- [ ] Lighthouse パフォーマンススコア 90 以上

---

## 付録: 参照リンク

- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare/get-started)
- [Drizzle ORM + D1](https://orm.drizzle.team/docs/get-started-cloudflare-d1)
- [NextAuth.js Edge Compatibility](https://authjs.dev/getting-started/deployment#edge-compatibility)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [参照サイト: Tetra Archives](https://borderhub.github.io/tetra-archives/)
