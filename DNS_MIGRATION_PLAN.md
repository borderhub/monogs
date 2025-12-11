# DNS移行計画書

生成日時: 2025-12-11

## 現在のDNS設定（さくらインターネット）

### 確認済みレコード

```
ネームサーバー:
- ns1.dns.ne.jp
- ns2.dns.ne.jp

A レコード:
- monogs.net → 133.242.177.135

MX レコード:
- monogs.net → 10 monogs.net
```

### 確認済みレコード（追加）

```
TXTレコード:
- （設定なし - SPF, DKIM, DMARCが未設定）

CNAMEレコード:
- www.monogs.net → monogs.net → 133.242.177.135
- mail.monogs.net → monogs.net → 133.242.177.135
```

**重要**: すべてのサブドメインが同一IP（133.242.177.135）に集約されているシンプルな構成

---

## Cloudflare移行後の設定（予定）

### 基本方針

1. **既存のVPS（133.242.177.135）はメールサーバーとして継続使用**
   - メール関連のレコードは「DNS Only（グレークラウド）」に設定
   - Cloudflareのプロキシを通さない

2. **Webサーバーは段階的にCloudflare Workersに移行**
   - 移行中は既存VPSとの共存期間を設ける
   - 最終的にはVPSからWebサービスを削除

3. **R2カスタムドメイン（images.monogs.net）を追加**
   - Cloudflareのプロキシを有効化

---

## Cloudflare DNSレコード設定（確定版）

### ⚠️ 重要な設定ルール

1. **メール関連レコード**は必ず「DNS Only（グレークラウド）」
2. **Web/画像配信**は「Proxied（オレンジクラウド）」でCloudflare経由
3. **移行期間中**は既存VPSとCloudflare Workersを併用

---

### 必須レコード一覧

| Type | Name | Value | Proxy Status | TTL | 優先度 | 備考 |
|------|------|-------|-------------|-----|--------|------|
| **A** | **@** | **133.242.177.135** | **DNS Only** | Auto | - | ⚠️ メールサーバー用（移行完了までProxy禁止） |
| **MX** | **@** | **monogs.net** | **DNS Only** | Auto | **10** | メール配送先 |
| **CNAME** | **www** | **monogs.net** | DNS Only | Auto | - | 移行期間中は既存VPS |
| **CNAME** | **mail** | **monogs.net** | **DNS Only** | Auto | - | メールサーバー（Proxy禁止） |

### Web移行完了後の変更予定

| Type | Name | Value | Proxy Status | TTL | 備考 |
|------|------|-------|-------------|-----|------|
| A | @ | 削除（Workersでルーティング） | - | - | VPSからWeb削除後 |
| CNAME | www | monogs.net または削除 | Proxied | Auto | Cloudflare Workersにルーティング |

### 画像配信（新規追加）

| Type | Name | Value | Proxy Status | TTL | 備考 |
|------|------|-------|-------------|-----|------|
| **CNAME** | **images** | **monogs-r2-upload.r2.cloudflarestorage.com** | **Proxied** | Auto | R2カスタムドメイン |

---

### メール認証レコード（新規設定推奨）

現在SPF, DKIM, DMARCが未設定のため、Cloudflare移行時に設定することを推奨します：

#### SPF（送信元認証）

| Type | Name | Value | Proxy Status | TTL | 備考 |
|------|------|-------|-------------|-----|------|
| TXT | @ | `v=spf1 ip4:133.242.177.135 -all` | DNS Only | Auto | 133.242.177.135からのメール送信を許可 |

#### DMARC（なりすまし対策）

| Type | Name | Value | Proxy Status | TTL | 備考 |
|------|------|-------|-------------|-----|------|
| TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:postmaster@monogs.net` | DNS Only | Auto | 初期は p=none で監視 |

#### DKIM（署名検証）

※Dovecotで生成した公開鍵が必要です。VPSで以下を確認してください：
```bash
# Dovecot/OpenDKIMの設定ディレクトリで公開鍵を確認
cat /etc/opendkim/keys/monogs.net/default.txt
# または
cat /etc/dkim/monogs.net.txt
```

公開鍵がある場合：

| Type | Name | Value | Proxy Status | TTL | 備考 |
|------|------|-------|-------------|-----|------|
| TXT | default._domainkey | `v=DKIM1; k=rsa; p=MIGfMA0GCS...（公開鍵）` | DNS Only | Auto | DKIM署名検証用 |

---

## 移行手順（ステップバイステップ）

### Phase 1: 準備（完了）

- [x] 現在のDNS設定を記録（A, MX, CNAME, TXT）
- [x] TXT, mail, www レコードの確認
- [x] DNS_MIGRATION_PLAN.md 作成

### Phase 2: Cloudflare設定

#### Step 2-1: Cloudflareにサイトを追加

1. https://dash.cloudflare.com/ にログイン
2. 「サイトを追加」または「Add a site」をクリック
3. ドメイン名を入力: `monogs.net`
4. プランを選択: **Free**（無料プラン）
5. 「サイトを追加」をクリック

#### Step 2-2: DNSレコードの自動スキャン確認

Cloudflareが既存のDNSレコードをスキャンします。以下を確認：
- `monogs.net` A レコード（133.242.177.135）
- `www.monogs.net` CNAME
- `mail.monogs.net` CNAME
- MX レコード

**不足しているレコードは手動で追加します（次ステップ）**

#### Step 2-3: DNSレコードを正確に設定

Cloudflareダッシュボードで `DNS` → `Records` に移動し、以下を設定：

**必須レコード**（厳守）：

1. **A レコード（ルートドメイン）**
   - Type: `A`
   - Name: `@`
   - IPv4 address: `133.242.177.135`
   - Proxy status: **DNS only（グレークラウド）** ← 重要！
   - TTL: Auto

2. **MX レコード**
   - Type: `MX`
   - Name: `@`
   - Mail server: `monogs.net`
   - Priority: `10`
   - TTL: Auto

3. **CNAME レコード（www）**
   - Type: `CNAME`
   - Name: `www`
   - Target: `monogs.net`
   - Proxy status: **DNS only** （移行期間中）
   - TTL: Auto

4. **CNAME レコード（mail）**
   - Type: `CNAME`
   - Name: `mail`
   - Target: `monogs.net`
   - Proxy status: **DNS only（グレークラウド）** ← 重要！
   - TTL: Auto

5. **CNAME レコード（images）** - 新規追加
   - Type: `CNAME`
   - Name: `images`
   - Target: `monogs-r2-upload.r2.cloudflarestorage.com`
   - Proxy status: **Proxied（オレンジクラウド）**
   - TTL: Auto

**メール認証レコード**（推奨）：

6. **SPF レコード**
   - Type: `TXT`
   - Name: `@`
   - Content: `v=spf1 ip4:133.242.177.135 -all`
   - TTL: Auto

7. **DMARC レコード**
   - Type: `TXT`
   - Name: `_dmarc`
   - Content: `v=DMARC1; p=none; rua=mailto:postmaster@monogs.net`
   - TTL: Auto

#### Step 2-4: SSL/TLS設定

1. `SSL/TLS` → `Overview` に移動
2. Encryption mode: **Full (strict)** を選択

#### Step 2-5: Cloudflareネームサーバーの確認

Cloudflareが指定するネームサーバーをメモします（例）：
```
erin.ns.cloudflare.com
finn.ns.cloudflare.com
```

### Phase 3: ネームサーバー変更

#### Step 3-1: お名前.comでネームサーバーを変更

1. お名前.com にログイン: https://www.onamae.com/
2. ドメイン管理 → ネームサーバー設定
3. `monogs.net` を選択
4. 「その他のネームサーバーを使う」を選択
5. Cloudflareのネームサーバー2つを入力
6. 保存

#### Step 3-2: Cloudflareでアクティベーション確認

Cloudflareダッシュボードに戻り、「ネームサーバー変更完了を確認」をクリック

#### Step 3-3: DNS伝播待ち（24-48時間）

```bash
# DNS伝播確認コマンド（定期的に実行）
dig monogs.net NS

# Cloudflareのネームサーバーが表示されたら成功
```

### Phase 4: R2カスタムドメイン設定

#### Step 4-1: R2バケットにカスタムドメインを接続

1. Cloudflareダッシュボード → `R2` → `monogs-r2-upload`
2. `Settings` → `Public access` セクション
3. `Add custom domain` をクリック
4. ドメイン名: `images.monogs.net` を入力
5. `Add domain` をクリック

**自動的にDNS設定が適用されます（Phase 3で設定済みのCNAMEレコード）**

### Phase 5: 検証・動作確認

#### Step 5-1: DNS確認

```bash
# 各レコードの確認
dig monogs.net A
dig www.monogs.net CNAME
dig mail.monogs.net CNAME
dig monogs.net MX
dig images.monogs.net CNAME
```

#### Step 5-2: メール送受信テスト

既存のメールアドレスで送受信テストを実施

#### Step 5-3: Web表示確認

- https://monogs.net にアクセス（既存VPS）
- https://www.monogs.net にアクセス

#### Step 5-4: 画像配信確認

```bash
curl -I https://images.monogs.net/
```

#### Step 5-5: SSL証明書確認

ブラウザで各URLにアクセスし、SSL証明書が有効であることを確認

---

## リスク管理

### 🚨 高リスク項目

1. **MXレコードのProxy化**
   - リスク: メールが届かなくなる
   - 対策: 必ず「DNS Only」に設定、設定後にメールテスト

2. **DNS伝播遅延**
   - リスク: 最大48時間、新旧DNSが混在
   - 対策: TTLを短く設定（300秒）、段階的移行

3. **SPF/DKIM/DMARCの設定ミス**
   - リスク: メールがスパム判定される
   - 対策: 既存設定を正確にコピー、変更後にテスト

### 📋 チェックリスト

移行前：
- [ ] すべてのDNSレコードを記録
- [ ] メールサーバー設定をバックアップ
- [ ] VPSへのSSHアクセス確認

移行後：
- [ ] dig コマンドでDNS伝播確認
- [ ] メール送受信テスト
- [ ] Webサイト表示確認
- [ ] SSL証明書の有効性確認

---

## ロールバック手順

万が一問題が発生した場合：

1. **お名前.comでネームサーバーを戻す**
   ```
   変更前: Cloudflareのネームサーバー
   変更後: ns1.dns.ne.jp, ns2.dns.ne.jp
   ```

2. **DNS伝播を待つ**（TTLに依存、最大48時間）

3. **動作確認**
   - Web表示
   - メール送受信

---

## 連絡先・参考情報

- Cloudflareサポート: https://dash.cloudflare.com/
- お名前.com管理画面: https://www.onamae.com/
- さくらVPS管理画面: https://secure.sakura.ad.jp/

---

## 次のアクション

1. 以下のコマンドを実行して結果を共有：
   ```bash
   dig monogs.net TXT
   dig mail.monogs.net A
   dig www.monogs.net A
   ```

2. 結果確認後、Cloudflareでサイト追加を開始
