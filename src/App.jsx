import React, { useState, useEffect } from "react";
import UploadForm from "./components/UploadForm";
import ScriptViewer from "./components/ScriptViewer";
import Gallery from "./components/Gallery";
import { healthCheck } from "./api";

function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState("gallery"); // "gallery" or "manual"
  const [selectedItem, setSelectedItem] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const status = await healthCheck();
        setApiStatus(`✅ API running (Model: ${status.ollama_model})`);
      } catch {
        setApiStatus("❌ API not reachable");
      }
    }
    check();
  }, []);

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setMode("manual");
  };

  const handleManualSubmit = (res) => {
    setResult(res);
    setSelectedItem(null);
    // Reset processing state in Gallery
    window.dispatchEvent(new CustomEvent('resetProcessingState'));
  };

  const handleBatchSelect = async (items) => {
    setBatchProcessing(true);
    setBatchResults([]);
    
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Update progress at start of processing this item
      window.dispatchEvent(new CustomEvent('updateBatchProgress', {
        detail: { current: i + 1, total: items.length }
      }));
      
      try {
        const response = await fetch('http://localhost:8002/generate-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            artifact_type: "publication_deep_dive",
            metadata: item
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          results.push({
            item: item,
            result: result
          });
          setBatchResults([...results]); // Update with each result
        } else {
          results.push({
            item: item,
            result: { error: 'Failed to generate script' }
          });
          setBatchResults([...results]); // Update with error result too
        }
      } catch (error) {
        results.push({
          item: item,
          result: { error: error.message }
        });
        setBatchResults([...results]); // Update with error result too
      }
      
      // Small delay to ensure UI updates are visible
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setBatchProcessing(false);
    // Reset batch processing state in Gallery
    window.dispatchEvent(new CustomEvent('resetBatchProcessingState'));
  };

  return (
    <div className="min-h-screen bg-lightBeige p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">AI Video Script Generator</h1>
          <p className="text-gray-600">{apiStatus}</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-offWhite rounded-lg p-1 shadow-md">
            <button
              onClick={() => setMode("gallery")}
              className={`px-6 py-3 rounded-md transition-all duration-200 font-medium ${
                mode === "gallery"
                  ? "bg-calmRed text-white shadow-lg"
                  : "text-gray-600 hover:text-calmRed"
              }`}
            >
              📚 Library Collection
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-6 py-3 rounded-md transition-all duration-200 font-medium ${
                mode === "manual"
                  ? "bg-calmRed text-white shadow-lg"
                  : "text-gray-600 hover:text-calmRed"
              }`}
            >
              ✏️ Manual Entry
            </button>
          </div>
        </div>

        {/* Content */}
        {mode === "gallery" && (
          <Gallery 
            onItemSelect={handleItemSelect} 
            onBatchSelect={handleBatchSelect}
          />
        )}
        
        {mode === "manual" && (
          <div className="bg-offWhite rounded-lg shadow-md p-6">
            <UploadForm 
              onResult={handleManualSubmit}
              prefillData={selectedItem}
            />
          </div>
        )}
        
        {/* Single Result */}
        {result && (
          <div id="script-results" className="mt-8">
            <div className="bg-offWhite rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-center text-gray-800">Generated Script</h2>
              <ScriptViewer result={result} />
            </div>
          </div>
        )}
        
        {/* Batch Results */}
        {batchResults.length > 0 && (
          <div id="batch-results" className="mt-8">
            <div className="bg-offWhite rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-center text-gray-800">Batch Processing Results</h2>
              {batchProcessing && (
                <div className="text-center mb-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-calmRed mx-auto"></div>
                  <p className="mt-2 text-gray-600">Processing items...</p>
                </div>
              )}
              <div className="space-y-6">
                {batchResults.map((batchResult, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="font-semibold text-lg mb-2 text-calmRed">
                      {batchResult.item.title}
                    </h3>
                    {batchResult.result.error ? (
                      <p className="text-red-600">Error: {batchResult.result.error}</p>
                    ) : (
                      <ScriptViewer result={batchResult.result} />
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

export default App;
