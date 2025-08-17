'use client';

import { useState, useEffect } from 'react';
import { GalleryItem, type ScriptGenerationResponse } from '../../api';
import ScriptViewer from './ScriptViewer';
import SelectedItemsView from './SelectedItemsView';

interface BatchResult {
  item: GalleryItem;
  result: ScriptGenerationResponse;
}

interface BatchProcessingProps {
  selectedItems: Set<string>;
  onClearSelection: () => void;
  onDeselectItem: (itemId: string) => void;
  setFilteredItems: (items: GalleryItem[]) => void;
  clearResults: () => void;
  setHasBatchResults: (hasResults: boolean) => void;
}

export default function BatchProcessing({ selectedItems, onClearSelection, onDeselectItem, setFilteredItems, clearResults, setHasBatchResults}: BatchProcessingProps) {
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Fix hydration error by loading localStorage after mount
  useEffect(() => { 
    setIsClient(true);
    const saved = localStorage.getItem('batchResults');
    if (saved) {
      const savedResults = JSON.parse(saved);
      setBatchResults(savedResults);
      setHasBatchResults(savedResults.length > 0);
    }
  }, [setHasBatchResults]);

  const handleBatchProcess = async () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one item to process.");
      return;
    }
    
    console.log("Selected items:", selectedItems);
    
    setFilteredItems([]);
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: selectedItems.size });
    setBatchResults([]);

    // Instead of filtering from current items, fetch the selected items from the database
    const selectedItemIds = Array.from(selectedItems);
    const results: BatchResult[] = [];

    for (let i = 0; i < selectedItemIds.length; i++) {
      const itemId = selectedItemIds[i];
      
      // Update progress
      setBatchProgress({ current: i + 1, total: selectedItemIds.length });
      
      try {
        // Fetch the item details from the database
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8002';
        const itemResponse = await fetch(`${apiUrl}/gallery/books/${itemId}`);
        
        if (!itemResponse.ok) {
          console.error(`Failed to fetch item ${itemId}:`, itemResponse.status);
          results.push({ 
            item: { _id: itemId, Title: 'Unknown Item' } as GalleryItem, 
            result: { error: `Failed to fetch item: ${itemResponse.status}` }
          });
          continue;
        }
        
        const item: GalleryItem = await itemResponse.json();
        
        // Generate script for this item
        const scriptResponse = await fetch(`${apiUrl}/generate-script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            artifact_type: "publication_deep_dive",
            metadata: {
              title: item.Title || item['Title (English)'] || item['Title (Arabic)'] || 'Untitled',
              creator: item.Creator || item['Creator (Arabic)'] || 'Unknown',
              date: item.Date || 'Unknown',
              description: item.Description || '',
              call_number: item['Call number'] || '',
              // Additional fields for richer context
              subject: item.Subject || '',
              language: item.Language || '',
              collection: item.Collection || '',
              source: item.Source || '',
              publisher: item.Publisher || '',
              location: item.Location || '',
              rights: item.Rights || '',
              notes: item.Notes || '',
              type: item.Type || '',
              genre: item['Genre (AAT)'] || '',
              title_arabic: item['Title (Arabic)'] || '',
              title_english: item['Title (English)'] || '',
              creator_arabic: item['Creator (Arabic)'] || '',
              link_to_catalogue: item['Link to catalogue'] || ''
            }
          })
        });
        
        if (scriptResponse.ok) {
          const result: ScriptGenerationResponse = await scriptResponse.json();
          results.push({ item, result });
        } else {
          const errorText = await scriptResponse.text();
          console.error('API Error:', scriptResponse.status, errorText);
          results.push({ 
            item, 
            result: { error: `Failed to generate script: ${scriptResponse.status}` }
          });
        }
      } catch (error) {
        console.error('Network Error:', error);
        results.push({ 
          item: { _id: itemId, Title: 'Unknown Item' } as GalleryItem, 
          result: { error: error instanceof Error ? error.message : 'Network error' }
        });
      }
      
      // Update results after each item
      setBatchResults([...results]);
      setHasBatchResults(true);
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
    setHasBatchResults(false);
    localStorage.removeItem('batchResults');
    clearResults();
  };

  const handleRegenerate = (index: number, newScript: ScriptGenerationResponse) => {
    const updatedResults = [...batchResults];
    updatedResults[index].result = newScript;
    setBatchResults(updatedResults);
    localStorage.setItem('batchResults', JSON.stringify(updatedResults));
  };

  if (!isClient) {
    return null;
  }

  return (
    <div>
      {/* Selected Items View */}
      {selectedItems.size > 0 && (
        <SelectedItemsView
          selectedItems={selectedItems}
          onDeselectItem={onDeselectItem}
          onClearAll={onClearSelection}
        />
      )}

      {/* Process Button */}
      {selectedItems.size > 0 && (
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={handleBatchProcess}
            disabled={batchProcessing}
            className="bg-calmRed cursor-pointer hover:shadow-lg text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 font-medium"
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
        </div>
      )}

      {batchResults.length > 0 && (
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={handleClearResults}
            className="bg-gray-500 cursor-pointer text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Clear Results
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {batchProcessing && (
        <div className="bg-darkBeige p-4 rounded-lg shadow-md mb-6">
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
          <div className="bg-darkBeige rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
              Batch Processing Results
            </h2>
            <div className="space-y-8">
              {batchResults.map((batchResult, index) => (
                <div key={index} className="bg-lightBeige p-6 rounded-lg">
                  <h3 className="font-semibold text-xl mb-4 text-calmRed">
                    {batchResult.item.Title || batchResult.item['Title (English)'] || batchResult.item['Title (Arabic)'] || 'Untitled'}
                  </h3>
                  
                  {/* Convert GalleryItem to GalleryItemMetadata for ScriptViewer */}
                  <ScriptViewer
                    result={batchResult.result}
                    metadata={{
                      title: batchResult.item.Title || batchResult.item['Title (English)'] || batchResult.item['Title (Arabic)'] || '',
                      creator: batchResult.item.Creator || batchResult.item['Creator (Arabic)'] || '',
                      date: batchResult.item.Date || '',
                      description: batchResult.item.Description || '',
                      call_number: batchResult.item['Call number'] || ''
                    }}
                    artifactType="publication_deep_dive"
                    onRegenerate={(newScript) => handleRegenerate(index, newScript)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 