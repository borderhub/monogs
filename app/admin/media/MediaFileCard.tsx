// app/admin/media/MediaFileCard.tsx
'use client'; // ★ これが重要：このコンポーネントをクライアントコンポーネントとして宣言する

import React from 'react';

// ファイルデータの型定義（page.tsxのモックデータに合わせる）
interface MediaFile {
  id: string;
  url: string;
  filename: string;
  size: number;
}

interface MediaFileCardProps {
  file: MediaFile;
  // TODO: 削除機能の実装
  // onDelete: (id: string) => void;
}

export default function MediaFileCard({ file }: MediaFileCardProps) {
  // URLコピーのロジック
  const handleCopyUrl = () => {
    // navigator.clipboard はブラウザでのみ動作するクライアントAPI
    navigator.clipboard.writeText(file.url)
      .then(() => alert('URLをコピーしました！'))
      .catch((err) => console.error('URLコピーに失敗:', err));
  };

  // 削除ボタンのロジック（未実装）
  const handleDelete = () => {
    if (confirm(`${file.filename} を削除しますか？`)) {
      // onDelete(file.id);
      console.log(`削除処理: ${file.id}`);
    }
  };

  return (
    <div
      key={file.id}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
    >
      <div className="aspect-square relative">
        <img
          src={file.url}
          alt={file.filename}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.filename}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {(file.size / 1024).toFixed(0)} KB
        </p>
        <div className="mt-2 flex gap-2">
          {/* インタラクティブなボタンをClient Component内に移動 */}
          <button
            onClick={handleCopyUrl} // ✅ Client Component内なのでOK
            className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            URLコピー
          </button>
          <button
            onClick={handleDelete} // ✅ Client Component内なのでOK
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
