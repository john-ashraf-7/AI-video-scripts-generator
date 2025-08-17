"use client";

import React, { useState } from "react";
import { type ScriptGenerationResponse, type GalleryItemMetadata, type AudioGenerationResponse } from "../../api";
import RegenerateScript from "./RegenerateScript";
import GenerateAudio from "./GenerateAudio";

/**
 * Props interface for the ScriptViewer component
 */
interface ScriptViewerProps {
  result: ScriptGenerationResponse | null;   // Script result data or null if no result
  metadata?: GalleryItemMetadata;            // Original metadata used for generation
  artifactType?: string;                     // Type of artifact
  onRegenerate?: (newScript: ScriptGenerationResponse) => void;  // Callback for regeneration
}

/**
 * ScriptViewer Component
 * 
 * Displays the results of script generation including:
 * - Quality control status and messages
 * - English script content
 * - Arabic translation
 * - Error messages if any
 * - Simple regeneration with comments
 * 
 * @param result - The script generation result object
 * @param metadata - The original metadata used for generation
 * @param artifactType - The type of artifact
 * @param onRegenerate - Callback function when script is regenerated
 * @returns JSX element displaying the script results or null if no result
 */
export default function ScriptViewer({ result, metadata, artifactType, onRegenerate }: ScriptViewerProps) {
  const [currentResult, setCurrentResult] = useState<ScriptGenerationResponse | null>(result);

  // Update current result when prop changes
  React.useEffect(() => {
    setCurrentResult(result);
  }, [result]);

  // Early return if no result data is provided
  if (!currentResult) return null;

  const handleRegenerate = (newScript: ScriptGenerationResponse) => {
    setCurrentResult(newScript);
    if (onRegenerate) {
      onRegenerate(newScript);
    }
  };

  return (
    <div className="space-y-6">
      {/* Regenerated Script Indicator */}
      {currentResult.regenerated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-medium text-blue-800">
              Script Regenerated with Comments
            </span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            This script has been improved based on your comments.
          </p>
        </div>
      )}

      {/* Quality Control Status Section */}
      {currentResult.qc_passed !== undefined && (
        <div className={`p-4 rounded-lg ${
          currentResult.qc_passed 
            ? 'bg-green-50 border border-green-200'  // Success styling
            : 'bg-red-50 border border-red-200'      // Failure styling
        }`}>
          {/* QC Status Header with colored indicator */}
          <div className="flex items-center space-x-2">
            {/* Colored status indicator dot */}
            <div className={`w-4 h-4 rounded-full ${
              currentResult.qc_passed ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            
            {/* Status text with appropriate coloring */}
            <span className={`font-medium ${
              currentResult.qc_passed ? 'text-green-800' : 'text-red-800'
            }`}>
              Quality Control: {currentResult.qc_passed ? 'PASSED' : 'FAILED'}
            </span>
          </div>
          
          {/* QC Message (if provided) */}
          {currentResult.qc_message && (
            <p className={`text-sm mt-2 ${
              currentResult.qc_passed ? 'text-green-700' : 'text-red-700'
            }`}>
              {currentResult.qc_message}
            </p>
          )}
        </div>
      )}

      {/* English Script Section */}
      {currentResult.english_script && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-calmRed">
            English Script
          </h3>
          <div className="prose max-w-none">
            {/* Pre-formatted text to preserve script formatting */}
            <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-4 rounded border">
              {currentResult.english_script}
            </pre>
          </div>
        </div>
      )}

      {/* Arabic Translation Section */}
      {currentResult.arabic_translation_refined && (
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
              {currentResult.arabic_translation_refined}
            </pre>
          </div>
        </div>
      )}

      {/* Error Display Section */}
      {currentResult.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-red-800">
            Error
          </h3>
          <p className="text-red-700">{currentResult.error}</p>
        </div>
      )}

      {/* Action Buttons Section */}
      {metadata && artifactType && currentResult.english_script && !currentResult.error && (
        <div className="flex flex-wrap gap-4">
          {/* Generate Audio Section */}
          <GenerateAudio
            script={currentResult.english_script}
            onAudioGenerated={(audioInfo) => {
              console.log("Audio generated:", audioInfo);
            }}
          />
          
          {/* Regenerate Script Section */}
          <RegenerateScript
            originalMetadata={metadata}
            originalScript={currentResult.english_script}
            artifactType={artifactType}
            onRegenerate={handleRegenerate}
          />
        </div>
      )}
    </div>
  );
}
