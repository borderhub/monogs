#!/bin/bash
set -e

echo "========================================="
echo "Preview環境へのデプロイを開始します"
echo "========================================="

# カラー設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 環境設定
R2_BUCKET="monogs-r2-preview"
D1_DATABASE="monogs-db-preview"
D1_ID="5565ffae-d186-4991-9893-c83f5203a6c5"

echo -e "${YELLOW}Step 1: R2 preview バケットをクリア${NC}"
echo "バケット名: $R2_BUCKET"
read -p "R2バケットを空にしますか？ (y/N): " confirm
if [[ $confirm == [yY] ]]; then
  echo "R2バケットをクリア中..."
  npx wrangler r2 object delete $R2_BUCKET --file=- < <(npx wrangler r2 object list $R2_BUCKET --json | jq -r '.[].key') || true
  echo -e "${GREEN}✓ R2バケットをクリアしました${NC}"
else
  echo "R2バケットのクリアをスキップしました"
fi

echo ""
echo -e "${YELLOW}Step 2: MinIOからR2にファイルをコピー${NC}"
echo "MinIO bucket: monogs-images"
echo "R2 bucket: $R2_BUCKET"
read -p "ファイルをコピーしますか？ (y/N): " confirm
if [[ $confirm == [yY] ]]; then
  echo "ファイルをコピー中..."
  node scripts/sync-minio-to-r2.mjs preview
  echo -e "${GREEN}✓ ファイルのコピーが完了しました${NC}"
else
  echo "ファイルのコピーをスキップしました"
fi

echo ""
echo -e "${YELLOW}Step 3: D1データベースをクリアして再構築${NC}"
echo "データベース: $D1_DATABASE"
read -p "D1データベースを初期化しますか？ (y/N): " confirm
if [[ $confirm == [yY] ]]; then
  echo "D1データベースをクリア中..."
  # マイグレーションを削除して再実行
  npx wrangler d1 execute $D1_DATABASE --remote --command="DROP TABLE IF EXISTS posts; DROP TABLE IF EXISTS tags; DROP TABLE IF EXISTS posts_tags; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS settings; DROP TABLE IF EXISTS sessions;"

  echo "マイグレーションを実行中..."
  npx wrangler d1 migrations apply $D1_DATABASE --remote

  echo -e "${GREEN}✓ D1データベースを初期化しました${NC}"
else
  echo "D1データベースの初期化をスキップしました"
fi

echo ""
echo -e "${YELLOW}Step 4: SQLiteからD1にデータを移行${NC}"
read -p "データを移行しますか？ (y/N): " confirm
if [[ $confirm == [yY] ]]; then
  echo "データを移行中..."
  node scripts/migrate-sqlite-to-d1.mjs preview
  echo -e "${GREEN}✓ データの移行が完了しました${NC}"
else
  echo "データの移行をスキップしました"
fi

echo ""
echo -e "${GREEN}========================================="
echo "Preview環境へのデプロイが完了しました"
echo "=========================================${NC}"
echo ""
echo "次のステップ:"
echo "1. git add ."
echo "2. git commit -m \"Deploy to preview\""
echo "3. git push origin preview"
echo ""
echo "Preview URL: https://monogs-preview.shirabegroup.workers.dev"
