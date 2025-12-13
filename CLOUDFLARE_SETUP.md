# Cloudflare デプロイ設定ガイド

このドキュメントでは、monogsプロジェクトをCloudflare Pagesにデプロイするための設定手順を説明します。

## Phase 4完了状況

### ✅ 完了したタスク

- **T4-1**: @opennextjs/cloudflare設定
- **T4-2**: wrangler.toml設定（D1, R2バインディング）
- **T4-3**: 環境変数設定（NEXTAUTH_SECRET, DATABASE_URL等）
- **T4-4**: Cloudflare Pagesプロジェクト作成・連携
- **T4-5**: ステージング環境デプロイ・動作確認
- **T4-6**: R2カスタムドメイン設定（設定手順準備完了）

### 🔧 実施中のタスク

- **T4-6**: R2カスタムドメイン設定（Cloudflareダッシュボードでの設定作業中）

## デプロイ済み環境

### プレビュー環境
- **URL**: https://preview.monogs.pages.dev
- **デプロイメントURL**: https://7738fd6a.monogs.pages.dev

## 環境変数の設定

Cloudflare Pagesダッシュボードで以下の環境変数を設定してください：

### 本番環境（Production）

1. Cloudflare ダッシュボードにアクセス: https://dash.cloudflare.com/
2. Pages → monogs → Settings → Environment variables
3. Production タブで以下の環境変数を追加:

```
# NextAuth
NEXTAUTH_URL=https://monogs.net
NEXTAUTH_SECRET=8ow8d/T1UnX+pHAITLbseUftz/3O8HjGlBEFHnCIHGY=

# Storage
STORAGE_TYPE=r2
R2_ACCOUNT_ID=faee4e153783aa141428deab13822eb6
R2_ACCESS_KEY_ID=c27cc4ce64127d45c8226560a184c50a
R2_SECRET_ACCESS_KEY=fcb89281458ceefc1999bf37aeda63e27fb83f66d256de0717cf192791c7ef5e
R2_BUCKET=monogs-images
R2_PUBLIC_URL=https://images.monogs.net
NEXT_PUBLIC_IMAGES_URL=https://images.monogs.net

# Database
DB_TYPE=d1
```

### プレビュー環境（Preview）

同様に Preview タブで環境変数を設定します（NEXTAUTH_URL以外は同じ）:

```
NEXTAUTH_URL=https://preview.monogs.pages.dev
```

## ビルドとデプロイコマンド

### ローカルビルド
```bash
npm run build:cloudflare
```

### プレビュー環境へデプロイ
```bash
npm run deploy:cloudflare
```

### 本番環境へデプロイ
```bash
npm run deploy:cloudflare:production
```

## データベースマイグレーション

### D1データベースにマイグレーション適用

本番環境:
```bash
npm run db:migrate:d1:prod
```

ローカル（テスト用）:
```bash
npm run db:migrate:d1:local
```

### D1にデータをシード

本番環境:
```bash
npm run db:seed:d1:prod
```

ローカル（テスト用）:
```bash
npm run db:seed:d1:local
```

## T4-6: R2カスタムドメイン設定

**実施日**: 2025-12-11
**R2バケット名**: `monogs-r2-upload`
**カスタムドメイン**: `images.monogs.net`
**状態**: 設定手順準備完了、Cloudflareダッシュボードでの作業待ち

### 1. Cloudflare R2バケットにカスタムドメインを追加

1. Cloudflare ダッシュボードにアクセス
2. R2 → monogs-r2-upload → Settings → Public access
3. "Add custom domain" をクリック
4. ドメイン名を入力: `images.monogs.net`
5. DNS設定が自動的に追加されます

### 2. DNS設定の確認

Cloudflare DNS に以下のレコードが追加されていることを確認:

```
Type: CNAME
Name: images
Target: monogs-r2-upload.r2.cloudflarestorage.com
Proxy: Enabled (オレンジクラウド)
```

### 3. SSL/TLS設定

1. SSL/TLS → Overview
2. Encryption mode: Full (strict) を選択

### 4. 設定完了後の確認とデプロイ

カスタムドメイン設定完了後、以下を実施してください：

1. **DNSの伝播確認**（数分かかる場合があります）
   ```bash
   nslookup images.monogs.net
   ```

2. **HTTPSアクセステスト**
   ```bash
   curl -I https://images.monogs.net/
   ```

3. **wrangler.tomlの環境変数を確認**
   - `NEXT_PUBLIC_IMAGES_URL = "https://images.monogs.net"` が有効化されていることを確認

4. **再デプロイ**
   ```bash
   # プレビュー環境
   npm run deploy:cloudflare

   # または本番環境
   npm run deploy:cloudflare:production
   ```

5. **画像表示の確認**
   - デプロイ後、実際のサイトで画像が正しく表示されることを確認

## トラブルシューティング

### ビルドエラー

TypeScriptエラーが出る場合:
- `tsconfig.json` で `scripts` と `migration-data` が exclude されていることを確認
- `drizzle.config.ts` の設定が正しいことを確認

### デプロイエラー

wrangler.tomlの設定を確認:
- D1とR2のバインディングが各環境（preview, production）に設定されていること
- database_idが正しいこと

### 環境変数が反映されない

1. Cloudflare Pagesダッシュボードで環境変数を確認
2. 新しいデプロイを実行（環境変数の変更は新しいデプロイで反映される）

## 次のステップ（Phase 5, 6）

Phase 4が完了したら、以下のフェーズに進みます：

### Phase 5: URL互換・リダイレクト設定
- 旧URL → 新URLマッピング
- next.config.jsでのリダイレクト設定
- 画像URLリダイレクト

### Phase 6: DNS・メール設定
- DNS設定の移行
- メール関連レコード（MX, SPF, DKIM）の設定
- 本番ドメイン切替準備
