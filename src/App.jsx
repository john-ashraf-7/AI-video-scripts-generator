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
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-2 text-center">AI Video Script Generator</h1>
      <p className="text-center mb-6">{apiStatus}</p>

      {/* Mode Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-white rounded-lg p-1 shadow-md">
          <button
            onClick={() => setMode("gallery")}
            className={`px-4 py-2 rounded-md transition-colors ${
              mode === "gallery"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            📚 Library Collection
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`px-4 py-2 rounded-md transition-colors ${
              mode === "manual"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-800"
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
        <UploadForm 
          onResult={handleManualSubmit}
          prefillData={selectedItem}
        />
      )}
      
      {/* Single Result */}
      {result && (
        <div id="script-results" className="mt-6">
          <h2 className="text-xl font-bold mb-4 text-center">Generated Script</h2>
          <ScriptViewer result={result} />
        </div>
      )}
      
      {/* Batch Results */}
      {batchResults.length > 0 && (
        <div id="batch-results" className="mt-6">
          <h2 className="text-xl font-bold mb-4 text-center">Batch Processing Results</h2>
          {batchProcessing && (
            <div className="text-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Processing items...</p>
            </div>
          )}
          <div className="space-y-4">
            {batchResults.map((batchResult, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="font-semibold text-lg mb-2 text-blue-800">
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
      )}
    </div>
  );
}

export default App;
