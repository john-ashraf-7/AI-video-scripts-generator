import React, { useState, useEffect, ChangeEvent } from "react";
import { getGallery, type GalleryItem as APIGalleryItem } from "../../src/api";

/**
 * Use the API GalleryItem type with local alias for clarity
 */
type GalleryItem = APIGalleryItem;

/**
 * Interface for batch processing progress
 */
interface BatchProgress {
  current: number;      // Current item being processed
  total: number;        // Total items to process
}

/**
 * Interface for date filter state
 */
interface DateFilter {
  from: string;         // Start year filter
  to: string;           // End year filter
}

/**
 * Props interface for the Gallery component
 */
interface GalleryProps {
  onItemSelect: (item: GalleryItem) => void;           // Callback for single item selection
  onBatchSelect: (items: GalleryItem[]) => void;       // Callback for batch processing
}

/**
 * Type for search filter options
 */
type SearchFilter = "all" | "title" | "creator" | "call_number" | "date";

/**
 * Type for sort options
 */
type SortOption = "name" | "creator" | "year" | "year_desc";

/**
 * Gallery Component
 * 
 * Displays a grid of library items with comprehensive filtering and search capabilities.
 * Supports both individual item processing and batch processing.
 * 
 * Features:
 * - Search across multiple fields
 * - Date range filtering
 * - Multiple sort options
 * - Item selection for batch processing
 * - Real-time processing status updates
 * - Responsive grid layout
 * 
 * @param onItemSelect - Callback for when a single item is selected for processing
 * @param onBatchSelect - Callback for when multiple items are selected for batch processing
 */
export default function Gallery({ onItemSelect, onBatchSelect }: GalleryProps) {
  // Core data states
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection and processing states
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({ current: 0, total: 0 });
  const [processingComplete, setProcessingComplete] = useState<boolean>(false);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>({ from: "", to: "" });
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("name");

  /**
   * Initialize component and set up event listeners
   */
  useEffect(() => {
    loadGallery();
    
    // Set up event listeners for processing state updates
    const handleResetProcessing = () => {
      setProcessingItem(null);
      setProcessingComplete(true);
      // Auto-hide completion message after 3 seconds
      setTimeout(() => setProcessingComplete(false), 3000);
    };
    
    const handleResetBatchProcessing = () => {
      setBatchProcessing(false);
      setBatchProgress({ current: 0, total: 0 });
    };
    
    const handleBatchProgressUpdate = (event: CustomEvent<BatchProgress>) => {
      setBatchProgress(event.detail);
    };
    
    // Add event listeners
    window.addEventListener('resetProcessingState', handleResetProcessing);
    window.addEventListener('resetBatchProcessingState', handleResetBatchProcessing);
    window.addEventListener('updateBatchProgress', handleBatchProgressUpdate as EventListener);
    
    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('resetProcessingState', handleResetProcessing);
      window.removeEventListener('resetBatchProcessingState', handleResetBatchProcessing);
      window.removeEventListener('updateBatchProgress', handleBatchProgressUpdate as EventListener);
    };
  }, []);

  /**
   * Loads gallery items from the API
   * Also extracts available years for date filtering
   */
  const loadGallery = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getGallery();
      const galleryItems = data.items || [];
      
      setItems(galleryItems);
      setFilteredItems(galleryItems);
      
      // Extract unique years for date filtering dropdown
      const years = [...new Set(
        galleryItems
          .map(item => parseInt(item.date))
          .filter(year => !isNaN(year))
      )].sort((a, b) => a - b);
      
      setAvailableYears(years);
    } catch (err) {
      setError("Failed to load gallery items");
      console.error("Gallery loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Applies all filters and sorting to the items
   * Runs whenever search query, filters, or sort option changes
   */
  useEffect(() => {
    let filtered = [...items];

    // Apply text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        switch (searchFilter) {
          case "title":
            return item.title.toLowerCase().includes(query);
          case "creator":
            return item.creator.toLowerCase().includes(query);
          case "call_number":
            return item.call_number.toLowerCase().includes(query);
          case "date":
            return item.date.toLowerCase().includes(query);
          case "all":
          default:
            // Search across all fields
            return (
              item.title.toLowerCase().includes(query) ||
              item.creator.toLowerCase().includes(query) ||
              item.call_number.toLowerCase().includes(query) ||
              item.date.toLowerCase().includes(query)
            );
        }
      });
    }

    // Apply date range filter
    if (dateFilter.from || dateFilter.to) {
      filtered = filtered.filter(item => {
        const itemYear = parseInt(item.date);
        if (isNaN(itemYear)) return false;
        
        const fromYear = dateFilter.from ? parseInt(dateFilter.from) : -Infinity;
        const toYear = dateFilter.to ? parseInt(dateFilter.to) : Infinity;
        
        return itemYear >= fromYear && itemYear <= toYear;
      });
    }

    // Apply sorting
    const sorted = sortItems(filtered);
    setFilteredItems(sorted);
  }, [items, searchQuery, searchFilter, dateFilter, sortBy]);

  /**
   * Sorts items based on the selected sort option
   * 
   * @param itemsToSort - Array of items to sort
   * @returns Sorted array of items
   */
  const sortItems = (itemsToSort: GalleryItem[]): GalleryItem[] => {
    return [...itemsToSort].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.title.localeCompare(b.title);
        case "creator":
          return a.creator.localeCompare(b.creator);
        case "year":
          return parseInt(a.date) - parseInt(b.date);
        case "year_desc":
          return parseInt(b.date) - parseInt(a.date);
        default:
          return 0;
      }
    });
  };

  /**
   * Handles search input changes
   */
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  /**
   * Handles search filter dropdown changes
   */
  const handleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSearchFilter(e.target.value as SearchFilter);
  };

  /**
   * Handles date filter changes
   * 
   * @param type - Whether it's 'from' or 'to' date
   * @param value - The selected year value
   */
  const handleDateFilterChange = (type: 'from' | 'to', value: string) => {
    setDateFilter(prev => ({
      ...prev,
      [type]: value
    }));
  };

  /**
   * Clears all active filters and resets to default state
   */
  const clearAllFilters = () => {
    setSearchQuery("");
    setSearchFilter("all");
    setDateFilter({ from: "", to: "" });
    setSortBy("name");
  };

  /**
   * Handles single item selection for immediate processing
   * 
   * @param item - The selected gallery item
   */
  const handleSingleSelect = (item: GalleryItem) => {
    setProcessingItem(item.id);
    onItemSelect(item);
  };

  /**
   * Handles batch processing of selected items
   */
  const handleBatchProcess = () => {
    const itemsToProcess = items.filter(item => selectedItems.includes(item.id));
    if (itemsToProcess.length > 0) {
      setBatchProcessing(true);
      setBatchProgress({ current: 0, total: itemsToProcess.length });
      onBatchSelect(itemsToProcess);
    }
  };

  /**
   * Toggles selection state of an item
   * 
   * @param itemId - ID of the item to toggle
   */
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)  // Remove if already selected
        : [...prev, itemId]                 // Add if not selected
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-calmRed"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-lg">{error}</p>
        <button
          onClick={loadGallery}
          className="mt-4 px-4 py-2 bg-calmRed text-white rounded-md hover:bg-opacity-90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search items..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
            />
          </div>

          {/* Search Filter Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search In
            </label>
            <select
              value={searchFilter}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
            >
              <option value="all">All Fields</option>
              <option value="title">Title</option>
              <option value="creator">Creator</option>
              <option value="call_number">Call Number</option>
              <option value="date">Date</option>
            </select>
          </div>

          {/* Date Range Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Year
            </label>
            <select
              value={dateFilter.from}
              onChange={(e) => handleDateFilterChange('from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
            >
              <option value="">Any</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Year
            </label>
            <select
              value={dateFilter.to}
              onChange={(e) => handleDateFilterChange('to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
            >
              <option value="">Any</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort and Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Sort Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
              >
                <option value="name">Title A-Z</option>
                <option value="creator">Creator A-Z</option>
                <option value="year">Year (Oldest First)</option>
                <option value="year_desc">Year (Newest First)</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                &nbsp;
              </label>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Batch Processing Controls */}
          {selectedItems.length > 0 && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleBatchProcess}
                disabled={batchProcessing}
                className="px-4 py-2 bg-calmRed text-white rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
              >
                {batchProcessing ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing ({batchProgress.current}/{batchProgress.total})</span>
                  </span>
                ) : (
                  "Process Selected"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-center">
        <p className="text-gray-600">
          Showing {filteredItems.length} of {items.length} items
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="flex flex-wrap justify-center gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`w-64 h-80 p-4 bg-white shadow-lg rounded-lg flex flex-col m-4 transition-all duration-200 hover:shadow-xl ${
              selectedItems.includes(item.id) ? 'ring-2 ring-calmRed' : ''
            }`}
          >
            {/* Item Image Placeholder */}
            <div className="flex-1 relative bg-gray-100 rounded overflow-hidden">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📚</div>
                  <div className="text-xs">Library Item</div>
                </div>
              </div>
            </div>

            {/* Item Information */}
            <div className="mt-3 flex-1 overflow-y-auto max-h-24">
              <h3 className="font-semibold text-sm text-gray-800 line-clamp-2 mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Creator:</span> {item.creator}
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Date:</span> {item.date}
              </p>
              <p className="text-xs text-gray-600 mb-2">
                <span className="font-medium">Call #:</span> {item.call_number}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-auto space-y-2">
              {/* Selection Toggle Button */}
              <button
                onClick={() => toggleItemSelection(item.id)}
                className={`w-full text-white text-sm py-2 rounded transition-colors ${
                  selectedItems.includes(item.id)
                    ? 'bg-gray-400'
                    : 'bg-calmRed hover:bg-opacity-90'
                }`}
              >
                {selectedItems.includes(item.id) ? 'Selected' : 'Select Item'}
              </button>
              
              {/* Generate Script Button */}
              <button
                onClick={() => handleSingleSelect(item)}
                disabled={processingItem === item.id}
                className="w-full bg-calmRed text-white text-sm py-2 rounded hover:bg-opacity-90 transition-colors disabled:opacity-50"
              >
                {processingItem === item.id ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </span>
                ) : (
                  "Generate Script"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Processing Complete Notification */}
      {processingComplete && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          Script generated successfully!
        </div>
      )}

      {/* No Results Message */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No items found matching your criteria.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-4 px-4 py-2 bg-calmRed text-white rounded-md hover:bg-opacity-90 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
