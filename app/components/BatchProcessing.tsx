'use client';

import { useState, useEffect } from 'react';
import { GalleryItem, type ScriptGenerationResponse } from '../../src/api';

interface BatchResult {
  item: GalleryItem;
  result: ScriptGenerationResponse;
}

interface BatchProcessingProps {
  selectedItems: Set<string>;
  allItems: GalleryItem[];
  onClearSelection: () => void;
  compact?: boolean; // New prop for compact mode
}

export default function BatchProcessing({ selectedItems, allItems, onClearSelection, compact = false }: BatchProcessingProps) {
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Fix hydration error by loading localStorage after mount
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('batchResults');
    if (saved) {
      setBatchResults(JSON.parse(saved));
    }
  }, []);

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
      // Save to localStorage
      localStorage.setItem('batchResults', JSON.stringify([...results]));
      
      // Small delay to ensure UI updates are visible
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setBatchProcessing(false);
    onClearSelection(); // Clear selections after processing
    
    // Scroll to results after processing is complete
    setTimeout(() => {
      const resultsSection = document.getElementById('batch-results');
      if (resultsSection) {
        resultsSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 500);
  };

  const handleClearResults = () => {
    setBatchResults([]);
    localStorage.removeItem('batchResults');
  };

  // Compact mode for header
  if (compact) {
    if (!isClient || (selectedItems.size === 0 && batchResults.length === 0)) {
      return null;
    }
    
    return (
      <div>
        {/* Header Controls */}
        <div className="flex items-center space-x-4">
          {selectedItems.size > 0 && (
            <>
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
                onClick={onClearSelection}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Clear Selection
              </button>
            </>
          )}
          {batchResults.length > 0 && (
            <button
              onClick={handleClearResults}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Clear Results
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {batchProcessing && (
          <div className="bg-white p-4 rounded-lg shadow-md mt-4">
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

        {/* Batch Results Display */}
        {batchResults.length > 0 && (
          <div id="batch-results" className="mt-8 mb-12">
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
    );
  }

  // Full mode for main area - only show when there are results or processing
  if (!isClient || (batchResults.length === 0 && !batchProcessing && selectedItems.size === 0)) {
    return null;
  }

  // Full mode for main area
  return (
    <div>
      {/* Selection Controls */}
      {selectedItems.size > 0 && (
        <div className="flex items-center space-x-4 mb-6">
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
            onClick={onClearSelection}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
          >
            Clear Selection
          </button>
        </div>
      )}

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

      {/* Batch Results Display */}
      {batchResults.length > 0 && (
        <div id="batch-results" className="mt-8 mb-12">
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
  );
} 