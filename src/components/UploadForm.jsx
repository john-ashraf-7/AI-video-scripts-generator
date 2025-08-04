import React, { useState, useEffect } from "react";
import { generateScript } from "../api";

export default function UploadForm({ onResult, prefillData }) {
  const [formData, setFormData] = useState({
    title: "",
    creator: "",
    date: "",
    description: "",
    call_number: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await generateScript({
        artifact_type: "publication_deep_dive",
        metadata: formData
      });
      onResult(result);
    } catch (err) {
      setError(err.message || "Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Manual Script Generation
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
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

          {/* Creator */}
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

          {/* Date */}
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

          {/* Call Number */}
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

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-calmRed focus:border-transparent resize-none"
              placeholder="Enter a description of the item"
            />
          </div>
        </div>

        {/* Error Message */}
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
