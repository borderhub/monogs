#!/bin/bash

# publicフォルダをMinIOにミラーリング（一括同期）
#
# mc mirrorコマンドを使って高速に同期します
#
# 使い方:
#   bash scripts/mirror-public-to-minio.sh

set -e

echo "=== publicフォルダをMinIOにミラーリング ==="
echo ""

# publicフォルダをMinIOコンテナ内にマウント
echo "MinIOにpublicフォルダをミラーリング中..."
echo ""

# Docker経由でmc mirrorを実行
docker exec monogs-minio sh -c '
  # mc aliasが設定されているか確認
  mc alias list local >/dev/null 2>&1 || mc alias set local http://localhost:9000 minioadmin minioadmin

  # publicフォルダの内容を確認
  echo "同期対象のディレクトリ構造を確認..."

  # バケットが存在するか確認
  mc ls local/monogs-images >/dev/null 2>&1 || {
    echo "バケット monogs-images が存在しません"
    exit 1
  }

  echo "バケット: monogs-images"
  echo ""
'

# ホストのpublicフォルダからMinIOコンテナにファイルを転送
# Docker volumeマウントを使う
echo "ファイルをMinIOに転送中..."
echo ""

# slug構造の画像ファイルのみを同期
# 年/月/slug/ファイル のパターンに一致するファイルを探す
find public/content/images -type d -mindepth 3 -maxdepth 3 | while read -r dir; do
  # ディレクトリパスを解析
  # public/content/images/YYYY/MM/slug の形式
  if [[ $dir =~ public/content/images/([0-9]{4})/([0-9]{2})/([^/]+)$ ]]; then
    YEAR="${BASH_REMATCH[1]}"
    MONTH="${BASH_REMATCH[2]}"
    SLUG="${BASH_REMATCH[3]}"

    MINIO_PATH="content/images/${YEAR}/${MONTH}/${SLUG}/"
    LOCAL_PATH="${dir}/"

    echo "同期中: ${MINIO_PATH}"

    # ディレクトリ内のファイルを1つずつアップロード
    find "$LOCAL_PATH" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" -o -name "*.JPG" -o -name "*.JPEG" -o -name "*.PNG" -o -name "*.GIF" -o -name "*.WEBP" \) | while read -r file; do
      FILENAME=$(basename "$file")
      MINIO_FILE="${MINIO_PATH}${FILENAME}"

      # MinIOにアップロード（標準入力経由で高速化）
      docker exec -i monogs-minio mc cp - "myminio/monogs-images/${MINIO_FILE}" < "$file" >/dev/null 2>&1 || {
        echo "  ✗ エラー: ${FILENAME}"
      }
    done

    echo "  ✓ 完了"
  fi
done

echo ""
echo "✓ MinIOへのミラーリングが完了しました！"
echo ""

# 完了通知音を鳴らす（macOS）
if command -v afplay >/dev/null 2>&1; then
  afplay /System/Library/Sounds/Glass.aiff
fi
