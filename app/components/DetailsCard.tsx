'use client';

import { GalleryItem } from "@/api";
import Link from "next/link";

export default function DetailsCard({ record, itemId }: { record: Partial<GalleryItem>; itemId?: string }) {
    // Load song images for records without an Image URL
    const ImageURL = record['Image URL'] || (record.Title?.includes("أغنية") ? "/songs.png" : '');

    // Function to format field names for display
    const formatFieldName = (key: string): string => {
        const formatted = key
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/-/g, ' ') // Replace hyphens with spaces
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
        return formatted;
    };

    // Filter out empty or undefined fields
    const displayFields = Object.entries(record)
        .filter(([key, value]) => 
            value !== undefined && 
            value !== null && 
            value !== '' && 
            key !== '_id' && 
            key !== 'id' && 
            key !== 'Image URL' && 
            key !== 'Title'
        );

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
                
                {ImageURL && (
                    <img 
                        src={ImageURL} 
                        alt={record.Title || 'Record image'}
                        className="w-64 h-64 object-contain rounded-lg mx-auto mb-8 shadow-xl"
                    />
                )}

                <h1 className="text-3xl font-bold mb-6" style={{color: 'var(--foreground)'}}>
                    {record.Title || 'Untitled Record'}
                </h1>

                <div className="space-y-4 text-left text-lg">
                    {displayFields.map(([key, value]) => (
                        <p key={key} className="text-gray-700">
                            <strong>{formatFieldName(key)}:</strong> {value}
                        </p>
                    ))}
                </div>
                <div className="mt-4">
                    <a 
                        href={`/?select=${itemId || record._id}`}
                        className="px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-md cursor-pointer inline-block text-center"
                        style={{backgroundColor: 'var(--color-calmRed)', color: 'white', textDecoration: 'none'}}
                    >
                        Add to selection
                    </a>
                </div>
            </div>
        </div>
    );
}