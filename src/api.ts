// Using native fetch API instead of axios for better compatibility

/**
 * Base URL for the backend API
 * Change this if the backend is running on a different host/port
 */
const API_BASE_URL = "http://localhost:8002";

/**
 * Interface for health check response
 */
interface HealthCheckResponse {
  status: string;
  message?: string;
  timestamp?: string;
}

/**
 * Interface for gallery item metadata
 */
interface GalleryItemMetadata {
  title: string;
  creator: string;
  date: string;
  description?: string;
  call_number: string;
}

/**
 * Interface for gallery item
 */
interface GalleryItem {
  id: string;
  title: string;
  creator: string;
  date: string;
  call_number: string;
  description?: string;
}

/**
 * Interface for gallery response
 */
interface GalleryResponse {
  items: GalleryItem[];
  total?: number;
  message?: string;
}

/**
 * Interface for script generation request data
 */
interface ScriptGenerationRequest {
  artifact_type: string;           // Type of artifact (e.g., "publication_deep_dive")
  metadata: GalleryItemMetadata;   // Item metadata for script generation
}

/**
 * Interface for script generation response
 */
interface ScriptGenerationResponse {
  qc_passed?: boolean;                    // Quality control status
  qc_message?: string;                    // Quality control feedback
  english_script?: string;                // Generated English script
  arabic_translation_refined?: string;    // Refined Arabic translation
  error?: string;                         // Error message if generation failed
  processing_time?: number;               // Time taken for processing
  metadata?: GalleryItemMetadata;         // Original metadata used
}

/**
 * Health Check API
 * 
 * Checks if the backend API is running and accessible.
 * Useful for monitoring API availability and debugging connection issues.
 * 
 * @returns Promise<HealthCheckResponse> - Health status information
 * @throws Error if the API is unreachable or returns an error
 */
export const healthCheck = async (): Promise<HealthCheckResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: HealthCheckResponse = await response.json();
    return data;
  } catch (error) {
    // Re-throw with more descriptive error message
    throw new Error(`Health check failed: ${(error as Error).message || 'Unknown error'}`);
  }
};

/**
 * Generate Script API
 * 
 * Sends a request to generate a video script based on library item metadata.
 * The backend processes the metadata using AI models to create both English
 * scripts and Arabic translations with quality control.
 * 
 * @param requestData - The script generation request containing artifact type and metadata
 * @returns Promise<ScriptGenerationResponse> - Generated script data with QC results
 * @throws Error if the generation fails or API returns an error
 */
export const generateScript = async (
  requestData: ScriptGenerationRequest
): Promise<ScriptGenerationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = 'Script generation failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
    
    const data: ScriptGenerationResponse = await response.json();
    return data;
  } catch (error) {
    // Handle fetch-specific errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('No response from server. Please check if the backend is running.');
    }
    // Re-throw existing errors or create generic error
    throw error instanceof Error ? error : new Error(`Script generation failed: ${String(error)}`);
  }
};

/**
 * Get Gallery API
 * 
 * Retrieves the list of available library items from the backend.
 * These items can be used for script generation either individually
 * or in batch processing mode.
 * 
 * @returns Promise<GalleryResponse> - List of gallery items with metadata
 * @throws Error if the gallery data cannot be retrieved
 */
export const getGallery = async (): Promise<GalleryResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gallery`);
    
    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = 'Failed to load gallery';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
    
    const data: GalleryResponse = await response.json();
    return data;
  } catch (error) {
    // Handle fetch-specific errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('No response from server. Please check if the backend is running.');
    }
    // Re-throw existing errors or create generic error
    throw error instanceof Error ? error : new Error(`Gallery loading failed: ${String(error)}`);
  }
};

/**
 * Export types for use in other components
 */
export type {
  HealthCheckResponse,
  GalleryItem,
  GalleryItemMetadata,
  GalleryResponse,
  ScriptGenerationRequest,
  ScriptGenerationResponse,
};
