'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { GalleryItem } from '../../api';
import SearchAndFilter from './SearchAndFilter';
import BatchProcessing from './BatchProcessing';
import Item from './Item';
import Page from '../Record/[id]/page';
import PageNavigation from './PageNavigation';
import { getGalleryPage } from '../../api';
import test from 'node:test';

interface ClientGalleryProps {
  initialItems: GalleryItem[];
}

export default function ClientGallery({ initialItems }: ClientGalleryProps) {
  const searchParams = useSearchParams();
  const processedSelection = useRef(false);
  const [allItems] = useState<GalleryItem[]>(initialItems);
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>(initialItems);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);
  const [pageNumber, setPageNumber] = useState();
  let currentSort: string = 'title';

  // Fix hydration error by loading localStorage after mount
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('selectedItems');
    if (saved) {
      setSelectedItems(new Set(JSON.parse(saved)));
    }
  }, []);

  // Handle URL selection parameter
  useEffect(() => {
    const selectId = searchParams.get('select');
    if (selectId && !processedSelection.current) {
      processedSelection.current = true;
      // Find the item with the matching _id and select it
      const itemToSelect = allItems.find(item => item._id === selectId);
      if (itemToSelect) {
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.add(itemToSelect.id.toString());
          // Save to localStorage
          localStorage.setItem('selectedItems', JSON.stringify([...newSet]));
          return newSet;
        });
        // Remove the query parameter from URL
        window.history.replaceState({}, '', '/');
      }
    }
  }, [searchParams, allItems]);

  // Handle item selection
  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      // Save to localStorage
      localStorage.setItem('selectedItems', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedItems(new Set());
    localStorage.removeItem('selectedItems');
  };

  // Search functionality
  const handleSearchChange = (query: string) => {
    if (!query.trim()) {
      setFilteredItems(allItems);
      return;
    }

    const filtered = allItems.filter(item => {
      const searchTerm = query.toLowerCase();
      
      return (
        (item.Title?.toLowerCase() || '').includes(searchTerm) ||
        (item.Creator?.toLowerCase() || '').includes(searchTerm) ||
        (item['Call number']?.toLowerCase() || '').includes(searchTerm) ||
        (item.Date?.toLowerCase() || '').includes(searchTerm) ||
        (item.Description?.toLowerCase() || '').includes(searchTerm) ||
        (item.Subject?.toLowerCase() || '').includes(searchTerm) ||
        (item.Notes?.toLowerCase() || '').includes(searchTerm) ||
        (item.Collection?.toLowerCase() || '').includes(searchTerm) ||
        (item.Language?.toLowerCase() || '').includes(searchTerm) ||
        (item.Type?.toLowerCase() || '').includes(searchTerm) ||
        (item['Title (English)']?.toLowerCase() || '').includes(searchTerm) ||
        (item['Title (Arabic)']?.toLowerCase() || '').includes(searchTerm) ||
        (item['Creator (Arabic)']?.toLowerCase() || '').includes(searchTerm)
      );
    });
    setFilteredItems(filtered);
  };

  // Filter functionality
  const handleFilterChange = (_filter: string) => {
    // This can be extended for more specific filtering
  };

  // Sort functionality
  const handleSortChange = async () => {
    const sorted = await getGalleryPage(pageNumber, 100, currentSort);
    setFilteredItems(sorted.books);
    console.log(`Sorted by: ${currentSort}`);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilteredItems(allItems);
    console.log(`current page in parent should be ${pageNumber}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search and Filter */}
      <SearchAndFilter
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
      />

      {/* Results and Selection Info */}
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Showing {filteredItems.length} of {allItems.length} items
        </p>
        <BatchProcessing 
          selectedItems={selectedItems}
          allItems={allItems}
          onClearSelection={handleClearSelection}
          compact={true}
        />
      </div>

      {/* Page navigation System */}
      <div>
        <PageNavigation pageNumber={pageNumber} assignPageNumber={setPageNumber} currentSort={currentSort} setFilteredItems={setFilteredItems} />
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredItems.map((item: GalleryItem) => (
          <Item 
            key={item._id} 
            item={item}
            isSelected={selectedItems.has(item.id.toString())}
            onSelect={handleItemSelect}
          /> 
        ))}
      </div>

      {/* No Results */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No items found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
} 