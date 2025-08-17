'use client';

import Link from 'next/link';
import {GalleryItem} from '../../api';

interface ItemProps {
  item: GalleryItem;
  isSelected: boolean;
  onSelect: (itemId: string) => void;
}

export default function Item({item, isSelected, onSelect}: ItemProps) {
    const ImageURL = item['Image URL'] || (item.Type?.includes("song") ? "/songs.png" : "/imageNotFound.png");

    const handleSelect = () => {
        onSelect(item._id);
    };

    return(
        <div className={`w-full max-w-md p-3 bg-darkBeige shadow-lg rounded-xl flex flex-col transition-all duration-200 hover:shadow-xl hover:scale-105 ${isSelected ? 'ring-2 ring-calmRed' : ''}`}>
            {/* Image Container */}
            <div className="relative group overflow-hidden shadow-md cursor-pointer rounded-lg mb-2">
                <img 
                    src={ImageURL}    
                    alt="Item Image" 
                    className="w-full h-64 object-contain rounded-lg"
                />
                <Link href={`/Record/${item._id}`} className="absolute inset-0 bg-black opacity-0 group-hover:opacity-60 transition duration-300 flex items-center justify-center rounded-lg">
                    <span className="text-white text-lg font-semibold opacity-0 group-hover:opacity-100 transition duration-300">View Details</span>
                </Link>
            </div>
            
            {/* Item Information */}
            <div className="mb-2">
                <h2 className="font-semibold text-gray-800 text-lg line-clamp-2 leading-tight">
                    {item.Title || item["Title (English)"] || item["Title (Arabic)"]}
                </h2>
            </div>
            
            {/* Action Button */}
            <div>
                <button 
                    onClick={handleSelect}
                    className={`w-full cursor-pointer hover:shadow-md py-2 px-4 rounded-lg font-medium transition-colors ${
                        isSelected 
                            ? 'bg-gray-400 text-white' 
                            : 'bg-calmRed text-white hover:bg-opacity-90'
                    }`}
                >
                    {isSelected ? 'Selected ✓' : 'Select Item'}
                </button>
            </div>
        </div>
    )
}