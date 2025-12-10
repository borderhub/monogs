# Ghost データ変換レポート

生成日時: 2025-12-07 02:09

---

## Phase 1: データ抽出

**ステータス**: ✅ 完了

### 統計
- **記事数**: 62 件 (公開: 61, 下書き: 1)
- **タグ数**: 16 件
- **ユーザー数**: 2 件
- **設定項目**: 6 件
- **画像パス**: 270 件

### 出力ファイル
- `posts.json` (1.8MB) - 全記事データ（mobiledoc含む）
- `tags.json` (2.4KB) - タグ情報
- `posts_tags.json` (21KB) - 記事-タグリレーション
- `users.json` (842B) - ユーザー情報
- `settings.json` (770B) - サイト設定
- `image-mapping.json` (15KB) - 画像パスマッピング（270件）

---

## Phase 2: データ変換

**ステータス**: ✅ 完了

### 2-1. mobiledoc → Markdown/HTML 変換

**実行コマンド**:
```bash
node scripts/convert-mobiledoc.js \
  --input ./migration-data/posts.json \
  --output ./migration-data/posts-converted.json
```

**結果**:
- ✅ 正常変換: **62 件**
- ⚠️ フォールバック: **0 件**
- ❌ 空コンテンツ: **0 件**

**出力ファイル**:
- `posts-converted.json` (924KB)

**⚠️ 注意事項**:
- **"gallery" カードタイプが未対応** （37回出現）
  - 現在のスクリプトでは処理されていない
  - 今後の対応が必要

### 2-2. 画像URL置換 & データ正規化

**実行コマンド**:
```bash
node scripts/update-image-urls.js \
  --posts ./migration-data/posts-converted.json \
  --mapping ./migration-data/image-mapping.json \
  --output ./migration-data/posts-final.json
```

**結果**:
- ✅ 日付の正規化: ISO 8601形式に変換
  - 例: `2025-10-17 05:37:06` → `2025-10-16T20:37:06.000Z`
- ✅ スラッグの正規化: 小文字化、特殊文字除去
- ⚠️ 画像URL置換: **0 件**（R2アップロード前のため）

**出力ファイル**:
- `posts-final.json` (924KB)

---

## 変換されたデータのサンプル

### 記事構造
```json
{
  "id": "68f1d4b20dc951394b097657",
  "uuid": "d7fe0b38-93a3-49da-9201-740414b2dbb3",
  "title": "場に宿る夢 -記憶の舟にのる-\\nツリーリングス・ドローイング",
  "slug": "chang-nisu-rumeng-ji-yi-nozhou-ninoru-turiringusudoroingu",
  "content": "Markdown形式のコンテンツ...",
  "html": "<p>HTML形式のコンテンツ...</p>",
  "feature_image": "/content/images/2025/10/67b35e89.jpeg",
  "status": "published",
  "published_at": "2025-10-16T20:37:06.000Z",
  "created_at": "2025-10-16T20:31:30.000Z",
  "updated_at": "2025-10-16T20:40:54.000Z"
}
```

### タグ構造
```json
{
  "id": "5c3981f8b3790e3604fbdfd1",
  "name": "diary",
  "slug": "diary",
  "description": null
}
```

---

## 次のステップ

### 1. **gallery カードタイプのサポート追加** 🔧

**問題**: 37件の記事で "gallery" カードタイプが検出されたが、未対応

**対応方針**:
```javascript
// convert-mobiledoc.js に追加
case 'gallery':
  if (payload.images && Array.isArray(payload.images)) {
    payload.images.forEach((image, i) => {
      markdown += `![${image.caption || ''}](${image.src})\n`;
      if (image.caption) {
        markdown += `*${image.caption}*\n`;
      }
      markdown += '\n';
    });
  }
  break;
```

**実行**:
```bash
# スクリプト修正後、再変換
node scripts/convert-mobiledoc.js \
  --input ./migration-data/posts.json \
  --output ./migration-data/posts-converted.json
```

---

### 2. **R2 への画像アップロード** ☁️

**前提条件**:
```bash
# wrangler 認証
wrangler login

# R2 バケット作成
wrangler r2 bucket create monogs-images
```

**実行**:
```bash
node scripts/upload-to-r2.js \
  --source ../ghost/content/images/ \
  --bucket monogs-images \
  --mapping ./migration-data/image-mapping.json \
  --base-url https://images.monogs.net
```

**結果**: `image-mapping.json` が更新され、R2 URL が設定される

---

### 3. **画像URL再置換** 🔄

**R2 アップロード後に再実行**:
```bash
node scripts/update-image-urls.js \
  --posts ./migration-data/posts-converted.json \
  --mapping ./migration-data/image-mapping.json \
  --output ./migration-data/posts-final.json
```

**期待される結果**: 270件の画像URLが R2 URL に置換される

---

### 4. **D1 シードスクリプトの作成** 🗄️

**必要なタスク**:
- [ ] Drizzle スキーマ定義 (`lib/db/schema.ts`)
- [ ] D1 マイグレーション実行
- [ ] `scripts/seed-d1.js` の実装
- [ ] ローカルテスト
- [ ] 本番D1へシード

---

### 5. **Next.js プロジェクトのセットアップ** ⚛️

**実行予定**:
```bash
# Next.js 16 プロジェクト作成
npx create-next-app@latest

# 依存関係インストール
npm install drizzle-orm @cloudflare/next-on-pages
npm install next-auth tailwindcss
```

---

## まとめ

✅ **完了した作業**:
1. Ghost SQLite からデータ抽出 (62記事、16タグ、270画像)
2. mobiledoc → Markdown/HTML 変換
3. 日付・スラッグの正規化

⚠️ **要対応事項**:
1. gallery カードタイプのサポート（37件）
2. R2 への画像アップロード（270件）
3. 画像URLの置換（現在0件 → 270件に）

📋 **次フェーズ**:
- Phase 3: Cloudflare D1 シード
- Phase 4: Next.js プロジェクトセットアップ
- Phase 5: フロントエンド実装
