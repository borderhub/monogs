import Link from 'next/link';
import { getPosts, getTags, getSettings } from '@/lib/db/queries';
import PostsView from '@/components/PostsView';
import Pagination from '@/components/Pagination';

const POSTS_PER_PAGE = 9;

// Force dynamic rendering to access D1 database
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Get only the posts we need for the first page
  const posts = await getPosts(POSTS_PER_PAGE);
  const tags = await getTags();

  // For pagination, we still need the total count
  const allPosts = posts.length < POSTS_PER_PAGE ? posts : await getPosts();
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const settings = await getSettings([
    'site_title',
    'site_description',
    'site_url',
    'og_image',
    'twitter_handle',
  ]);

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-12">
        <h1 className="text-4xl font-bold mb-4">{settings.site_title}</h1>
        <p className="text-lg text-gray-600">
          {settings.site_description}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Recent Posts</h2>
        {posts.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">記事準備中</h3>
            <p className="text-gray-600">
              記事データをロード中です
            </p>
          </div>
        ) : (
          <>
            <PostsView posts={posts} tags={tags} />
            <Pagination
              currentPage={1}
              totalPages={totalPages}
              maxDisplay={5}
              baseUrl="/page"
            />
          </>
        )}
      </section>

      {tags.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Categories</h2>
          <div className="flex flex-wrap gap-3">
            {tags.map(tag => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
