import React from "react";

// Type definitions
interface ScriptResult {
  qc_passed: boolean;
  qc_message: string;
  english_script: string;
  arabic_script: string;
  arabic_translation_refined?: string;
}

interface ScriptViewerProps {
  result: ScriptResult | null;
}

export default function ScriptViewer({ result }: ScriptViewerProps) {
  if (!result) return null;

  return (
    <div className="bg-gray-100 p-4 rounded-2xl shadow-md w-full max-w-3xl mx-auto mt-5">
      <h2 className="text-lg font-bold mb-2">Generated Script</h2>
      <p className="text-sm text-gray-500 mb-3">
        QC Status: {result.qc_passed ? "✅ Passed" : "❌ Failed"} - {result.qc_message}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold">English</h3>
          <pre className="p-2 bg-white border rounded">{result.english_script}</pre>
        </div>
        {(result.arabic_translation_refined || result.arabic_script) && (
          <div>
            <h3 className="font-semibold">Arabic</h3>
            <pre className="p-2 bg-white border rounded">
              {result.arabic_translation_refined || result.arabic_script}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
