import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { generateScript, type ScriptGenerationResponse, type GalleryItemMetadata } from "../../src/api";

/**
 * Interface for form data structure (extends API metadata interface)
 * Contains all metadata fields required for script generation
 */
interface FormData extends GalleryItemMetadata {
  // All fields inherited from GalleryItemMetadata
}

/**
 * Interface for prefill data (optional data to populate form)
 */
interface PrefillData {
  title?: string;
  creator?: string;
  date?: string;
  description?: string;
  call_number?: string;
}

/**
 * Props interface for the UploadForm component
 */
interface UploadFormProps {
  onResult: (result: ScriptGenerationResponse) => void;  // Callback when script is generated
  prefillData?: PrefillData | null;                     // Optional data to prefill form
}

/**
 * UploadForm Component
 * 
 * Provides a manual form interface for script generation.
 * Users can input metadata about library items and generate scripts.
 * 
 * Features:
 * - Form validation for required fields
 * - Loading states during generation
 * - Error handling and display
 * - Prefill capability from gallery items
 * 
 * @param onResult - Callback function to handle generated script results
 * @param prefillData - Optional data to prefill the form fields
 */
export default function UploadForm({ onResult, prefillData }: UploadFormProps) {
  // Form data state with initial empty values
  const [formData, setFormData] = useState<FormData>({
    title: "",
    creator: "",
    date: "",
    description: "",
    call_number: ""
  });

  // Loading state for form submission
  const [loading, setLoading] = useState<boolean>(false);
  
  // Error state for displaying error messages
  const [error, setError] = useState<string>("");

  /**
   * Effect to populate form when prefillData is provided
   * Runs when prefillData prop changes
   */
  useEffect(() => {
    if (prefillData) {
      setFormData({
        title: prefillData.title || "",
        creator: prefillData.creator || "",
        date: prefillData.date || "",
        description: prefillData.description || "",
        call_number: prefillData.call_number || ""
      });
    }
  }, [prefillData]);

  /**
   * Handles input field changes
   * Updates the corresponding field in formData state
   * 
   * @param e - Change event from input/textarea elements
   */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handles form submission
   * Validates data, calls API, and handles results/errors
   * 
   * @param e - Form submission event
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();  // Prevent default form submission
    setLoading(true);    // Show loading state
    setError("");        // Clear previous errors

    try {
      // Call API to generate script with form data
      const result = await generateScript({
        artifact_type: "publication_deep_dive",
        metadata: formData
      });
      
      // Pass result to parent component
      onResult(result);
    } catch (err) {
      // Handle and display errors
      const errorMessage = err instanceof Error ? err.message : "Failed to generate script";
      setError(errorMessage);
    } finally {
      setLoading(false);  // Hide loading state
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Form Header */}
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Manual Script Generation
      </h2>
      
      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Title Field (spans full width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
              placeholder="Enter the title of the item"
            />
          </div>

          {/* Creator Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Creator *
            </label>
            <input
              type="text"
              name="creator"
              value={formData.creator}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
              placeholder="Enter the creator/author"
            />
          </div>

          {/* Date Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="text"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
              placeholder="Enter the date (e.g., 1938)"
            />
          </div>

          {/* Call Number Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call Number
            </label>
            <input
              type="text"
              name="call_number"
              value={formData.call_number}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent"
              placeholder="Enter the call number"
            />
          </div>

          {/* Description Field (spans full width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent resize-none"
              placeholder="Enter a description of the item"
            />
          </div>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="bg-calmRed text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                {/* Loading spinner */}
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating Script...</span>
              </span>
            ) : (
              "Generate Script"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
