'use client';

import { useState, useRef, DragEvent } from 'react';

interface ImageUploaderProps {
  onUpload: (url: string) => void;
  currentImage?: string;
  label?: string;
  slug?: string;
  isGallery?: boolean;
}

export default function ImageUploader({ onUpload, currentImage, label = '画像アップロード', slug, isGallery = false }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string>(currentImage || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setError('');
    setIsUploading(true);

    try {
      // ファイルタイプの検証
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('画像ファイル（JPEG、PNG、GIF、WebP）のみアップロード可能です');
      }

      // ファイルサイズの検証（2MB）
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('ファイルサイズは2MB以下にしてください');
      }

      // プレビュー表示
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // アップロード
      const formData = new FormData();
      formData.append('file', file);
      if (slug) {
        formData.append('slug', slug);
      }
      if (isGallery) {
        formData.append('isGallery', 'true');
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'アップロードに失敗しました');
      }

      const data = await response.json();
      onUpload(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
      setPreview(currentImage || '');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 mx-auto rounded"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreview('');
                onUpload('');
              }}
              className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
            >
              削除
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-gray-400">
              <svg
                className="mx-auto h-12 w-12"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              {isUploading ? (
                <span>アップロード中...</span>
              ) : (
                <>
                  <span className="font-medium text-blue-600">クリック</span>
                  または
                  <span className="font-medium text-blue-600">ドラッグ&ドロップ</span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP (最大10MB)</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
