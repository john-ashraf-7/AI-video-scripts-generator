import React, { useState, useEffect } from "react";
import UploadForm from ".-components-UploadForm";
import ScriptViewer from ".-components-ScriptViewer";
import { healthCheck } from ".-api";

function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [result, setResult] = useState(null);

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-2 text-center">AI Video Script Generator</h1>
      <p className="text-center mb-6">{apiStatus}</p>

      <UploadForm onResult={(res) => setResult(res)} />
      <ScriptViewer result={result} />
    </div>
  );
}

export default App;
