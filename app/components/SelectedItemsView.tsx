'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GalleryItem } from '../../api';

interface SelectedItemsViewProps {
  selectedItems: Set<string>;
  onDeselectItem: (itemId: string) => void;
  onClearAll: () => void;
}

interface SelectedItemDetails {
  _id: string;
  title: string;
  creator: string;
  date: string;
  callNumber: string;
}

export default function SelectedItemsView({ selectedItems, onDeselectItem, onClearAll }: SelectedItemsViewProps) {
  const [selectedItemDetails, setSelectedItemDetails] = useState<SelectedItemDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch details for selected items
  useEffect(() => {
    const fetchSelectedItemDetails = async () => {
      if (selectedItems.size === 0) {
        setSelectedItemDetails([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const details: SelectedItemDetails[] = [];

      for (const itemId of selectedItems) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8002';
          const response = await fetch(`${apiUrl}/gallery/books/${itemId}`);
          
          if (response.ok) {
            const item: GalleryItem = await response.json();
            details.push({
              _id: item._id,
              title: item.Title || item['Title (English)'] || item['Title (Arabic)'] || 'Untitled',
              creator: item.Creator || item['Creator (Arabic)'] || 'Unknown',
              date: item.Date || 'Unknown',
              callNumber: item['Call number'] || ''
            });
          } else {
            // If item not found, add placeholder
            details.push({
              _id: itemId,
              title: 'Item not found',
              creator: 'Unknown',
              date: 'Unknown',
              callNumber: ''
            });
          }
        } catch (error) {
          console.error(`Error fetching item ${itemId}:`, error);
          details.push({
            _id: itemId,
            title: 'Error loading item',
            creator: 'Unknown',
            date: 'Unknown',
            callNumber: ''
          });
        }
      }

      setSelectedItemDetails(details);
      setLoading(false);
    };

    fetchSelectedItemDetails();
  }, [selectedItems]);

  const handleViewDetails = (itemId: string) => {
    // Get current search state from localStorage
    const searchState = localStorage.getItem('searchState');
    
    if (searchState) {
      const { searchQuery, searchFilter, sortBy, pageNumber } = JSON.parse(searchState);
      
      // Create a URL that preserves the search state
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (searchFilter) params.append('filter', searchFilter);
      if (sortBy) params.append('sort', sortBy);
      if (pageNumber) params.append('page', pageNumber.toString());
      
      // Navigate to detail page with preserved state
      router.push(`/Record/${itemId}?${params.toString()}`);
    } else {
      // Navigate without search state if none exists
      router.push(`/Record/${itemId}`);
    }
  };

  if (selectedItems.size === 0) {
    return null;
  }

  return (
    <div className="bg-lightBeige border-2 border-calmRed rounded-lg p-4 mb-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-calmRed flex items-center">
          <span className="mr-2">📋</span>
          Selected Items ({selectedItems.size})
        </h3>
        <button
          onClick={onClearAll}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          Clear All
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-calmRed"></div>
          <span className="ml-2 text-gray-600">Loading selected items...</span>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {selectedItemDetails.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-lg p-3 border border-gray-200 hover:border-calmRed transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {item.title}
                  </h4>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Creator:</span> {item.creator}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Date:</span> {item.date}
                    {item.callNumber && (
                      <span className="ml-4">
                        <span className="font-medium">Call #:</span> {item.callNumber}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-3 flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleViewDetails(item._id)}
                    className="bg-calmRed hover:bg-opacity-90 text-white px-2 py-1 rounded text-sm transition-colors"
                    title="View full details"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onDeselectItem(item._id)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm transition-colors"
                    title="Remove from selection"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-sm text-gray-600 bg-blue-50 p-2 rounded">
        💡 These items will be processed together when you click &ldquo;Process Items&rdquo;
      </div>
    </div>
  );
}
