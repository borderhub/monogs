'use client';

import { useState } from 'react';
import ImageUploader from './ImageUploader';

interface ImageGalleryUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  slug?: string;
}

export default function ImageGalleryUploader({
  images,
  onChange,
  maxImages = 9,
  slug,
}: ImageGalleryUploaderProps) {
  const [showUploader, setShowUploader] = useState(false);

  const handleAddImage = (url: string) => {
    if (images.length < maxImages) {
      onChange([...images, url]);
      setShowUploader(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
  };

  // レイアウトを決定する関数
  const getGridClass = () => {
    const count = images.length;
    switch (count) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-3';
      case 4:
        return 'grid-cols-2';
      case 5:
        return 'grid-cols-3';
      case 6:
        return 'grid-cols-3';
      case 7:
        return 'grid-cols-3'; // 特殊レイアウト
      case 8:
        return 'grid-cols-3'; // 特殊レイアウト
      case 9:
        return 'grid-cols-3';
      default:
        return 'grid-cols-3';
    }
  };

  // 特殊レイアウト用のスタイル
  const getImageClass = (index: number) => {
    const count = images.length;

    // 7個の場合: 最初の画像を大きく
    if (count === 7 && index === 0) {
      return 'col-span-3 row-span-2';
    }

    // 8個の場合: 3-2-3のレイアウト
    if (count === 8) {
      if (index < 3) return ''; // 最初の3個は通常サイズ
      if (index < 5) return 'col-span-1'; // 次の2個は通常サイズ
      return ''; // 最後の3個は通常サイズ
    }

    return '';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          記事内画像ギャラリー（最大{maxImages}個）
        </label>
        {images.length < maxImages && !showUploader && (
          <button
            type="button"
            onClick={() => setShowUploader(true)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            画像を追加
          </button>
        )}
      </div>

      {showUploader && images.length < maxImages && (
        <div className="border border-gray-300 rounded-lg p-4">
          <ImageUploader
            onUpload={handleAddImage}
            label="ギャラリーに画像を追加"
            slug={slug}
            isGallery={true}
          />
          <button
            type="button"
            onClick={() => setShowUploader(false)}
            className="mt-2 px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
          >
            キャンセル
          </button>
        </div>
      )}
      {images.length > 0 && (
        <>
          <div className={`grid ${getGridClass()} gap-4`}>
            {images.map((image, index) => (
              <div
                key={index}
                className={`relative group ${getImageClass(index)}`}
              >
                <img
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-48 object-cover rounded"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMoveImage(index, index - 1)}
                      className="px-2 py-1 bg-white text-gray-700 text-sm rounded hover:bg-gray-100"
                      title="左に移動"
                    >
                      ←
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    削除
                  </button>
                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMoveImage(index, index + 1)}
                      className="px-2 py-1 bg-white text-gray-700 text-sm rounded hover:bg-gray-100"
                      title="右に移動"
                    >
                      →
                    </button>
                  )}
                </div>
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-500">
            <p>レイアウトプレビュー: {images.length}個の画像</p>
            <p className="text-xs mt-1">
              ※ 画像の順序を変更するには、画像をホバーして矢印ボタンをクリック
            </p>
          </div>
        </>
      )}

      {images.length === 0 && !showUploader && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
          <p>ギャラリーに画像がありません</p>
          <p className="text-sm mt-1">「画像を追加」ボタンをクリックして画像をアップロード</p>
        </div>
      )}
    </div>
  );
}
