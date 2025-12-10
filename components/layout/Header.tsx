import SearchBar from '@/components/SearchBar';

export default function Header() {
  return (
    <header className="bg-gray-300 p-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between ml-16 mr-4">
          <div className="text-xl font-bold">monogs</div>
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
