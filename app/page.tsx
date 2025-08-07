'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Item from './components/Item';
import SearchAndFilter from './components/SearchAndFilter';
import {getGalleryPage, GalleryItem, type ScriptGenerationResponse} from '../src/api';

interface BatchResult {
  item: GalleryItem;
  result: ScriptGenerationResponse;
}

export default function Home() {
  const searchParams = useSearchParams();
  const processedSelection = useRef(false);
  const [allItems, setAllItems] = useState<GalleryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    // Load saved selections from localStorage on component mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedItems');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const records = await getGalleryPage(1, 100);
        setAllItems(records.books || []);
        setFilteredItems(records.books || []);
        
        // Check if there's a select parameter in the URL (only process once)
        const selectId = searchParams.get('select');
        if (selectId && !processedSelection.current) {
          processedSelection.current = true;
          // Find the item with the matching _id and select it
          const itemToSelect = records.books?.find(item => item._id === selectId);
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
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [searchParams]);

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

  // Batch processing
  const handleBatchProcess = async () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one item to process.");
      return;
    }

    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: selectedItems.size });
    setBatchResults([]);

    const selectedItemData = allItems.filter(item => selectedItems.has(item.id.toString()));
    const results: BatchResult[] = [];

    for (let i = 0; i < selectedItemData.length; i++) {
      const item = selectedItemData[i];
      
      // Update progress
      setBatchProgress({ current: i + 1, total: selectedItemData.length });
      
      try {
        const response = await fetch('http://localhost:8002/generate-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            artifact_type: "publication_deep_dive",
            metadata: {
              title: item.Title,
              creator: item.Creator,
              date: item.Date,
              description: item.Description,
              call_number: item['Call number'],
              // Additional fields for richer context
              subject: item.Subject,
              language: item.Language,
              collection: item.Collection,
              source: item.Source,
              publisher: item.Publisher,
              location: item.Location,
              rights: item.Rights,
              notes: item.Notes,
              type: item.Type,
              genre: item['Genre (AAT)'],
              title_arabic: item['Title (Arabic)'],
              title_english: item['Title (English)'],
              creator_arabic: item['Creator (Arabic)'],
              link_to_catalogue: item['Link to catalogue']
            }
          })
        });
        
        if (response.ok) {
          const result: ScriptGenerationResponse = await response.json();
          results.push({ item, result });
        } else {
          results.push({ 
            item, 
            result: { error: 'Failed to generate script' }
          });
        }
      } catch (error) {
        results.push({ 
          item, 
          result: { error: error instanceof Error ? error.message : 'Network error' }
        });
      }
      
      // Update results after each item
      setBatchResults([...results]);
      
      // Small delay to ensure UI updates are visible
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setBatchProcessing(false);
    setSelectedItems(new Set()); // Clear selections after processing
    
    // Scroll to results after processing is complete
    setTimeout(() => {
      const resultsSection = document.getElementById('batch-results');
      if (resultsSection) {
        resultsSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 500); // Small delay to ensure results are rendered
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
  const handleSortChange = (sort: string) => {
    const sorted = [...filteredItems].sort((a, b) => {
      switch (sort) {
        case 'name':
          return (a.Title || '').localeCompare(b.Title || '');
        case 'creator':
          return (a.Creator || '').localeCompare(b.Creator || '');
        case 'year':
          const yearA = parseInt(a.Date || '0') || 0;
          const yearB = parseInt(b.Date || '0') || 0;
          return yearA - yearB;
        case 'year_desc':
          const yearADesc = parseInt(a.Date || '0') || 0;
          const yearBDesc = parseInt(b.Date || '0') || 0;
          return yearBDesc - yearADesc;
        default:
          return 0;
      }
    });
    setFilteredItems(sorted);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilteredItems(allItems);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-lightBeige flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-calmRed"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lightBeige">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filter */}
        <SearchAndFilter
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
        />

        {/* Results and Selection Info */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing {filteredItems.length} of {allItems.length} items
          </p>
          {selectedItems.size > 0 && (
            <div className="flex items-center space-x-4">
              <div className="bg-calmRed text-white px-4 py-2 rounded-lg">
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </div>
              <button
                onClick={handleBatchProcess}
                disabled={batchProcessing}
                className="bg-calmRed text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 font-medium"
              >
                {batchProcessing ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </span>
                ) : (
                  `Process ${selectedItems.size} Items`
                )}
              </button>
              <button
                onClick={() => {
                  setSelectedItems(new Set());
                  localStorage.removeItem('selectedItems');
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* Batch Processing Progress Bar */}
        {batchProcessing && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
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

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item: GalleryItem) => (
            <Item 
              key={item.id} 
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

        {/* Batch Results Display */}
        {batchResults.length > 0 && (
          <div id="batch-results" className="mt-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
                Batch Processing Results
              </h2>
              <div className="space-y-6">
                {batchResults.map((batchResult, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2 text-calmRed">
                      {batchResult.item.Title}
                    </h3>
                    {batchResult.result.error ? (
                      <p className="text-red-600">Error: {batchResult.result.error}</p>
                    ) : (
                      <div className="space-y-4">
                        {batchResult.result.english_script && (
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-2">English Script:</h4>
                            <div className="bg-white p-3 rounded border whitespace-pre-wrap">
                              {batchResult.result.english_script}
                            </div>
                          </div>
                        )}
                        {batchResult.result.arabic_translation_refined && (
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Arabic Translation:</h4>
                            <div className="bg-white p-3 rounded border whitespace-pre-wrap text-right" dir="rtl">
                              {batchResult.result.arabic_translation_refined}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}