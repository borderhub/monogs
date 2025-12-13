# Cloudflare Pages デプロイエラー修正ガイド

## エラー内容

```
[ERROR] A request to the Cloudflare API (/accounts/.../pages/projects/monogs/deployments) failed.
Invalid commit message, it must be a valid UTF-8 string. [code: 8000111]
```

## 原因（解決済み）

コミットメッセージに日本語などのUTF-8文字が含まれている場合、Cloudflare APIがエラーを返します。

## 解決方法

package.jsonのデプロイコマンドに`--commit-message`フラグを追加して、英語のコミットメッセージを明示的に指定します。

```json
{
  "scripts": {
    "deploy:cloudflare": "npm run build:cloudflare && wrangler pages deploy .open-next --project-name monogs --branch=preview --commit-dirty=true --commit-message=\"Deploy from preview branch\"",
    "deploy:cloudflare:production": "npm run build:cloudflare && wrangler pages deploy .open-next --project-name monogs --branch=main --commit-dirty=true --commit-message=\"Deploy from main branch\""
  }
}
```

この修正により、デプロイが正常に完了するようになりました。

---

## その他のエラー: バインディング設定

もし以下のようなバインディング関連のエラーが発生した場合は、BINDINGS_SETUP.mdを参照してください。

```
[ERROR] D1 database not found
[ERROR] R2 bucket not found
```

## 修正方法

### 方法1: Cloudflare Pagesダッシュボードで設定（推奨）

1. **Cloudflare Pagesダッシュボードにアクセス**
   https://dash.cloudflare.com/ → Pages → monogs

2. **Settings** → **Functions** → **Bindings**

3. **D1データベースのバインディングを追加**
   - **Variable name**: `DB`
   - **D1 database**: `monogs-db` を選択
   - Environment: `Production` と `Preview` の両方に追加

4. **R2バケットのバインディングを追加**
   - **Variable name**: `IMAGES`
   - **R2 bucket**: `monogs-r2-upload` を選択
   - Environment: `Production` と `Preview` の両方に追加

5. **環境変数も追加**
   - Settings → Environment variables
   - CLOUDFLARE_SETUP.mdに記載されている環境変数を追加

### 方法2: wrangler.jsonで設定

wrangler.tomlをPages用の形式に修正します。

```toml
# wrangler.toml
name = "monogs"
pages_build_output_dir = ".open-next"
compatibility_date = "2024-12-01"

# 注: Pagesプロジェクトの場合、バインディングはダッシュボードで設定することを推奨
```

### 方法3: デプロイコマンドでバインディングを指定

package.jsonのデプロイコマンドを修正して、バインディングを指定します。

```json
{
  "scripts": {
    "deploy:cloudflare": "npm run build:cloudflare && wrangler pages deploy .open-next --project-name monogs --branch=preview --commit-dirty=true --d1=DB:monogs-db --r2=IMAGES:monogs-r2-upload"
  }
}
```

## デプロイ手順（修正後）

### 1. ダッシュボードで設定を完了させる

上記の「方法1」でバインディングと環境変数を設定

### 2. デプロイを実行

```bash
# previewブランチで
npm run deploy:cloudflare

# mainブランチで（本番）
git checkout main
npm run deploy:cloudflare:production
```

## トラブルシューティング

### バインディングが反映されない場合

1. Cloudflare Pagesダッシュボードでバインディングが正しく設定されているか確認
2. 設定後、新しいデプロイを実行する必要があります
3. キャッシュクリア: `rm -rf .open-next && npm run build:cloudflare`

### D1データベースが見つからない場合

```bash
# D1データベースの一覧を確認
wrangler d1 list

# monogs-dbが存在することを確認
# 存在しない場合は作成
wrangler d1 create monogs-db
```

### R2バケットが見つからない場合

```bash
# R2バケットの一覧を確認
wrangler r2 bucket list

# monogs-r2-uploadが存在することを確認
# 存在しない場合は作成
wrangler r2 bucket create monogs-r2-upload
```

## 注意事項

- Cloudflare Pagesのバインディングは、Workers用のwrangler.tomlとは設定方法が異なります
- Pagesプロジェクトの場合、ダッシュボードでバインディングを設定するのが最も確実です
- 環境変数（Production/Preview）は、それぞれ別々に設定する必要があります
