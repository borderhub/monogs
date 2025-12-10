'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import ImageUploader from './ImageUploader';

interface SettingsFormProps {
  settings: {
    siteTitle: string;
    siteDescription: string;
    siteUrl: string;
    ogImage?: string;
    twitterHandle?: string;
  };
}

export default function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle || '');
  const [siteDescription, setSiteDescription] = useState(settings.siteDescription || '');
  const [siteUrl, setSiteUrl] = useState(settings.siteUrl || '');
  const [ogImage, setOgImage] = useState(settings.ogImage || '');
  const [twitterHandle, setTwitterHandle] = useState(settings.twitterHandle || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteTitle,
          siteDescription,
          siteUrl,
          ogImage,
          twitterHandle,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess('設定を保存しました');
      router.refresh();
    } catch (err) {
      setError('設定の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" role="form">
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="siteTitle" className="block text-sm font-medium text-gray-700 mb-2">
          サイトタイトル *
        </label>
        <input
          id="siteTitle"
          type="text"
          value={siteTitle}
          onChange={(e) => setSiteTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="monogs web site"
        />
      </div>

      <div>
        <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700 mb-2">
          サイト説明 *
        </label>
        <textarea
          id="siteDescription"
          value={siteDescription}
          onChange={(e) => setSiteDescription(e.target.value)}
          required
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="monogs works and art project"
        />
      </div>

      <div>
        <label htmlFor="siteUrl" className="block text-sm font-medium text-gray-700 mb-2">
          サイトURL *
        </label>
        <input
          id="siteUrl"
          type="url"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://monogs.net"
        />
      </div>

      <div>
        <ImageUploader
          onUpload={(url) => setOgImage(url)}
          currentImage={ogImage}
          label="デフォルトOG画像（SNSシェア用）"
        />
        <div className="mt-2">
          <label htmlFor="ogImage" className="block text-sm font-medium text-gray-700 mb-2">
            またはURLを直接入力
          </label>
          <input
            id="ogImage"
            type="url"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://images.monogs.net/og-image.jpg"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          推奨サイズ: 1200 x 630px
        </p>
      </div>

      <div>
        <label htmlFor="twitterHandle" className="block text-sm font-medium text-gray-700 mb-2">
          Twitterハンドル
        </label>
        <input
          id="twitterHandle"
          type="text"
          value={twitterHandle}
          onChange={(e) => setTwitterHandle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="@monogs"
        />
      </div>

      <div className="pt-4 border-t">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '保存中...' : '設定を保存'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-700">
          ※ 設定機能は現在開発中です。Cloudflare D1統合時に完全に機能します。
        </p>
      </div>
    </form>
  );
}
