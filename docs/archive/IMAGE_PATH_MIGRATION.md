# 画像パス構造変更完了レポート

## 実施日
2025-12-10

## 変更概要

画像パスの構造を以下のように変更しました:

- **旧形式**: `/content/images/YYYY/MM/filename.ext`
- **新形式**: `/content/images/YYYY/MM/[slug]/filename.ext`
- **新形式（ギャラリー）**: `/content/images/YYYY/MM/[slug]/gallery/filename.ext`

## 実施した変更

### 1. アップロードAPI修正 (`app/api/upload/route.ts`)

- `postId` パラメータを `slug` パラメータに変更
- 新しいアップロードは記事のslugを含むパス構造で保存
- 後方互換性のため、slugがない場合は旧形式で保存

```typescript
// 変更前
const postId = formData.get('postId') as string;
key = `content/images/${year}/${month}/${postId}/${fileName}`;

// 変更後
const slug = formData.get('slug') as string;
key = `content/images/${year}/${month}/${slug}/${fileName}`;
```

### 2. 画像パスヘルパー関数作成 (`lib/utils/image-path.ts`)

新規作成した3つのヘルパー関数:

- `generateImagePath()` - 新旧両方の形式でパスを生成
- `parseImagePath()` - パスを解析して情報を抽出（年月、slug、形式判定）
- `migrateImagePath()` - 旧形式のパスを新形式に変換

### 3. 画像ローダー更新 (`lib/utils/image-loader.ts`)

- 新旧両方のパス形式に対応するコメントを追加
- パスの正規化処理を改善
- `/content/images/` で始まるパスを適切に処理

### 4. 画像ストレージ設定の修正

#### 問題の特定
- 既存の画像は `public/content/images/` に静的アセットとして存在
- ビルド時に `.open-next/assets/` にコピーされCloudflareから配信
- しかし `NEXT_PUBLIC_IMAGES_URL` がR2を指していたため画像が表示されない

#### 解決方法
`wrangler.toml` を修正:
```toml
# 既存の画像は静的アセットとして配信されるため、カスタムドメイン設定後に有効化
# NEXT_PUBLIC_IMAGES_URL = "https://images.monogs.net"
```

`next.config.ts` を修正:
```typescript
// Ghost CMSの画像パスをR2カスタムドメインにリダイレクト
// Note: カスタムドメイン設定(Phase 4-6)完了後に有効化
// {
//   source: '/content/images/:path*',
//   destination: 'https://images.monogs.net/:path*',
//   permanent: true,
// },
```

## 現在の画像配信構成

### Preview環境（本番環境）
- **既存画像**: Cloudflareの静的アセットとして配信
  - パス: `https://monogs.shirabegroup.workers.dev/content/images/...`
  - ソース: `.open-next/assets/content/images/`
  - 形式: 旧形式（slug なし）

- **新規アップロード**: R2バケットに保存
  - バケット: `monogs-r2-upload`
  - 形式: 新形式（slug あり）
  - 注意: Phase 4-6完了までアクセス不可

### ローカル環境
- **既存画像**: Next.jsの静的ファイル配信
  - パス: `http://localhost:3000/content/images/...`
  - ソース: `public/content/images/`

- **新規アップロード**: MinIOに保存
  - エンドポイント: `http://localhost:9000`
  - バケット: `monogs-images`
  - アクセス: `NEXT_PUBLIC_IMAGES_URL` 経由

## デプロイ状況

- **Preview URL**: https://monogs.shirabegroup.workers.dev
- **デプロイ日時**: 2025-12-10
- **Version ID**: 251fb4c0-21dd-406e-9852-4ed32c485e0e
- **静的アセット**: 367ファイル (13,783 KiB)
- **画像アクセス確認**: ✅ 正常（HTTP 200）

## 次のステップ（未完了タスク）

### Phase 4-6: R2カスタムドメイン設定

1. **Cloudflare R2カスタムドメインの設定**
   - `images.monogs.net` をR2バケットに接続
   - カスタムドメインの有効化

2. **設定ファイルの更新**
   ```toml
   # wrangler.toml
   NEXT_PUBLIC_IMAGES_URL = "https://images.monogs.net"
   ```

   ```typescript
   // next.config.ts
   {
     source: '/content/images/:path*',
     destination: 'https://images.monogs.net/:path*',
     permanent: true,
   }
   ```

3. **既存画像のR2への移行（オプション）**
   - `public/content/images/` の画像をR2にコピー
   - 一貫性と管理性の向上
   - スクリプト作成が必要

### Phase 6: DNS・メール設定
- DNS設定の移行
- メールレコード（MX, SPF, DKIM）の設定

## 注意事項

### 現在の制限事項
1. **新規アップロード画像**: Phase 4-6完了までpreview環境でアクセス不可
2. **ローカル環境**: MinIOサーバーが起動している必要あり
3. **既存画像**: 旧形式のままだが、後方互換性あり

### Phase 4-6完了後の動作
1. 既存画像も新規画像もR2から配信
2. カスタムドメイン経由でアクセス
3. 統一された画像配信インフラ

## 検証方法

### Preview環境での画像確認
```bash
curl -I https://monogs.shirabegroup.workers.dev/content/images/2025/08/open01.jpg
# 期待結果: HTTP/2 200, content-type: image/jpeg
```

### ローカル環境での画像確認
1. MinIOサーバー起動: `docker-compose up -d`
2. 開発サーバー起動: `npm run dev`
3. ブラウザで記事ページにアクセスして画像表示を確認

## まとめ

画像パス構造の変更を完了し、Preview環境で既存画像が正常に表示されるようになりました。新規アップロード機能はslugベースのパス構造に対応済みですが、Phase 4-6のカスタムドメイン設定完了後に完全に機能します。
