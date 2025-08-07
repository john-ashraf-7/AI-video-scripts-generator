import Item from './Item';
import { GalleryItem } from '../../src/api';

interface GalleryGridProps {
  items: GalleryItem[];
  selectedItems: Set<string>;
  onItemSelect: (itemId: string) => void;
}

export default function GalleryGrid({ items, selectedItems, onItemSelect }: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No items found</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <Item
          key={item._id}
          item={item}
          isSelected={selectedItems.has(item.id.toString())}
          onSelect={onItemSelect}
        />
      ))}
    </div>
  );
} 