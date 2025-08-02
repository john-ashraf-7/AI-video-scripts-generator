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
        
        const fromYear = dateFilter.from ? parseInt(dateFilter.from) : -Infinity;
        const toYear = dateFilter.to ? parseInt(dateFilter.to) : Infinity;
        
        return itemYear >= fromYear && itemYear <= toYear;
      });
    }

    setFilteredItems(filtered);
  }, [searchQuery, searchFilter, dateFilter, items]);

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
    setDateFilter({ from: "", to: "" });
  };

  const handleItemClick = (item) => {
    if (selectedItems.find(selected => selected.id === item.id)) {
      // Remove from selection
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      // Add to selection
      setSelectedItems([...selectedItems, item]);
    }
  };



  const handleSingleSelect = (item) => {
    setProcessingItem(item.id);
    // Scroll to show loading state
    setTimeout(() => {
      const element = document.getElementById('script-results');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    onItemSelect(item);
  };

  const handleBatchProcess = () => {
    if (selectedItems.length > 0) {
      setBatchProcessing(true);
      setBatchProgress({ current: 0, total: selectedItems.length });
      // Scroll to show batch processing
      setTimeout(() => {
        const element = document.getElementById('batch-results');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      onBatchSelect(selectedItems);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Library Collection</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading library items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Library Collection</h2>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadGallery}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Library Collection</h2>
      <p className="text-gray-600 mb-4">Select items from the library collection to generate video scripts:</p>
      
      {/* Search Controls */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search library items..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={searchFilter}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">Search All Fields</option>
              <option value="title">Title Only</option>
              <option value="creator">Creator Only</option>
              <option value="call_number">Call Number Only</option>
              <option value="date">Date Only</option>
            </select>
          </div>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filter by Year:
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={dateFilter.from}
              onChange={(e) => handleDateFilterChange('from', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm min-w-[120px]"
            >
              <option value="">From Year</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <span className="text-gray-500 font-medium">to</span>
            <select
              value={dateFilter.to}
              onChange={(e) => handleDateFilterChange('to', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm min-w-[120px]"
            >
              <option value="">To Year</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          {(searchQuery || dateFilter.from || dateFilter.to) && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
            >
              Clear All Filters
            </button>
          )}
        </div>
        
        {/* Search Results Info */}
        {(searchQuery || dateFilter.from || dateFilter.to) && (
          <div className="text-sm text-gray-600">
            Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            {searchQuery && (
              <span>
                {searchFilter !== "all" && ` in ${searchFilter.replace('_', ' ')}`}
                {` matching "${searchQuery}"`}
              </span>
            )}
            {(dateFilter.from || dateFilter.to) && (
              <span>
                {searchQuery && ' and'} from {dateFilter.from || 'beginning'} to {dateFilter.to || 'present'}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Batch Processing Controls */}
      {selectedItems.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <span className="text-blue-800 font-medium">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2 sm:ml-auto">
              <button
                onClick={() => setSelectedItems([])}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBatchProcess}
                disabled={batchProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {batchProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing... ({batchProgress.current}/{batchProgress.total})
                  </>
                ) : (
                  `Process ${selectedItems.length} Item${selectedItems.length > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const isSelected = selectedItems.find(selected => selected.id === item.id);
          return (
            <div
              key={item.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-blue-50 border-blue-300 shadow-md' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleItemClick(item)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <h3 className="font-semibold text-lg text-blue-800">{item.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                    <div><span className="font-medium">Creator:</span> {item.creator}</div>
                    <div><span className="font-medium">Date:</span> {item.date}</div>
                    <div><span className="font-medium">Call Number:</span> {item.call_number}</div>
                  </div>
                  <p className="text-sm text-gray-700">{item.description}</p>
                </div>
                <div className="ml-4 space-y-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSingleSelect(item);
                    }}
                    disabled={processingItem === item.id}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {processingItem === item.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Processing...
                      </>
                    ) : processingComplete && processingItem === null ? (
                      <>
                        <div className="text-green-600 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Completed!
                        </div>
                      </>
                    ) : (
                      'Generate Script'
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {items.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No library items available.</p>
        </div>
      )}
      
      {items.length > 0 && filteredItems.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-gray-600">No items found matching your search criteria.</p>
          <button
            onClick={clearAllFilters}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
} 