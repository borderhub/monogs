import Link from 'next/link';
import { getArchiveList } from '@/lib/db/queries';

export default async function ArchivePage() {
  const archives = await getArchiveList();

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  // Group by year
  const archivesByYear = archives.reduce((acc, archive) => {
    if (!acc[archive.year]) {
      acc[archive.year] = [];
    }
    acc[archive.year].push(archive);
    return acc;
  }, {} as Record<number, typeof archives>);

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-12">
        <h1 className="text-4xl font-bold mb-6">アーカイブ</h1>
        <p className="text-lg text-gray-600 mb-8">
          年月別の記事一覧
        </p>

        {archives.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600">アーカイブがありません。</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(archivesByYear)
              .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
              .map(([year, months]) => (
                <div key={year} className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-4">{year}年</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {months.map((archive) => (
                      <Link
                        key={`${archive.year}-${archive.month}`}
                        href={`/archive/${archive.year}/${archive.month}`}
                        className="flex items-center justify-between px-4 py-3 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                      >
                        <span className="font-semibold">
                          {monthNames[archive.month - 1]}
                        </span>
                        <span className="text-sm text-gray-600">
                          ({archive.count})
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
