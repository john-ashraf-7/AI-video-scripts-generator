// Using native fetch API instead of axios for better compatibility

/**
 * Base URL for the backend API
 * Uses environment variable with fallback to localhost for development
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8002";

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
  _id: string;
  id?: number | null;
  Title?: string | null;
  Creator?: string | null;
  Date?: string | null;
  'Call number'?: string | null;
  Description?: string | null;
  'Image URL'?: string | null;
  'Title (English)'?: string | null;
  'Title (Arabic)'?: string | null;
  'Creator (Arabic)'?: string | null;
  'Location-Governorate (English)'?: string | null;
  'Location-Governorate (Arabic)'?: string | null;
  'Location-Country (English)'?: string | null;
  'Location-Country (Arabic)'?: string | null;
  'Subject LC'?: string | null;
  'Keywords (English)'?: string | null;
  'Keywords (Arabic)'?: string | null;
  Medium?: string | null;
  Type?: string | null;
  Collection?: string | null;
  Source?: string | null;
  'Access Rights'?: string | null;
  Publisher?: string | null;
  Notes?: string | null;
  Location?: string | null;
  Subject?: string | null;
  'Genre (AAT)'?: string | null;
  Language?: string | null;
  Rights?: string | null;
  'Link to catalogue'?: string | null;
}


/**
 * Interface for gallery API response
 */
interface GalleryResponse {
  books: GalleryItem[];
  page: number;
  limit: number;
  total: number;        // total matching records in DB
  total_pages: number;  // total number of pages
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
  regenerated?: boolean;                  // Whether this is a regenerated script
  comments_incorporated?: boolean;        // Whether comments were incorporated
}

/**
 * Interface for script regeneration request
 */
interface RegenerateScriptRequest {
  original_metadata: GalleryItemMetadata;
  artifact_type: string;
  user_comments: string;
  original_script: string;
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
 * Regenerate Script with Comments API
 * 
 * Regenerates a script incorporating user comments to create an improved version.
 * 
 * @param requestData - The regeneration request with original data and user comments
 * @returns Promise<ScriptGenerationResponse> - Regenerated script with comments incorporated
 * @throws Error if the regeneration fails
 */
export const regenerateScriptWithComments = async (
  requestData: RegenerateScriptRequest
): Promise<ScriptGenerationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/regenerate-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      let errorMessage = 'Script regeneration failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
    
    const data: ScriptGenerationResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('No response from server. Please check if the backend is running.');
    }
    throw error instanceof Error ? error : new Error(`Script regeneration failed: ${String(error)}`);
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


export const getSingleBook = async (_id: string): Promise<GalleryItem> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gallery/books/${_id}`);
    if (!response.ok) {
      let errorMessage = 'Failed to load book details';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
    const data: GalleryItem = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('No response from server. Please check if the backend is running.');
    }
    throw error instanceof Error ? error : new Error(`Book loading failed: ${String(error)}`);
  }
};
export async function getGalleryPage({
  page = 1,
  limit = 20,
  sort,
  searchQuery,
  searchIn = "All Fields",
}: {
  page?: number;
  limit?: number;
  sort?: string;
  searchQuery?: string;
  searchIn?: string;
}) {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  if (sort) params.append("sort", sort);
  if (searchQuery) params.append("searchQuery", searchQuery);
  if (searchIn) params.append("searchIn", searchIn);
  const res = await fetch(`${API_BASE_URL}/gallery/books?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch gallery data");
  return res.json();
}


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
  RegenerateScriptRequest,
};
