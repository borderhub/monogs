interface ImageGalleryProps {
  images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  if (!images || images.length === 0) {
    return null;
  }

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
        return 'grid-cols-3';
      case 8:
        return 'grid-cols-3';
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
      if (index < 3) return '';
      if (index < 5) return 'col-start-2 col-span-1';
      return '';
    }

    return '';
  };

  return (
    <div className="my-8">
      <div className={`grid ${getGridClass()} gap-4`}>
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-lg ${getImageClass(index)}`}
          >
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
