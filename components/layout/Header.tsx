import SearchBar from '@/components/SearchBar';
import SocialLinks from '@/components/SocialLinks';
import { getSettings } from '@/lib/db/queries';

export default async function Header() {
  // ソーシャルメディア設定を取得
  const settingsData = await getSettings([
    'x_handle',
    'instagram',
    'facebook',
    'bandcamp',
    'github',
  ]);

  return (
    <header className="bg-gray-300 p-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between ml-16 mr-4">
          <div></div>
          <div className="flex-shrink-0">
            <SocialLinks
              xHandle={settingsData.x_handle || ''}
              instagram={settingsData.instagram || ''}
              facebook={settingsData.facebook || ''}
              bandcamp={settingsData.bandcamp || ''}
              github={settingsData.github || ''}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
