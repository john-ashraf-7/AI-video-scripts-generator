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

  console.log('ClientGallery initialized with:', {
    initialItemsCount: initialItems.length,
    allItemsCount: allItems.length,
    filteredItemsCount: filteredItems.length,
    totalItems,
    totalPages
  });

  // Fix hydration error by loading localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedItems');
    if (saved) {
      setSelectedItems(new Set(JSON.parse(saved)));
    }
    
    // Load saved search state
    const savedSearchState = localStorage.getItem('searchState');
    if (savedSearchState) {
      const { searchQuery, searchFilter, sortBy, pageNumber } = JSON.parse(savedSearchState);
      setCurrentSearchQuery(searchQuery || "");
      setCurrentSearchFilter(searchFilter || "All Fields");
      setCurrentSortBy(sortBy || "Title A-Z");
      setCurrentPageNumber(pageNumber || 1);
    }
  }, []);

  // Handle URL selection parameter
  useEffect(() => {
    const selectId = searchParams.get('select');
    const searchQuery = searchParams.get('search');
    const searchFilter = searchParams.get('filter');
    const sortBy = searchParams.get('sort');
    const pageNumber = searchParams.get('page');
    
    console.log('URL parameters:', { selectId, searchQuery, searchFilter, sortBy, pageNumber });
    
    if (selectId && !processedSelection.current) {
      processedSelection.current = true;
      // Find the item with the matching _id and select it
      const itemToSelect = allItems.find(item => item._id === selectId);
      if (itemToSelect) {
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.add(itemToSelect._id);
          // Save to localStorage
          localStorage.setItem('selectedItems', JSON.stringify([...newSet]));
          return newSet;
        });
      }
    }
    
    // Handle search state restoration from URL
    if (searchQuery || searchFilter || sortBy || pageNumber) {
      const newSearchQuery = searchQuery || currentSearchQuery;
      const newSearchFilter = searchFilter || currentSearchFilter;
      const newSortBy = sortBy || currentSortBy;
      const newPageNumber = pageNumber ? parseInt(pageNumber) : currentPageNumber;
      
      console.log('Restoring search state:', { newSearchQuery, newSearchFilter, newSortBy, newPageNumber });
      
      // Update state
      setCurrentSearchQuery(newSearchQuery);
      setCurrentSearchFilter(newSearchFilter);
      setCurrentSortBy(newSortBy);
      setCurrentPageNumber(newPageNumber);
      
      // Save to localStorage
      localStorage.setItem('searchState', JSON.stringify({
        searchQuery: newSearchQuery,
        searchFilter: newSearchFilter,
        sortBy: newSortBy,
        pageNumber: newPageNumber
      }));
      
      // Apply the search filters immediately
      if (searchQuery || searchFilter || sortBy) {
        console.log('Applying search filters from URL');
        onFilterChange(newSortBy, newSearchQuery, newSearchFilter);
      } else if (pageNumber) {
        console.log('Applying page change from URL');
        onPageChange(newPageNumber);
      }
    }
    
    // Remove the query parameters from URL
    if (selectId || searchQuery || searchFilter || sortBy || pageNumber) {
      window.history.replaceState({}, '', '/');
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

  // Deselect individual item
  const handleDeselectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      localStorage.setItem('selectedItems', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const onFilterChange = async (sortBy: string, searchQuery: string, searchFilter: string) => {
    //it is important here to notice that states update in react asynchronously. meaning after the function is completed. that's why we pass the arguments down here rather than the updated states. and when the function is compelte, the states become up to date to be used in other functions.
    console.log('onFilterChange called with:', { sortBy, searchQuery, searchFilter });
    
    setFilteredItems([]);
    setCurrentSortBy(sortBy);
    setCurrentSearchQuery(searchQuery);
    setCurrentSearchFilter(searchFilter);

    // Save search state to localStorage
    localStorage.setItem('searchState', JSON.stringify({
      searchQuery,
      searchFilter,
      sortBy,
      pageNumber: 1
    }));

    console.log(`Filters changed: sortBy=${sortBy}, searchQuery=${searchQuery}, searchFilter=${searchFilter}`);

    try {
      const records = await getGalleryPage({page: 1, limit: 100, sort: sortBy , searchQuery: searchQuery, searchIn: searchFilter});
      console.log('Search results:', records);
      setFilteredItems(records.books);
      setTotalItems(records.total || 0); // Update total items
      setTotalPages(records.total_pages || 1); // Update total pages
      setCurrentPageNumber(1); // Reset to page 1 when filtering
    } catch (error) {
      console.error('Error fetching search results:', error);
      setFilteredItems([]);
      setTotalItems(0);
      setTotalPages(1);
    }
  }

  const onPageChange = async (page: number) => {
    if (page < 1 || page > pageLimit) {
      alert(`Please enter a page number between 1 and ${pageLimit}.`);
      return;
    }
    setFilteredItems([]);
    setCurrentPageNumber(page);
    
    // Save current page to search state
    const currentSearchState = localStorage.getItem('searchState');
    if (currentSearchState) {
      const searchState = JSON.parse(currentSearchState);
      searchState.pageNumber = page;
      localStorage.setItem('searchState', JSON.stringify(searchState));
    }
    
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
      <div className="flex gap-4 mb-8">
        <div className="w-4/5">
          <div>
            <SearchAndFilter
              onFilterChange={onFilterChange}
              initialSearchQuery={currentSearchQuery}
              initialSearchFilter={currentSearchFilter}
              initialSortBy={currentSortBy}
            />
          </div>
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Showing {filteredItems.length} of {totalItems} items (Page {currentPageNumber} of {totalPages})
            </p>
          </div>
        </div>
        <div className="w-1/5">
          <PageNavigation pageNumber={currentPageNumber} onPageChange={onPageChange}/>
        </div>
      </div>

      {/* Batch Processing - Moved outside of fixed height container */}
      <BatchProcessing 
        selectedItems={selectedItems}
        onClearSelection={handleClearSelection}
        onDeselectItem={handleDeselectItem}
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
            isSelected={selectedItems.has(item._id)}
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