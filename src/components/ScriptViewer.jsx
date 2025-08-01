import React from "react";

export default function ScriptViewer({ result }) {
  if (!result) return null;

  return (
    <div className="bg-gray-100 p-4 rounded-2xl shadow-md w-full max-w-3xl mx-auto mt-5">
      <h2 className="text-lg font-bold mb-2">Generated Script</h2>
      <p className="text-sm text-gray-500 mb-3">
        QC Status: {result.qc_passed ? "✅ Passed" : "❌ Failed"} - {result.qc_message}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">English</h3>
          <div className="p-3 bg-white border rounded max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">{result.english_script}</pre>
          </div>
        </div>
        {result.arabic_translation_refined && (
          <div>
            <h3 className="font-semibold mb-2">Arabic</h3>
            <div className="p-3 bg-white border rounded max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed" dir="rtl">{result.arabic_translation_refined}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
