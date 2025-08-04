import React, { useState, useEffect } from "react";
import { getGallery } from "../api";

export default function Gallery({ onItemSelect, onBatchSelect }) {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("all"); // "all", "title", "creator", "call_number", "date"
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const [availableYears, setAvailableYears] = useState([]);
  const [sortBy, setSortBy] = useState("name"); // "name", "creator", "year", "year_desc"
  const [processingItem, setProcessingItem] = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [processingComplete, setProcessingComplete] = useState(false);

  useEffect(() => {
    loadGallery();
    
    // Listen for state reset events from App component
    const handleResetProcessing = () => {
      setProcessingItem(null);
      setProcessingComplete(true);
      // Hide completion message after 3 seconds
      setTimeout(() => setProcessingComplete(false), 3000);
    };
    
    const handleResetBatchProcessing = () => {
      setBatchProcessing(false);
      setBatchProgress({ current: 0, total: 0 });
    };
    
    const handleBatchProgressUpdate = (event) => {
      setBatchProgress(event.detail);
    };
    
    window.addEventListener('resetProcessingState', handleResetProcessing);
    window.addEventListener('resetBatchProcessingState', handleResetBatchProcessing);
    window.addEventListener('updateBatchProgress', handleBatchProgressUpdate);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('resetProcessingState', handleResetProcessing);
      window.removeEventListener('resetBatchProcessingState', handleResetBatchProcessing);
      window.removeEventListener('updateBatchProgress', handleBatchProgressUpdate);
    };
  }, []);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const data = await getGallery();
      setItems(data.items || []);
      setFilteredItems(data.items || []);
      
      // Extract unique years for date filtering
      const years = [...new Set(data.items.map(item => {
        const year = parseInt(item.date);
        return isNaN(year) ? null : year;
      }).filter(year => year !== null))].sort((a, b) => a - b);
      setAvailableYears(years);
    } catch (err) {
      setError("Failed to load gallery items");
      console.error("Gallery loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on search query, filter type, and date range
  useEffect(() => {
    let filtered = items;

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
        
        const fromYear = dateFilter.from ? parseInt(dateFilter.from) : null;
        const toYear = dateFilter.to ? parseInt(dateFilter.to) : null;
        
        if (fromYear && toYear) {
          return itemYear >= fromYear && itemYear <= toYear;
        } else if (fromYear) {
          return itemYear >= fromYear;
        } else if (toYear) {
          return itemYear <= toYear;
        }
        return true;
      });
    }

    // Apply sorting
    const sortedItems = sortItems(filtered);
    setFilteredItems(sortedItems);
  }, [items, searchQuery, searchFilter, dateFilter, sortBy]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (e) => {
    setSearchFilter(e.target.value);
  };

  const handleDateFilterChange = (type, value) => {
    setDateFilter(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSearchFilter("all");
    setDateFilter({ from: "", to: "" });
    setSortBy("name");
  };

  const sortItems = (items) => {
    return [...items].sort((a, b) => {
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

  const handleItemClick = (item) => {
    onItemSelect(item);
  };

  const handleSingleSelect = (item) => {
    setProcessingItem(item.id);
    
    // Simulate processing delay
    setTimeout(() => {
      onItemSelect(item);
      setProcessingItem(null);
    }, 1000);
  };

  const handleBatchProcess = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to process.");
      return;
    }
    
    // Start batch processing immediately with visual feedback
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: selectedItems.length });
    
    const selectedItemData = selectedItems.map(id => 
      filteredItems.find(item => item.id === id)
    ).filter(Boolean);
    
    onBatchSelect(selectedItemData);
    setSelectedItems([]);
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-calmRed"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-offWhite p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
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

          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search By
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

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year Range
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="From"
                value={dateFilter.from}
                onChange={(e) => handleDateFilterChange("from", e.target.value)}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
              />
              <input
                type="number"
                placeholder="To"
                value={dateFilter.to}
                onChange={(e) => handleDateFilterChange("to", e.target.value)}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
            >
              <option value="name">Name (A-Z)</option>
              <option value="creator">Creator (A-Z)</option>
              <option value="year">Year (Oldest First)</option>
              <option value="year_desc">Year (Newest First)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-calmRed transition-colors"
          >
            Clear All Filters
          </button>
          
          {/* Batch Processing Button */}
          {selectedItems.length > 0 && (
            <button
              onClick={handleBatchProcess}
              disabled={batchProcessing}
              className="bg-calmRed text-white px-6 py-2 rounded-md hover:shadow-lg transition duration-200 disabled:opacity-50"
            >
              {batchProcessing ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing... ({batchProgress.current}/{batchProgress.total})</span>
                </span>
              ) : (
                `Process ${selectedItems.length} Items`
              )}
            </button>
          )}
        </div>
      </div>

      {/* Batch Processing Progress Bar */}
      {batchProcessing && (
        <div className="bg-offWhite p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Processing {batchProgress.total} items...
            </span>
            <span className="text-sm text-gray-500">
              {batchProgress.current} of {batchProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-calmRed h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            {batchProgress.current > 0 ? 'Generating scripts...' : 'Starting batch processing...'}
          </div>
        </div>
      )}

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
            {/* Image Placeholder */}
            <div className="flex-1 relative bg-gray-100 rounded overflow-hidden image-placeholder">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📚</div>
                  <div className="text-xs">Library Item</div>
                </div>
              </div>
            </div>

            {/* Item Info - Scrollable */}
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
              {selectedItems.includes(item.id) ? (
                <button
                  onClick={() => toggleItemSelection(item.id)}
                  className="w-full bg-gray-400 text-white text-sm py-2 rounded transition-colors"
                >
                  Selected
                </button>
              ) : (
                <button
                  onClick={() => toggleItemSelection(item.id)}
                  className="w-full bg-calmRed text-white text-sm py-2 rounded hover:bg-opacity-90 transition-colors"
                >
                  Select Item
                </button>
              )}
              
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

      {/* Processing Complete Message */}
      {processingComplete && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg">
          Script generated successfully!
        </div>
      )}

      {/* No Results */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No items found matching your criteria.</p>
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