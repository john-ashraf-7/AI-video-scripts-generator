"use client";

import React, { useState } from "react";
import { 
  regenerateScriptWithComments,
  type RegenerateScriptRequest,
  type ScriptGenerationResponse,
  type GalleryItemMetadata
} from "../../api";

interface RegenerateScriptProps {
  originalMetadata: GalleryItemMetadata;
  originalScript: string;
  originalArabicScript?: string;
  artifactType: string;
  onRegenerate: (newScript: ScriptGenerationResponse) => void;
}

export default function RegenerateScript({
  originalMetadata,
  originalScript,
  originalArabicScript,
  artifactType,
  onRegenerate
}: RegenerateScriptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [regenerateEnglish, setRegenerateEnglish] = useState(true);
  const [regenerateArabic, setRegenerateArabic] = useState(true);

  const handleRegenerate = async () => {
    if (!regenerateEnglish && !regenerateArabic) {
      setMessage("Please select at least one option to regenerate.");
      return;
    }
    
    if (!comments.trim()) {
      setMessage("Please provide comments before regenerating.");
      return;
    }

    setIsRegenerating(true);
    setMessage("");

    try {
      const regenerateData: RegenerateScriptRequest = {
        original_metadata: originalMetadata,
        artifact_type: artifactType,
        user_comments: comments,
        original_script: originalScript,
        original_arabic_script: originalArabicScript,
        regenerate_english: regenerateEnglish,
        regenerate_arabic: regenerateArabic
      };

      const newScript = await regenerateScriptWithComments(regenerateData);
      
      onRegenerate(newScript);
      setMessage("Script regenerated successfully!");
      setIsOpen(false);
      setComments("");

    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="mt-6">
      {/* Regenerate Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{isOpen ? "Hide Regeneration" : "Regenerate Script"}</span>
      </button>

      {/* Regeneration Form */}
      {isOpen && (
        <div className="mt-4 bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">
            Regenerate Script with Comments
          </h3>

          {/* Regeneration Options */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to regenerate? *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={regenerateEnglish}
                  onChange={(e) => setRegenerateEnglish(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">English Script</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={regenerateArabic}
                  onChange={(e) => setRegenerateArabic(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Arabic Translation</span>
              </label>
            </div>
            {!regenerateEnglish && !regenerateArabic && (
              <p className="text-sm text-red-600 mt-1">
                Please select at least one option to regenerate.
              </p>
            )}
          </div>

          {/* Comments Text */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Comments *
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Tell us what you'd like to change or improve in the script..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              required
            />
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-3 rounded-md ${
              message.includes("Error") 
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}>
              {message}
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate Script"}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> Choose what you want to regenerate and be specific about your changes. For example: 
              &ldquo;Make the English script more engaging&rdquo;, &ldquo;Improve the Arabic translation&rdquo;, 
              or &ldquo;Change the tone to be more formal&rdquo;.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
