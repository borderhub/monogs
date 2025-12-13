# Cloudflare Workers デプロイ設定 (修正版)

## 重要な変更

**Cloudflare Pages → Cloudflare Workers に変更**

最初はCloudflare Pagesとしてデプロイしようとしましたが、OpenNext CloudflareはWorkersとしてデプロイする必要があります。

## 問題の経緯

### 404エラーの原因

1. **初回の問題**: Cloudflare Pagesとしてデプロイしたが、404エラーが発生
2. **根本原因**: OpenNext CloudflareはWorkers形式でビルドされるため、Pagesではなく**Workersとしてデプロイする必要がある**
3. **NEXTAUTH_URLの問題**: ワイルドカード（`*`）は使用できません

## 解決方法

### 1. wrangler.tomlの修正

**変更前（Pages設定）:**
```toml
name = "monogs"
pages_build_output_dir = ".vercel/output/static"
```

**変更後（Workers設定）:**
```toml
name = "monogs"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]  # Node.js互換性フラグを追加
main = ".open-next/worker.js"

[[d1_databases]]
binding = "DB"
database_name = "monogs-db"
database_id = "d7781133-52aa-41f4-8a30-af1e6c0934b4"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "monogs-r2-upload"
```

### 2. デプロイコマンドの変更

**変更前:**
```bash
wrangler pages deploy .open-next --project-name monogs
```

**変更後:**
```bash
npx @opennextjs/cloudflare deploy
```

### 3. 環境変数の設定

Workers環境では、環境変数はCloudflare Dashboardで設定するか、wrangler.tomlの`[vars]`セクションで設定します。

```toml
[vars]
NODE_ENV = "production"
STORAGE_TYPE = "r2"
DB_TYPE = "d1"
```

**NEXTAUTH_URLの設定:**
- ワイルドカード（`*.monogs.pages.dev`）は使用できません
- 具体的なURLを指定する必要があります: `https://monogs.shirabegroup.workers.dev`

## デプロイ結果

✅ **成功**: https://monogs.shirabegroup.workers.dev

### バインディング情報
- **D1 Database**: monogs-db
- **R2 Bucket**: monogs-r2-upload
- **環境変数**:
  - NODE_ENV: "production"
  - STORAGE_TYPE: "r2"
  - DB_TYPE: "d1"

## デプロイコマンド

### ビルド＆デプロイ
```bash
npm run deploy:cloudflare
```

これは以下を実行します:
```bash
npm run build:cloudflare && npx @opennextjs/cloudflare deploy
```

### プレビュー（ローカル）
```bash
npm run preview:cloudflare
```

## カスタムドメインの設定

Workers用のカスタムドメイン設定:

1. **Cloudflare Dashboardにアクセス**
   https://dash.cloudflare.com/

2. **Workers & Pages** → **monogs** → **Settings** → **Triggers**

3. **Custom Domains** で `monogs.net` を追加

## 環境変数の追加設定

Cloudflare Dashboardで追加の環境変数を設定する場合:

1. Workers & Pages → monogs → Settings → Variables
2. 以下を追加:

```
NEXTAUTH_URL=https://monogs.shirabegroup.workers.dev
NEXTAUTH_SECRET=8ow8d/T1UnX+pHAITLbseUftz/3O8HjGlBEFHnCIHGY=
```

カスタムドメイン設定後は、NEXTAUTH_URLを更新:
```
NEXTAUTH_URL=https://monogs.net
```

## トラブルシューティング

### Node.jsモジュールのエラー

もし以下のようなエラーが出た場合:
```
Could not resolve "fs"
Could not resolve "path"
```

wrangler.tomlに`nodejs_compat`フラグが追加されていることを確認:
```toml
compatibility_flags = ["nodejs_compat"]
```

### 環境の分離

複数の環境（preview, production）を使いたい場合、wrangler.tomlで環境を定義できます:

```toml
[env.preview]
[env.preview.vars]
NODE_ENV = "preview"
NEXTAUTH_URL = "https://preview-monogs.shirabegroup.workers.dev"

[env.production]
[env.production.vars]
NODE_ENV = "production"
NEXTAUTH_URL = "https://monogs.net"
```

デプロイ時に環境を指定:
```bash
npx @opennextjs/cloudflare deploy --env=preview
npx @opennextjs/cloudflare deploy --env=production
```

## まとめ

- ✅ Cloudflare Workersとしてデプロイ成功
- ✅ D1とR2のバインディング設定完了
- ✅ nodejs_compat フラグでNode.js互換性を確保
- ⚠️ NEXTAUTH_URLは具体的なURLを指定（ワイルドカード不可）
- 📝 次のステップ: カスタムドメイン設定後、環境変数を更新
