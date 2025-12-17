# さくらVPS + Ghostを捨ててNext.js + Cloudflareへ！AI駆動開発で生まれ変わった個人サイトの全貌

### Slug
migrate-ghost-to-cloudflare

## 抜粋
さくらVPS + Ghostで5年運用した個人サイトを、Next.js + Cloudflare Workersに完全移行しました！

## はじめに

個人サイトを運営していると、いつかは「このままでいいのだろうか」と思う瞬間が訪れます。私の場合、それは7年以上運営してきたさくらVPS上のGhost CMSが、徐々に重荷になってきたときでした。

そして2025年末、**Next.js + Cloudflare**という完全にモダンなスタックへの移行を決意しました。しかも今回は、話題の**Claude Code**を使ったAI駆動開発に初挑戦。結果として、想像以上にスムーズな移行を実現できました。

この記事では、移行の全プロセスと得られた知見を共有します。

タイムリーに[React2Shell「CVE-2025-55182」の分析、PoCを巡る混乱と悪用の広がり](https://www.trendmicro.com/ja_jp/research/25/l/cve-2025-55182-analysis-poc-itw.html)の問題が噴出したのもあり、NextのRSCの脆弱性についても色々と勉強しながらも、今回はリスクを受け入れつつも移行を進めました。

## 移行前の環境と課題

### さくらVPS + Ghost CMSの限界

移行前の環境は以下の通りでした：

- **サーバー**: さくらVPS 2GBプラン（月額約1700円）
- **CMS**: Ghost CMS（セルフホスト）
- **データベース**: MySQL
- **リバースプロキシ**: Nginx
- **SSL**: Let's Encrypt

一見シンプルな構成ですが、7年の運用で様々な問題が蓄積していました：

1. **VPS管理の負荷**: セキュリティアップデート、SSL証明書の更新、ディスク容量の監視...。本業の片手間でやるには重すぎる。

2. **Ghostのバージョンアップ問題**: メジャーバージョンアップのたびにデータベースマイグレーションでヒヤヒヤ。一度は失敗してバックアップから復元した苦い経験も。

3. **カスタマイズの制約**: Ghostのテーマシステムは優秀だが、本当にやりたいことをやろうとするとHandlebarsの限界にぶつかる。

## 新しい技術選定とその理由

### フロントエンド: Next.js（App Router）

フレームワーク選定で最も悩んだポイントです。候補は以下でした：

- **Astro**: 静的サイトに強い。ブログには最適解かも。
- **Next.js**: フルスタック。機能が豊富すぎるかも？
- **Remix**: Cloudflareとの相性が良い。

最終的に**Next.js**を選んだ理由：

1. **App Routerの完成度**: React Server Componentsによるパフォーマンス最適化が魅力的。
2. **将来の拡張性**: 単なるブログから、ポートフォリオや作品展示へ拡張する可能性を考慮。
3. **エコシステムの豊富さ**: 困ったときに情報が見つかりやすい。
4. **ISR（Incremental Static Regeneration）**: 静的生成の高速さと、動的コンテンツの柔軟性を両立。

### ホスティング: Cloudflare Pages → Workers

当初はCloudflare Pagesを予定していましたが、最終的には**Cloudflare Workers**を選択しました。

```
構成の変遷:
Cloudflare Pages → Cloudflare Workers（@opennextjs/cloudflare使用）
```

理由は以下の通り：

1. **D1データベースとの統合**: SQLiteベースのエッジデータベース「D1」を使うことで、外部DBへの依存を排除。
2. **R2ストレージ**: 画像をR2に保存し、カスタムドメイン（images.monogs.net）で配信。
3. **無料枠の太っ腹さ**: Workers無料枠は1日10万リクエスト。個人サイトには十分すぎる。Workersに関しては$5のPaidプランに入ってます
4. **グローバルCDN**: 世界中のエッジで動作するため、どこからアクセスしても高速。

### データベース: Cloudflare D1

Ghost CMSのMySQLから、Cloudflare D1（SQLite互換）への移行を決断しました。

```typescript
// Drizzle ORMでスキーマ定義
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content'),  // Markdown
  html: text('html'),        // 変換後HTML
  featureImage: text('feature_image'),
  status: text('status').default('draft'),
  publishedAt: text('published_at'),
  // ...
});
```

**選定理由**：

- ローカル開発ではSQLite、本番ではD1と、シームレスに切り替え可能
- Drizzle ORMによる型安全なクエリ
- エッジで動作するため、データベースアクセスも高速

### AI駆動開発: Claude Code

今回の移行で最も革新的だったのが、**Claude Code**の導入です。

正直に言うと、最初は懐疑的でした。「AIにコードを書かせる？品質は大丈夫なのか？」と。

しかし実際に使ってみると、その生産性の高さに驚きました。

#### Claude Codeが特に活躍したシーン

**1. データ移行スクリプトの生成**

GhostのJSONエクスポートをD1用のSQLに変換するスクリプト。手作業なら数時間かかる作業が、30分で完成。

```javascript
// Claude Codeが生成した移行スクリプトの一部
async function convertGhostToD1(ghostData) {
  const posts = ghostData.db[0].data.posts;

  for (const post of posts) {
    // Mobiledoc形式をMarkdown/HTMLに変換
    const content = convertMobiledoc(post.mobiledoc);

    await db.insert(postsTable).values({
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: content.markdown,
      html: content.html,
      // ...
    });
  }
}
```

**2. 型定義の自動生成**

Drizzle ORMのスキーマから、フロントエンド用の型定義を自動生成。型安全性を保ちながら開発速度を維持できました。

**3. コンポーネントの雛形生成**

「記事一覧をグリッド表示するコンポーネントを作って」と依頼するだけで、レスポンシブ対応のコンポーネントが生成される。

```tsx
// Claude Codeが生成したPostCardコンポーネント
export default function PostCard({ post }: { post: PostWithTags }) {
  const imageUrl = getImageUrl(post.featureImage);

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden">
      <Link href={`/${post.slug}`}>
        {imageUrl && (
          <div className="aspect-video relative">
            <Image src={imageUrl} alt={post.title} fill className="object-cover" />
          </div>
        )}
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
          {post.tags?.map((tag) => (
            <span key={tag.id} className="px-2 py-1 text-xs bg-gray-200 rounded">
              {tag.name}
            </span>
          ))}
        </div>
      </Link>
    </article>
  );
}
```

**4. デバッグとリファクタリング**

「この関数、タグがない記事も除外したい」と伝えると、既存のコードを理解した上で適切な修正を提案してくれる。

```typescript
// Before: 除外タグのみフィルタリング
return posts.filter(post => !excludedPostIds.has(post.id));

// After: タグなし記事も除外（Claude Codeの提案）
return posts.filter(post =>
  postsWithTags.has(post.id) && !excludedPostIds.has(post.id)
);
```

## 移行プロセスと技術的課題

### Phase 1: コンテンツのエクスポートと変換

Ghostからのデータ移行は、予想以上に複雑でした。

**課題1: Mobiledoc形式の変換**

Ghostは記事をMobiledoc（独自のJSON形式）で保存しています。これをMarkdownとHTMLに変換する必要がありました。

```json
// Mobiledocの構造（一部）
{
  "version": "0.3.1",
  "atoms": [],
  "cards": [["image", { "src": "...", "caption": "..." }]],
  "markups": [["strong"], ["a", ["href", "..."]]],
  "sections": [[1, "p", [[0, [], 0, "テキスト"]]]]
}
```

Claude Codeに「Mobiledocをパースしてmarkdownに変換するスクリプトを作って」と依頼。数回のやり取りで、画像カードやギャラリーカードにも対応した変換スクリプトが完成しました。

**課題2: 画像パスの変換**

Ghost内の画像パス（`/content/images/2023/01/photo.jpg`）を、R2のカスタムドメイン（`https://images.monogs.net/content/images/...`）に変換する必要がありました。

```typescript
// 画像URL変換ユーティリティ
export function getImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;

  const baseUrl = process.env.NEXT_PUBLIC_IMAGES_URL || 'https://images.monogs.net';
  return `${baseUrl}${path}`;
}
```

### Phase 2: Next.jsアプリケーションの構築

**課題3: 動的ルーティングとSSG**

記事ページ（`/[slug]`）の実装で、generateStaticParamsとの組み合わせに苦戦しました。

```typescript
// app/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;  // Next.js 15ではparamsがPromiseに
  const post = await getPostBySlug(slug);

  if (!post) return notFound();

  return <Article post={post} />;
}
```

**ハマりポイント**: Next.js 15からparamsがPromiseになった変更に気づかず、しばらく悩みました。Claude Codeが最新のドキュメントを参照して解決策を提示してくれました。

**課題4: Cloudflare Workers環境での環境変数**

ローカル開発と本番環境で、環境変数の扱いが異なる問題に直面しました。

```typescript
// next.config.ts
const isProduction = process.env.NODE_ENV !== 'development';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_IMAGES_URL: isProduction
      ? 'https://xxxxx.monogs.net'
      : 'http://localhost:9000/xxxxxx',
  },
  // ...
};
```

Workers環境では`getCloudflareContext()`を使って環境変数にアクセスする必要があり、この切り分けに工夫が必要でした。

### Phase 3: Cloudflareへのデプロイ

**課題5: OpenNextの設定**

Next.jsをCloudflare Workersで動かすために、`@opennextjs/cloudflare`を使用しました。

```toml
# wrangler.toml
[env.production]
name = "xxxxxxxx"
compatibility_date = "2025-12-17"
compatibility_flags = ["nodejs_compat"]

[[env.production.d1_databases]]
binding = "DB"
database_name = "xxxxxxxx"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[env.production.r2_buckets]]
[[env.production.routes]]
```

**ハマりポイント**: カスタムドメインの設定で、既存のDNS Aレコードとの競合が発生。Cloudflareダッシュボードで手動削除が必要でした。

## 移行の結果と得られたメリット

### パフォーマンスの劇的な向上

**Lighthouseスコアの比較**:

| 指標 | 移行前（Ghost） | 移行後（Next.js） |
|------|----------------|------------------|
| Performance | 67 | 98 |
| Accessibility | 82 | 100 |
| Best Practices | 75 | 100 |
| SEO | 91 | 100 |

**体感速度**:

- ページ読み込み: 2.5秒 → 0.3秒
- TTFB（最初のバイトまでの時間）: 800ms → 50ms

エッジで動作するCloudflare Workersの威力を実感しました。

### コストの大幅削減

| 項目 | 移行前 | 移行後 |
|------|--------|--------|
| サーバー（さくらVPS） | ¥1700/月 | ¥600/月 |
| ドメイン | ¥1,500/年 | ¥1,500/年 |
| SSL証明書 | 無料（Let's Encrypt） | 無料（Cloudflare） |
| **合計** | **約¥22,000/年** | **約¥1,0000/年** |

月額コストがほぼゼロになりました。Cloudflareの無料枠で十分収まっています。

### 開発体験の向上

Claude Codeとのペアプログラミングにより、開発速度が体感で3倍以上に向上しました。

**特に効果が大きかった場面**:

- ボイラープレートコードの生成
- 型定義の作成と更新
- バグの原因特定とデバッグ
- リファクタリングの提案

**印象的だったエピソード**:

「モバイルで横スクロールが発生している」という問題を報告すると、Claude Codeが自発的に関連するCSSファイルを調査し、原因を特定。さらに、同様の問題が発生しそうな他の箇所も併せて修正してくれました。

## まとめと今後の展望

### 移行を検討している人へ

正直に言うと、移行は楽ではありませんでした。特にデータ変換とCloudflare特有の設定には苦労しました。

しかし、得られるメリットを考えると、**やる価値は十分にありました**。

**移行を検討する際のアドバイス**:

1. **バックアップは入念に**: 移行前のデータは複数の場所に保存しておく。
2. **段階的に進める**: いきなり本番切り替えではなく、プレビュー環境で十分にテストする。
3. **AIツールを活用する**: Claude Codeのようなツールは、移行作業の強力な味方になる。
4. **完璧を求めすぎない**: 80%の完成度で公開し、残りは運用しながら改善する。

### 今後試したいこと

- **Cloudflare Workers AI**: 記事の要約や関連記事の提案にAIを活用
- **Cloudflare Images**: 画像の自動最適化とリサイズ
- **全文検索の改善**: D1 + FTSまたはAlgoliaの導入
- **PWA対応**: オフラインでも記事が読めるように

---

7年間お世話になったGhost CMSとさくらVPSには感謝しています。

**「今のままでいいのか？」と思ったら、それが変化のサイン**かもしれません。

この記事が、同じような悩みを持つ方の参考になれば幸いです。
