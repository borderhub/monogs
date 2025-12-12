# R2カスタムドメイン設定手順

実施日: 2025-12-11

## 前提条件

✅ **完了済み**:
- DNS設定確認: `images.monogs.net` → Cloudflare IPアドレス (104.21.79.169, 172.67.146.157)
- R2バケット作成: `monogs-r2-upload` (Production用)

## 設定手順

### Step 1: Cloudflareダッシュボードでカスタムドメインを追加

以下の手順でR2バケットにカスタムドメインを設定してください：

1. **Cloudflareダッシュボードにアクセス**
   ```
   https://dash.cloudflare.com/
   ```

2. **R2に移動**
   - 左メニューから `R2` をクリック

3. **バケットを選択**
   - `monogs-r2-upload` バケットをクリック

4. **Settings → Public access**
   - `Settings` タブをクリック
   - `Public access` セクションを見つける

5. **カスタムドメインを追加**
   - `Connect Domain` または `Add custom domain` ボタンをクリック
   - ドメイン名を入力: `images.monogs.net`
   - `Add domain` をクリック

6. **DNS設定の自動適用を確認**
   - Cloudflareが自動的にCNAMEレコードを設定します
   - 以下の設定が追加されることを確認:
     ```
     Type: CNAME
     Name: images
     Target: monogs-r2-upload.r2.cloudflarestorage.com
     Proxy: Proxied (オレンジクラウド)
     ```

### Step 2: DNS伝播の確認

カスタムドメイン追加後、以下のコマンドでDNS設定を確認：

```bash
# DNSレコード確認
dig images.monogs.net

# HTTPSアクセステスト
curl -I https://images.monogs.net/
```

**期待される結果**:
- Cloudflare IPアドレスが返る
- HTTPSでアクセス可能（404エラーは正常 - バケットが空の場合）

### Step 3: アプリケーション設定の更新

カスタムドメイン設定完了後、以下のコマンドを実行してください：

```bash
# 1. next.config.tsで画像リダイレクト設定を有効化
# 2. wrangler.tomlでNEXT_PUBLIC_IMAGES_URLを有効化
# 3. 再ビルド＆デプロイ
npm run build:cloudflare
npx @opennextjs/cloudflare deploy --env preview
npx @opennextjs/cloudflare deploy --env production
```

## 設定完了後の確認

### 1. 管理画面で画像アップロード
```
https://monogs-preview.shirabegroup.workers.dev/admin/media
```

### 2. アップロードした画像のURL確認
正常に設定されていれば、画像URLが以下の形式になります：
```
https://images.monogs.net/content/images/YYYY/MM/[slug]/filename.ext
```

### 3. ブラウザで画像表示確認
アップロードした画像が正しく表示されることを確認

## トラブルシューティング

### DNS伝播に時間がかかる
- 最大で数分～数十分かかる場合があります
- `dig images.monogs.net` で定期的に確認

### 404エラーが表示される
- R2バケットにファイルがない場合は正常
- 管理画面から画像をアップロードして確認

### 画像が表示されない
1. wrangler.tomlの`NEXT_PUBLIC_IMAGES_URL`が有効化されているか確認
2. next.config.tsのリダイレクト設定が有効化されているか確認
3. 再デプロイを実施

## 設定内容の詳細

### wrangler.toml (有効化前)
```toml
# 既存の画像は静的アセットとして配信されるため、カスタムドメイン設定後に有効化
# NEXT_PUBLIC_IMAGES_URL = "https://images.monogs.net"
```

### wrangler.toml (有効化後)
```toml
# R2カスタムドメイン (Phase 4-6完了後に有効化)
NEXT_PUBLIC_IMAGES_URL = "https://images.monogs.net"
```

### next.config.ts (有効化前)
```typescript
// Ghost CMSの画像パスをR2カスタムドメインにリダイレクト
// Note: カスタムドメイン設定(Phase 4-6)完了後に有効化
// {
//   source: '/content/images/:path*',
//   destination: 'https://images.monogs.net/:path*',
//   permanent: true,
// },
```

### next.config.ts (有効化後)
```typescript
// Ghost CMSの画像パスをR2カスタムドメインにリダイレクト
{
  source: '/content/images/:path*',
  destination: 'https://images.monogs.net/:path*',
  permanent: true,
},
```

## 参考情報

- [Cloudflare R2 Custom Domains](https://developers.cloudflare.com/r2/buckets/public-buckets/#custom-domains)
- [DNS_MIGRATION_PLAN.md](./DNS_MIGRATION_PLAN.md) - Phase 4セクション

## ステータス

- [ ] Step 1: Cloudflareダッシュボードでカスタムドメイン追加
- [ ] Step 2: DNS伝播確認
- [ ] Step 3: アプリケーション設定更新
- [ ] 動作確認

**実施者がStep 1を完了したら、次のステップに進んでください。**
