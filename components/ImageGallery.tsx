import Image from 'next/image';

interface ImageGalleryProps {
  images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  if (!images || images.length === 0) {
    return null;
  }

  // Determine grid layout based on image count
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
        return 'grid-cols-3'; // First image will span 3 columns
      case 8:
        return 'grid-cols-3'; // 3-2-3 layout
      case 9:
        return 'grid-cols-3';
      default:
        return 'grid-cols-3';
    }
  };

  // Get special styling for specific layouts
  const getImageClass = (index: number) => {
    const count = images.length;

    // 7 images: First image spans full width
    if (count === 7 && index === 0) {
      return 'col-span-3 row-span-2';
    }

    // 8 images: 3-2-3 layout
    if (count === 8) {
      if (index < 3) return ''; // First 3 normal
      if (index < 5) return 'col-span-1'; // Middle 2 normal
      return ''; // Last 3 normal
    }

    return '';
  };

  return (
    <div className="my-8">
      <div className={`grid ${getGridClass()} gap-2`}>
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative aspect-square overflow-hidden rounded ${getImageClass(index)}`}
          >
            <Image
              src={image}
              alt={`Gallery image ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
