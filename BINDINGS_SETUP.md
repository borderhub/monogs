# Cloudflare Pages バインディング設定手順

## 概要

Cloudflare Pagesでデプロイエラーが発生した場合、D1データベースとR2バケットのバインディングを設定する必要があります。

## エラーメッセージ

```
[ERROR] A request to the Cloudflare API (/accounts/faee4e153783aa141428deab13822eb6/pages/projects/monogs/deployments) failed.
```

このエラーは、バインディングが設定されていないために発生します。

## 設定手順

### 1. Cloudflare Pagesダッシュボードにアクセス

https://dash.cloudflare.com/ にアクセスして、以下の手順で進んでください：

1. 左サイドバーから **Workers & Pages** を選択
2. **monogs** プロジェクトをクリック
3. **Settings** タブをクリック
4. **Functions** を選択

### 2. D1データベースのバインディングを追加

#### Production環境

1. **Production** タブを選択
2. **D1 database bindings** セクションで **Add binding** をクリック
3. 以下を入力：
   - **Variable name**: `DB`
   - **D1 database**: `monogs-db` を選択（ドロップダウンから）
4. **Save** をクリック

#### Preview環境

1. **Preview** タブを選択
2. **D1 database bindings** セクションで **Add binding** をクリック
3. 以下を入力：
   - **Variable name**: `DB`
   - **D1 database**: `monogs-db` を選択
4. **Save** をクリック

### 3. R2バケットのバインディングを追加

#### Production環境

1. **Production** タブを選択
2. **R2 bucket bindings** セクションで **Add binding** をクリック
3. 以下を入力：
   - **Variable name**: `IMAGES`
   - **R2 bucket**: `monogs-r2-upload` を選択
4. **Save** をクリック

#### Preview環境

1. **Preview** タブを選択
2. **R2 bucket bindings** セクションで **Add binding** をクリック
3. 以下を入力：
   - **Variable name**: `IMAGES`
   - **R2 bucket**: `monogs-r2-upload` を選択
4. **Save** をクリック

### 4. 環境変数の設定（オプションですが推奨）

1. **Settings** → **Environment variables** をクリック

#### Production環境変数

以下の変数を追加：

```
NEXTAUTH_URL=https://monogs.net
NEXTAUTH_SECRET=8ow8d/T1UnX+pHAITLbseUftz/3O8HjGlBEFHnCIHGY=
STORAGE_TYPE=r2
DB_TYPE=d1
NODE_ENV=production
```

#### Preview環境変数

以下の変数を追加：

```
NEXTAUTH_URL=https://preview.monogs.pages.dev
NEXTAUTH_SECRET=8ow8d/T1UnX+pHAITLbseUftz/3O8HjGlBEFHnCIHGY=
STORAGE_TYPE=r2
DB_TYPE=d1
NODE_ENV=preview
```

## 設定後のデプロイ

バインディングと環境変数の設定が完了したら、再度デプロイを実行してください：

```bash
# previewブランチで
npm run deploy:cloudflare

# または本番環境
git checkout main
npm run deploy:cloudflare:production
```

## トラブルシューティング

### D1データベースやR2バケットが見つからない場合

#### D1データベースの確認
```bash
wrangler d1 list
```

存在しない場合は作成：
```bash
wrangler d1 create monogs-db
```

#### R2バケットの確認
```bash
wrangler r2 bucket list
```

存在しない場合は作成：
```bash
wrangler r2 bucket create monogs-r2-upload
```

### バインディングが反映されない場合

1. ダッシュボードでバインディングが **Production** と **Preview** の両方に追加されているか確認
2. 設定を保存したことを確認
3. 新しいデプロイを実行（設定変更は新しいデプロイから反映されます）

### それでもエラーが出る場合

1. ブラウザのキャッシュをクリア
2. Cloudflareダッシュボードからログアウト→ログイン
3. `wrangler logout` → `wrangler login` でCLIを再認証

## 参考情報

- [Cloudflare Pages Functions Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
