'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { GalleryItem } from '../../api';
import SearchAndFilter from './SearchAndFilter';
import BatchProcessing from './BatchProcessing';
import Item from './Item';
import PageNavigation from './PageNavigation';
import { getGalleryPage } from '../../api';
import {pageLimit} from './GalleryData';

interface ClientGalleryProps {
  initialItems: GalleryItem[];
}

export default function ClientGallery({ initialItems }: ClientGalleryProps) {
  const searchParams = useSearchParams();
  const processedSelection = useRef(false);
  const [allItems] = useState<GalleryItem[]>(initialItems);
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>(initialItems);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  //pageLimit = 100 
  const [currentSortBy, setCurrentSortBy] = useState<string>("Title A-Z");
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>("");
  const [currentSearchFilter, setCurrentSearchFilter] = useState("All Fields");
  
  const [totalItems, setTotalItems] = useState<number>(initialItems.length);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [hasBatchResults, setHasBatchResults] = useState(false);


  // Fix hydration error by loading localStorage after mount
  useEffect(() => {
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
      if (itemToSelect && itemToSelect.id) {
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.add(itemToSelect.id!.toString());
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
  const handleClearSelection = async () => {
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
    setTotalItems(records.total || 0); // Update total items
    setTotalPages(records.total_pages || 1); // Update total pages
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
    setTotalItems(records.total || 0); // Update total items
    setTotalPages(records.total_pages || 1); // Update total pages
    console.log(`Page changed to: ${page}`);
  };

  

  const clearResults = async () => {
    setHasBatchResults(false);
    const records = await getGalleryPage({page: currentPageNumber, limit: 100, sort: currentSortBy , searchQuery: currentSearchQuery, searchIn: currentSearchFilter});
    setFilteredItems(records.books);
  }

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
              Showing {filteredItems.length} of {totalItems} items (Page {currentPageNumber} of {totalPages})
            </p>
          </div>
        </div>
        <div className="w-1/3">
          <PageNavigation pageNumber={currentPageNumber} onPageChange={onPageChange}/>
        </div>
      </div>

      {/* Batch Processing - Moved outside of fixed height container */}
      <BatchProcessing 
        selectedItems={selectedItems}
        allItems={allItems}
        onClearSelection={handleClearSelection}
        setFilteredItems={setFilteredItems}
        clearResults={clearResults}
        setHasBatchResults={setHasBatchResults}
      />

      {/* Results and Selection Info */}

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredItems.map((item: GalleryItem) => (
          <Item 
            key={item._id} 
            item={item}
            isSelected={item.id ? selectedItems.has(item.id.toString()) : false}
            onSelect={handleItemSelect}
          /> 
        ))}
      </div>

      {/* No Results */}
      {filteredItems.length === 0 && !hasBatchResults && (
        <div className="text-center m-8 py-12">
          <div className="max-w-md mx-auto">
            <blockquote className="text-gray-700 text-lg italic mb-4">
              &ldquo;The only thing that you absolutely have to know is the location of the library.&rdquo;
            </blockquote>
            <footer className="text-gray-600 text-sm">
              — Albert Einstein
            </footer>
          </div>
        </div>
      )}
    </div>
  );
} 