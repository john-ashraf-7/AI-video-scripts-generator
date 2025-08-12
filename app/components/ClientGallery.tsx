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
import {pageLimit} from './GalleryData';
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

  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  //pageLimit = 100 
  const [currentSortBy, setCurrentSortBy] = useState<string>("Title A-Z");
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>("");
  const [currentSearchFilter, setCurrentSearchFilter] = useState("All Fields");
  
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

  const onFilterChange = async (sortBy: string, searchQuery: string, searchFilter: string) => {
    //it is important here to notice that states update in react asynchronously. meaning after the function is completed. that's why we pass the arguments down here rather than the updated states. and when the function is compelte, the states become up to date to be used in other functions.
    setFilteredItems([]);
    setCurrentSortBy(sortBy);
    setCurrentSearchQuery(searchQuery);
    setCurrentSearchFilter(searchFilter);

    console.log(`Filters changed: sortBy=${sortBy}, searchQuery=${searchQuery}, searchFilter=${searchFilter}`);

    const records = await getGalleryPage({page: currentPageNumber, limit: 100, sort: sortBy , searchQuery: searchQuery, searchIn: searchFilter});
    setFilteredItems(records.books);
  }

  const onPageChange = async (page: number) => {
    if (page < 1 || page > pageLimit) {
      alert(`Please enter a page number between 1 and ${pageLimit}.`);
      return;
    }
    setFilteredItems([]);
    setCurrentPageNumber(page);
    const records = await getGalleryPage({page: page, limit: 100, sort: currentSortBy , searchQuery: currentSearchQuery, searchIn: currentSearchFilter});
    setFilteredItems(records.books);
    console.log(`Page changed to: ${page}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex gap-4 mb-8 h-64">
        <div className="w-2/3">
          <div>
            <SearchAndFilter
              onFilterChange={onFilterChange}
            />
          </div>
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
        </div>
        <div className="w-1/3">
          <PageNavigation pageNumber={currentPageNumber} onPageChange={onPageChange}/>
        </div>
      </div>

      {/* Results and Selection Info */}

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