import React from "react";
import { type ScriptGenerationResponse } from "../../api";

/**
 * Props interface for the ScriptViewer component
 */
interface ScriptViewerProps {
  result: ScriptGenerationResponse | null;   // Script result data or null if no result
}

/**
 * ScriptViewer Component
 * 
 * Displays the results of script generation including:
 * - Quality control status and messages
 * - English script content
 * - Arabic translation
 * - Error messages if any
 * 
 * @param result - The script generation result object
 * @returns JSX element displaying the script results or null if no result
 */
export default function ScriptViewer({ result }: ScriptViewerProps) {
  // Early return if no result data is provided
  if (!result) return null;

  return (
    <div className="space-y-6">
      {/* Quality Control Status Section */}
      {result.qc_passed !== undefined && (
        <div className={`p-4 rounded-lg ${
          result.qc_passed 
            ? 'bg-green-50 border border-green-200'  // Success styling
            : 'bg-red-50 border border-red-200'      // Failure styling
        }`}>
          {/* QC Status Header with colored indicator */}
          <div className="flex items-center space-x-2">
            {/* Colored status indicator dot */}
            <div className={`w-4 h-4 rounded-full ${
              result.qc_passed ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            
            {/* Status text with appropriate coloring */}
            <span className={`font-medium ${
              result.qc_passed ? 'text-green-800' : 'text-red-800'
            }`}>
              Quality Control: {result.qc_passed ? 'PASSED' : 'FAILED'}
            </span>
          </div>
          
          {/* QC Message (if provided) */}
          {result.qc_message && (
            <p className={`text-sm mt-2 ${
              result.qc_passed ? 'text-green-700' : 'text-red-700'
            }`}>
              {result.qc_message}
            </p>
          )}
        </div>
      )}

      {/* English Script Section */}
      {result.english_script && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-calmRed">
            English Script
          </h3>
          <div className="prose max-w-none">
            {/* Pre-formatted text to preserve script formatting */}
            <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-4 rounded border">
              {result.english_script}
            </pre>
          </div>
        </div>
      )}

      {/* Arabic Translation Section */}
      {result.arabic_translation_refined && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-calmRed">
            Arabic Translation
          </h3>
          <div className="prose max-w-none">
            {/* Pre-formatted text with RTL direction for Arabic */}
            <pre 
              className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-4 rounded border" 
              dir="rtl"
            >
              {result.arabic_translation_refined}
            </pre>
          </div>
        </div>
      )}

      {/* Error Display Section */}
      {result.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-red-800">
            Error
          </h3>
          <p className="text-red-700">{result.error}</p>
        </div>
      )}
    </div>
  );
}
