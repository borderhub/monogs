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
    xHandle?: string;
    instagram?: string;
    facebook?: string;
    bandcamp?: string;
    github?: string;
  };
}

export default function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle || '');
  const [siteDescription, setSiteDescription] = useState(settings.siteDescription || '');
  const [siteUrl, setSiteUrl] = useState(settings.siteUrl || '');
  const [ogImage, setOgImage] = useState(settings.ogImage || '');
  const [xHandle, setXHandle] = useState(settings.xHandle || '');
  const [instagram, setInstagram] = useState(settings.instagram || '');
  const [facebook, setFacebook] = useState(settings.facebook || '');
  const [bandcamp, setBandcamp] = useState(settings.bandcamp || '');
  const [github, setGithub] = useState(settings.github || '');
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
          xHandle,
          instagram,
          facebook,
          bandcamp,
          github,
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
          slug="settings"
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

      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">ソーシャルメディア</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="xHandle" className="block text-sm font-medium text-gray-700 mb-2">
              X (旧Twitter) ハンドル
            </label>
            <input
              id="xHandle"
              type="text"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="@monogs"
            />
          </div>

          <div>
            <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-2">
              Instagram ユーザー名
            </label>
            <input
              id="instagram"
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="monogs"
            />
          </div>

          <div>
            <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-2">
              Facebook ページURL
            </label>
            <input
              id="facebook"
              type="url"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.facebook.com/monogs"
            />
          </div>

          <div>
            <label htmlFor="bandcamp" className="block text-sm font-medium text-gray-700 mb-2">
              Bandcamp URL
            </label>
            <input
              id="bandcamp"
              type="url"
              value={bandcamp}
              onChange={(e) => setBandcamp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://monogs.bandcamp.com"
            />
          </div>

          <div>
            <label htmlFor="github" className="block text-sm font-medium text-gray-700 mb-2">
              GitHub ユーザー名
            </label>
            <input
              id="github"
              type="text"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="monogs"
            />
          </div>
        </div>
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
    </form>
  );
}
