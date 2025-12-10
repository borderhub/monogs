# Cloudflare DNS 設定ガイド（メールサーバー共存版）

## 概要

monogs.net を Cloudflare に移管する際、既存の dovecot メールサーバー（VPS）との共存を維持するための DNS 設定手順。

**重要**: Cloudflare は SMTP/IMAP/POP3 をプロキシできないため、メール関連のレコードは必ず **DNS Only（グレークラウド）** に設定する。

---

## 1. 事前準備

### 1.1 現行 DNS レコードの取得

移行前に、現在のネームサーバーから全 DNS レコードを取得してバックアップする。

```bash
# 現行レコードの取得
dig monogs.net ANY +noall +answer
dig mail.monogs.net A +noall +answer
dig monogs.net MX +noall +answer
dig monogs.net TXT +noall +answer

# または nslookup
nslookup -type=any monogs.net
```

### 1.2 必要情報の確認

| 項目 | 値 | 備考 |
|------|-----|------|
| **VPS IP アドレス** | `xxx.xxx.xxx.xxx` | メールサーバーの IP |
| **旧 Web サーバー IP** | `xxx.xxx.xxx.xxx` | ロールバック用に記録 |
| **Cloudflare アカウント** | 作成済み | - |
| **ドメインレジストラ** | 確認済み | NS 変更用 |

---

## 2. Cloudflare DNS ゾーン設定

### 2.1 Cloudflare へのドメイン追加

1. Cloudflare ダッシュボード → **Add a Site**
2. `monogs.net` を入力
3. **Free プラン** を選択
4. Cloudflare が自動スキャンしたレコードを確認（**修正が必要**）

### 2.2 DNS レコード設定一覧

以下の設定を Cloudflare DNS に登録する。

#### A / AAAA レコード（Web サーバー）

| タイプ | 名前 | 内容 | プロキシ状態 | TTL |
|--------|------|------|-------------|-----|
| A | `@` | Cloudflare Pages 設定後に自動設定 | **Proxied (オレンジ)** | Auto |
| AAAA | `@` | Cloudflare Pages 設定後に自動設定 | **Proxied (オレンジ)** | Auto |
| CNAME | `www` | `monogs.net` | **Proxied (オレンジ)** | Auto |

**注**: Cloudflare Pages でカスタムドメインを設定すると、A/AAAA レコードは自動設定される。

#### A レコード（メールサーバー）- **重要: DNS Only**

| タイプ | 名前 | 内容 | プロキシ状態 | TTL |
|--------|------|------|-------------|-----|
| A | `mail` | `VPS_IP_ADDRESS` | **DNS Only (グレー)** | 300 |

```
⚠️ 絶対にオレンジクラウド（Proxied）にしないこと！
   メールの送受信ができなくなります。
```

#### MX レコード - **重要: プロキシ不可**

| タイプ | 名前 | 内容 | 優先度 | TTL |
|--------|------|------|--------|-----|
| MX | `@` | `mail.monogs.net` | 10 | 300 |

**注**: MX レコードは自動的に DNS Only になる（プロキシ設定不可）。

#### SPF レコード

| タイプ | 名前 | 内容 | TTL |
|--------|------|------|-----|
| TXT | `@` | `v=spf1 a mx ip4:VPS_IP_ADDRESS ~all` | 300 |

**説明**:
- `a`: ドメインの A レコードからの送信を許可
- `mx`: MX レコードで指定されたサーバーからの送信を許可
- `ip4:VPS_IP`: VPS の IP からの送信を許可
- `~all`: それ以外はソフトフェイル（メール自体は届くがスパム扱いの可能性）

**注**: 厳格なポリシーを適用する場合は `~all` を `-all` に変更（ハードフェイル）。

#### DKIM レコード

| タイプ | 名前 | 内容 | TTL |
|--------|------|------|-----|
| TXT | `default._domainkey` | `v=DKIM1; k=rsa; p=YOUR_DKIM_PUBLIC_KEY` | 300 |

**設定方法**:
1. VPS の dovecot/postfix で DKIM キーペアを生成
2. 公開鍵を DNS に登録
3. 秘密鍵でメール署名を設定

```bash
# VPS での DKIM キー生成例
opendkim-genkey -s default -d monogs.net
cat default.txt  # これを DNS に登録
```

#### DMARC レコード

| タイプ | 名前 | 内容 | TTL |
|--------|------|------|-----|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@monogs.net; ruf=mailto:dmarc@monogs.net` | 300 |

**段階的強化**:
1. **移行初期**: `p=none`（監視のみ、メールはブロックしない）
2. **安定後**: `p=quarantine`（失敗したメールは迷惑メールフォルダへ）
3. **完全移行後**: `p=reject`（失敗したメールは拒否）

#### 画像配信用サブドメイン（オプション）

| タイプ | 名前 | 内容 | プロキシ状態 | TTL |
|--------|------|------|-------------|-----|
| CNAME | `images` | R2 バケットのパブリック URL | **Proxied (オレンジ)** | Auto |

**注**: R2 カスタムドメイン機能を使用する場合の設定。

---

## 3. 設定例（YAML 形式）

```yaml
# Cloudflare DNS Zone Configuration
# monogs.net

dns_records:
  # Web サーバー（Cloudflare Pages）
  - type: A
    name: "@"
    content: "Cloudflare Pages で自動設定"
    proxied: true
    ttl: "auto"

  - type: CNAME
    name: "www"
    content: "monogs.net"
    proxied: true
    ttl: "auto"

  # メールサーバー（VPS - DNS Only 必須）
  - type: A
    name: "mail"
    content: "YOUR_VPS_IP_ADDRESS"  # 実際の IP に置換
    proxied: false  # ⚠️ 必須: DNS Only
    ttl: 300

  # MX レコード
  - type: MX
    name: "@"
    content: "mail.monogs.net"
    priority: 10
    ttl: 300

  # SPF
  - type: TXT
    name: "@"
    content: "v=spf1 a mx ip4:YOUR_VPS_IP_ADDRESS ~all"
    ttl: 300

  # DKIM
  - type: TXT
    name: "default._domainkey"
    content: "v=DKIM1; k=rsa; p=YOUR_DKIM_PUBLIC_KEY"
    ttl: 300

  # DMARC
  - type: TXT
    name: "_dmarc"
    content: "v=DMARC1; p=none; rua=mailto:dmarc@monogs.net"
    ttl: 300

  # 画像配信（R2 カスタムドメイン）
  - type: CNAME
    name: "images"
    content: "YOUR_R2_BUCKET_PUBLIC_URL"
    proxied: true
    ttl: "auto"
```

---

## 4. ネームサーバー変更

### 4.1 Cloudflare ネームサーバーの確認

Cloudflare ダッシュボードで以下のような NS が表示される:
```
NS1: xxx.ns.cloudflare.com
NS2: yyy.ns.cloudflare.com
```

### 4.2 レジストラでの NS 変更

1. ドメインレジストラ（お名前.com、ムームードメイン等）にログイン
2. `monogs.net` の DNS 設定 → ネームサーバー変更
3. Cloudflare の NS に変更
4. 反映まで最大 48 時間（通常は数時間）

**注意**: NS 変更前に、Cloudflare 側の DNS レコード設定を完了させておくこと。

---

## 5. SSL/TLS 設定

### 5.1 Cloudflare SSL モード

**推奨**: `Full (strict)`

```
Cloudflare ダッシュボード → SSL/TLS → Overview
→ "Full (strict)" を選択
```

| モード | 説明 |
|--------|------|
| Off | 非推奨 |
| Flexible | Cloudflare ↔ オリジン間が HTTP（非推奨） |
| Full | オリジン証明書を検証しない |
| **Full (strict)** | オリジン証明書を検証する（推奨） |

### 5.2 Edge Certificates

- **Always Use HTTPS**: ON
- **Automatic HTTPS Rewrites**: ON
- **Minimum TLS Version**: TLS 1.2

---

## 6. 検証手順

### 6.1 DNS 反映確認

```bash
# Cloudflare NS の確認
dig monogs.net NS +short

# Web サーバー（Cloudflare IP になっていること）
dig monogs.net A +short

# メールサーバー（VPS IP のままであること）
dig mail.monogs.net A +short

# MX レコード
dig monogs.net MX +short

# SPF
dig monogs.net TXT +short | grep spf

# DKIM
dig default._domainkey.monogs.net TXT +short

# DMARC
dig _dmarc.monogs.net TXT +short
```

### 6.2 メール送受信テスト

```bash
# 外部からの受信テスト
echo "Test" | mail -s "Inbound Test" info@monogs.net

# VPS からの送信テスト
echo "Test" | mail -s "Outbound Test" your-external-email@gmail.com
```

### 6.3 オンラインツールでの検証

- **MX Toolbox**: https://mxtoolbox.com/
  - MX Lookup: `monogs.net`
  - SPF Record Check
  - DKIM Check
  - DMARC Check

- **Mail Tester**: https://www.mail-tester.com/
  - メール送信してスコア確認

---

## 7. トラブルシューティング

### メールが届かない

1. **MX レコード確認**
   ```bash
   dig monogs.net MX +short
   # 期待値: 10 mail.monogs.net.
   ```

2. **mail.monogs.net が DNS Only か確認**
   - Cloudflare ダッシュボード → DNS → `mail` レコード
   - オレンジクラウドなら即座にグレーに変更

3. **VPS のファイアウォール確認**
   ```bash
   # ポート 25, 587, 465, 993, 995 が開いているか
   telnet mail.monogs.net 25
   ```

### SPF エラー

```bash
# SPF レコードの検証
dig monogs.net TXT +short | grep spf
```
→ VPS の IP が含まれていることを確認

### DKIM エラー

```bash
# DKIM レコードの検証
dig default._domainkey.monogs.net TXT +short
```
→ 公開鍵が正しく設定されていることを確認

### Web サイトが表示されない

1. **Cloudflare Pages のカスタムドメイン設定確認**
2. **SSL/TLS モードが "Full (strict)" かつ、オリジンに有効な証明書があるか**
3. **DNS の伝播待ち**（`https://dnschecker.org/` で確認）

---

## 8. ロールバック手順

万が一問題が発生した場合、以下の手順で旧環境に戻す。

### 8.1 DNS ロールバック

```yaml
# ロールバック用 DNS 設定
dns_records:
  - type: A
    name: "@"
    content: "旧_WEB_サーバー_IP"
    proxied: false  # DNS Only で直接アクセス
    ttl: 300

  # メール関連は変更不要（既に DNS Only）
```

### 8.2 NS ロールバック（最終手段）

1. レジストラで旧 NS に戻す
2. 旧 DNS サーバーのレコードを復元
3. 反映まで最大 48 時間

**注意**: NS 変更は反映に時間がかかるため、まずは Cloudflare 内で DNS レコードを旧サーバー IP に変更することを推奨。

---

## チェックリスト

### 移行前
- [ ] 現行 DNS レコードのバックアップ
- [ ] VPS IP アドレスの記録
- [ ] DKIM キーの生成・記録
- [ ] Cloudflare アカウント準備

### Cloudflare 設定
- [ ] ゾーン追加
- [ ] A レコード（Web）- Proxied
- [ ] A レコード（mail）- **DNS Only**
- [ ] MX レコード
- [ ] SPF レコード
- [ ] DKIM レコード
- [ ] DMARC レコード
- [ ] SSL/TLS = Full (strict)

### NS 変更後
- [ ] DNS 反映確認
- [ ] Web サイト表示確認
- [ ] メール受信テスト
- [ ] メール送信テスト
- [ ] SPF/DKIM/DMARC 検証

### 本番運用
- [ ] 監視設定（Cloudflare Analytics）
- [ ] DMARC レポート受信確認
- [ ] 定期的な DNS レコード監査
