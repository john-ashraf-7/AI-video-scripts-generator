import React, { useState, useEffect } from "react";
import { getGallery } from "../api";

export default function Gallery({ onItemSelect, onBatchSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const data = await getGallery();
      setItems(data.items || []);
    } catch (err) {
      setError("Failed to load gallery items");
      console.error("Gallery loading error:", err);
    } finally {
      setLoading(false);
    }
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

  const handleBatchProcess = () => {
    if (selectedItems.length > 0) {
      onBatchSelect(selectedItems);
    }
  };

  const handleSingleSelect = (item) => {
    onItemSelect(item);
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
      <p className="text-gray-600 mb-6">Select items from the library collection to generate video scripts:</p>
      
      {/* Batch Processing Controls */}
      {selectedItems.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-blue-800 font-medium">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </span>
            <div className="space-x-2">
              <button
                onClick={() => setSelectedItems([])}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBatchProcess}
                className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Process {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {items.map((item) => {
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
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Generate Script
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
    </div>
  );
} 