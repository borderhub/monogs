#!/bin/bash

# publicフォルダからMinIOへ画像を同期
#
# slug入りの構造になっているpublicフォルダを
# MinIOに直接アップロードします
#
# 使い方:
#   bash scripts/sync-public-to-minio.sh

set -e

echo "=== publicフォルダからMinIOへ画像同期 ==="
echo ""

# publicフォルダのslug入り画像を検索
echo "slug入り画像を検索中..."
find public/content/images -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" -o -name "*.JPG" -o -name "*.JPEG" -o -name "*.PNG" -o -name "*.GIF" -o -name "*.WEBP" \) | \
  grep -E "/[0-9]{4}/[0-9]{2}/[^/]+/[^/]+$" > /tmp/slug_images.txt || true

TOTAL=$(wc -l < /tmp/slug_images.txt | tr -d ' ')
echo "検出されたslug入り画像: ${TOTAL}件"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "アップロード対象の画像がありません"
  exit 0
fi

# アップロード処理
echo "MinIOにアップロード中..."
echo ""

UPLOADED=0
SKIPPED=0
ERRORS=0
COUNT=0

while IFS= read -r file; do
  COUNT=$((COUNT + 1))

  # publicプレフィックスを除去してMinIOのパスを生成
  MINIO_PATH="${file#public/}"

  # 進捗表示
  PERCENT=$((COUNT * 100 / TOTAL))
  echo -ne "\r進捗: ${COUNT}/${TOTAL} (${PERCENT}%) - アップロード: ${UPLOADED}, スキップ: ${SKIPPED}, エラー: ${ERRORS}"

  # MinIOに既に存在するかチェック
  if docker exec monogs-minio-1 mc stat "local/monogs-images/${MINIO_PATH}" >/dev/null 2>&1; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # MinIOにアップロード
  if docker exec -i monogs-minio-1 mc cp - "local/monogs-images/${MINIO_PATH}" < "$file" >/dev/null 2>&1; then
    UPLOADED=$((UPLOADED + 1))
  else
    ERRORS=$((ERRORS + 1))
    echo ""
    echo "✗ エラー: ${MINIO_PATH}"
  fi

done < /tmp/slug_images.txt

echo ""
echo ""
echo "=== アップロード完了 ==="
echo "アップロード成功: ${UPLOADED}件"
echo "スキップ（既存）: ${SKIPPED}件"
echo "エラー: ${ERRORS}件"
echo ""

# 完了通知音を鳴らす（macOS）
if command -v afplay >/dev/null 2>&1; then
  afplay /System/Library/Sounds/Glass.aiff
fi

echo "✓ MinIOへの画像同期が完了しました！"
