'use client';

import { GalleryItem } from "@/api";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function DetailsCard({ record, itemId }: { record: Partial<GalleryItem>; itemId?: string }) {
    const router = useRouter();
    
    // Load song images for records without an Image URL
    const ImageURL = record['Image URL'] || (record.Type?.includes("song") ? "/songs.png" : "/imageNotFound.png");

    // Filter out empty or undefined fields
    const displayFields = Object.entries(record)
        .filter(([key, value]) => 
            value !== undefined && 
            value !== null && 
            value !== '' && 
            key !== '_id' && 
            key !== 'id' && 
            key !== 'Image URL' && 
            key !== 'Title' && 
            key !== 'Title (English)' && 
            key !== 'Title (Arabic)'
        );

    const handleAddToSelection = () => {
        // Get current search state from localStorage
        const searchState = localStorage.getItem('searchState');
        const selectedItems = localStorage.getItem('selectedItems');
        
        // Add current item to selection
        const currentSelected = selectedItems ? JSON.parse(selectedItems) : [];
        if (!currentSelected.includes(itemId || record._id)) {
            currentSelected.push(itemId || record._id);
            localStorage.setItem('selectedItems', JSON.stringify(currentSelected));
        }
        
        // Navigate back to home with search state preserved
        if (searchState) {
            const { searchQuery, searchFilter, sortBy, pageNumber } = JSON.parse(searchState);
            // Create a URL that preserves the search state
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (searchFilter) params.append('filter', searchFilter);
            if (sortBy) params.append('sort', sortBy);
            if (pageNumber) params.append('page', pageNumber.toString());
            params.append('select', itemId || record._id || '');
            
            router.push(`/?${params.toString()}`);
        } else {
            router.push(`/?select=${itemId || record._id}`);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-4">
            <div className="bg-darkBeige rounded-lg shadow-2xl p-12 max-w-2xl w-full text-center relative">
                <Link 
                    href="/"
                    className="absolute top-6 left-6 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200 hover:scale-105 shadow-md flex items-center gap-2 cursor-pointer"
                    style={{backgroundColor: 'var(--color-calmRed)', color: 'white'}}
                >
                    <span className="text-lg">←</span>
                    Back
                </Link>
                  <img
                        src={ImageURL}
                        alt="item image"
                        className="w-64 h-64 object-contain rounded-lg mx-auto mb-8 shadow-xl"
                    />

                <h1 className="text-3xl font-bold mb-6" style={{color: 'var(--foreground)'}}>
                    {record.Title || record['Title (English)'] || record['Title (Arabic)'] || 'Untitled Record'}
                </h1>

                <div className="space-y-4 text-left text-lg">
                    {displayFields.map(([key, value]) => (
                        <p key={key} className="text-gray-700">
                            <strong>{key}:</strong> {value}
                        </p>
                    ))}
                </div>
                <div className="mt-4">
                    <button 
                        onClick={handleAddToSelection}
                        className="px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-md cursor-pointer inline-block text-center"
                        style={{backgroundColor: 'var(--color-calmRed)', color: 'white', textDecoration: 'none'}}
                    >
                        Add to selection
                    </button>
                </div>
            </div>
        </div>
    );
}