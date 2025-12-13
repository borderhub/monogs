# R2カスタムドメイン設定手順（実施用）

実施日: 2025-12-11

## 概要

Cloudflare R2バケットにカスタムドメインを接続することで、画像が以下のURLで配信されるようになります：

- **Production**: `https://images.monogs.net/content/images/...`
- **Preview**: `https://images-preview.monogs.net/content/images/...`

## 前提条件

✅ **完了済み**:
- DNS移行完了（Cloudflareネームサーバー使用中）
- R2バケット作成済み
  - Production: `monogs-r2-upload`
  - Preview: `monogs-r2-preview`
- アプリケーション設定完了（wrangler.toml、next.config.ts）

---

## 設定手順

### Step 1: Cloudflareダッシュボードにログイン

1. ブラウザで以下のURLにアクセス:
   ```
   https://dash.cloudflare.com/
   ```

2. Cloudflareアカウントでログイン

---

### Step 2: Production環境のカスタムドメイン設定

#### 2-1. R2バケットに移動

1. 左メニューから **R2** をクリック
2. バケット一覧から **`monogs-r2-upload`** をクリック

#### 2-2. Public accessを確認

1. 上部タブから **Settings** をクリック
2. 下にスクロールして **Public access** セクションを見つける

#### 2-3. カスタムドメインを追加

1. **Custom Domains** セクションで **Connect Domain** ボタンをクリック

   ※ボタンが見つからない場合は、**Add custom domain** や **Connect custom domain** などの表記の場合もあります

2. ドメイン名入力欄に以下を入力:
   ```
   images.monogs.net
   ```

3. **Connect Domain** または **Add domain** ボタンをクリック

4. 確認メッセージが表示されたら **Confirm** をクリック

#### 2-4. DNS設定の確認

Cloudflareが自動的にCNAMEレコードを作成します。以下を確認:

1. 左メニューから **Websites** をクリック
2. **monogs.net** ドメインを選択
3. **DNS** → **Records** に移動
4. 以下のレコードが存在することを確認:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | images | monogs-r2-upload.r2.cloudflarestorage.com | Proxied (オレンジクラウド) |

**存在しない場合**:
- 手動で追加してください
- Type: `CNAME`
- Name: `images`
- Target: `monogs-r2-upload.r2.cloudflarestorage.com`
- Proxy status: **Proxied** (オレンジクラウドを有効化)
- TTL: Auto

---

### Step 3: Preview環境のカスタムドメイン設定

#### 3-1. R2バケットに移動

1. 左メニューから **R2** をクリック
2. バケット一覧から **`monogs-r2-preview`** をクリック

#### 3-2. Public accessを確認

1. 上部タブから **Settings** をクリック
2. 下にスクロールして **Public access** セクションを見つける

#### 3-3. カスタムドメインを追加

1. **Custom Domains** セクションで **Connect Domain** ボタンをクリック

2. ドメイン名入力欄に以下を入力:
   ```
   images-preview.monogs.net
   ```

3. **Connect Domain** または **Add domain** ボタンをクリック

4. 確認メッセージが表示されたら **Confirm** をクリック

#### 3-4. DNS設定の確認

1. 左メニューから **Websites** をクリック
2. **monogs.net** ドメインを選択
3. **DNS** → **Records** に移動
4. 以下のレコードが存在することを確認:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | images-preview | monogs-r2-preview.r2.cloudflarestorage.com | Proxied (オレンジクラウド) |

**存在しない場合**:
- 手動で追加してください
- Type: `CNAME`
- Name: `images-preview`
- Target: `monogs-r2-preview.r2.cloudflarestorage.com`
- Proxy status: **Proxied** (オレンジクラウドを有効化)
- TTL: Auto

---

## Step 4: DNS伝播の確認

設定完了後、DNS伝播を確認します（通常は数分以内）:

### 4-1. Production環境（images.monogs.net）

ターミナルで以下のコマンドを実行:

```bash
# DNSレコード確認
dig images.monogs.net

# HTTPSアクセステスト
curl -I https://images.monogs.net/
```

**期待される結果**:
- `dig`コマンド: CloudflareのIPアドレスが返る（例: 104.21.x.x, 172.67.x.x）
- `curl`コマンド: HTTP 404 Not Found（バケットが空の場合は正常）または HTTP 200 OK（ファイルが存在する場合）

### 4-2. Preview環境（images-preview.monogs.net）

ターミナルで以下のコマンドを実行:

```bash
# DNSレコード確認
dig images-preview.monogs.net

# HTTPSアクセステスト
curl -I https://images-preview.monogs.net/
```

**期待される結果**:
- `dig`コマンド: CloudflareのIPアドレスが返る
- `curl`コマンド: HTTP 404 Not Found または HTTP 200 OK

---

## Step 5: 画像アップロードテスト

### 5-1. Preview環境でテスト

1. ブラウザで以下にアクセス:
   ```
   https://monogs-preview.shirabegroup.workers.dev/admin/media
   ```

2. ログイン（必要な場合）

3. 画像ファイルをアップロード

4. アップロード成功後、画像のURLを確認:
   ```
   https://images-preview.monogs.net/content/images/2025/12/[filename]
   ```

5. URLをブラウザで開いて画像が表示されることを確認

### 5-2. Production環境でテスト

1. ブラウザで以下にアクセス:
   ```
   https://monogs-production.shirabegroup.workers.dev/admin/media
   ```

2. 画像ファイルをアップロード

3. 画像のURLを確認:
   ```
   https://images.monogs.net/content/images/2025/12/[filename]
   ```

4. URLをブラウザで開いて画像が表示されることを確認

---

## トラブルシューティング

### 問題1: "Connect Domain" ボタンが見つからない

**原因**: R2バケットのPublic accessが有効化されていない可能性があります。

**解決方法**:
1. R2バケットの **Settings** → **Public access** セクションに移動
2. **Allow Access** または **Enable Public Access** ボタンがあればクリック
3. 再度 **Custom Domains** セクションを確認

### 問題2: DNS伝播に時間がかかる

**原因**: DNSキャッシュの影響で反映に数分～数十分かかる場合があります。

**解決方法**:
1. 5分ほど待ってから再度 `dig` コマンドを実行
2. ブラウザのキャッシュをクリア（Cmd+Shift+R または Ctrl+Shift+R）

### 問題3: 404エラーが表示される

**原因**: バケットにファイルがない、またはパスが間違っている可能性があります。

**解決方法**:
1. R2バケットにファイルが存在するか確認
2. 画像アップロード機能でテストファイルをアップロード
3. アップロードされたファイルのURLを確認

### 問題4: "Domain already in use" エラー

**原因**: 同じドメインが別のR2バケットまたは他のCloudflareサービスで使用されています。

**解決方法**:
1. DNS → Records で該当するCNAMEレコードを削除
2. 他のR2バケットで同じドメインが設定されていないか確認
3. 再度カスタムドメインを追加

---

## 完了チェックリスト

作業完了後、以下をチェックしてください:

- [ ] Production: `images.monogs.net` がR2バケット `monogs-r2-upload` に接続されている
- [ ] Preview: `images-preview.monogs.net` がR2バケット `monogs-r2-preview` に接続されている
- [ ] DNS: `dig images.monogs.net` でCloudflare IPが返る
- [ ] DNS: `dig images-preview.monogs.net` でCloudflare IPが返る
- [ ] HTTP: `curl -I https://images.monogs.net/` が応答する
- [ ] HTTP: `curl -I https://images-preview.monogs.net/` が応答する
- [ ] 画像アップロード: Preview環境で画像アップロードが成功する
- [ ] 画像表示: アップロードした画像がブラウザで表示される
- [ ] 画像アップロード: Production環境で画像アップロードが成功する
- [ ] 画像表示: Production環境の画像がブラウザで表示される

---

## 参考情報

- [Cloudflare R2 Custom Domains](https://developers.cloudflare.com/r2/buckets/public-buckets/#custom-domains)
- [DNS_MIGRATION_PLAN.md](./DNS_MIGRATION_PLAN.md)

---

## 実施結果を記録してください

設定完了後、以下の情報を記録してください:

**Production環境**:
- カスタムドメイン設定完了: [ ] Yes / [ ] No
- DNS伝播確認完了: [ ] Yes / [ ] No
- 画像アップロードテスト: [ ] 成功 / [ ] 失敗
- 備考:

**Preview環境**:
- カスタムドメイン設定完了: [ ] Yes / [ ] No
- DNS伝播確認完了: [ ] Yes / [ ] No
- 画像アップロードテスト: [ ] 成功 / [ ] 失敗
- 備考:
