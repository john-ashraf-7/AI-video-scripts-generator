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
  original_arabic_script?: string;
  regenerate_english?: boolean;
  regenerate_arabic?: boolean;
}

/**
 * Interface for TTS voice information
 */
interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  style: string;
  downloaded: boolean;
}

/**
 * Interface for TTS voices response
 */
interface TTSVoicesResponse {
  voices: TTSVoice[];
}

/**
 * Interface for audio generation request
 */
interface AudioGenerationRequest {
  script: string;
  voice_id?: string;
  output_filename?: string;
}

/**
 * Interface for audio generation response
 */
interface AudioGenerationResponse {
  success: boolean;
  audio_data?: string;  // Base64 encoded audio data
  audio_bytes?: number; // Size in bytes
  duration_seconds?: number;
  voice_used?: string;
  voice_name?: string;
  file_size_mb?: number;
  mime_type?: string;
  error?: string;
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
 * Get Available TTS Voices API
 * 
 * Retrieves the list of available text-to-speech voices from the backend.
 * 
 * @returns Promise<TTSVoicesResponse> - List of available voices
 * @throws Error if the voices cannot be retrieved
 */
export const getTTSVoices = async (): Promise<TTSVoicesResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tts/voices`);
    
    if (!response.ok) {
      let errorMessage = 'Failed to load TTS voices';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
    
    const data: TTSVoicesResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('No response from server. Please check if the backend is running.');
    }
    throw error instanceof Error ? error : new Error(`TTS voices loading failed: ${String(error)}`);
  }
};

/**
 * Generate Audio from Script API
 * 
 * Converts a script text to speech using the specified voice.
 * 
 * @param requestData - The audio generation request with script and voice settings
 * @returns Promise<AudioGenerationResponse> - Generated audio information
 * @throws Error if the audio generation fails
 */
export const generateAudio = async (
  requestData: AudioGenerationRequest
): Promise<AudioGenerationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tts/generate-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      let errorMessage = 'Audio generation failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
    
    const data: AudioGenerationResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('No response from server. Please check if the backend is running.');
    }
    throw error instanceof Error ? error : new Error(`Audio generation failed: ${String(error)}`);
  }
};

/**
 * Save Audio to Temporary File API
 * 
 * Saves audio data to a temporary file for download.
 * 
 * @param audioData - Base64 encoded audio data
 * @param filename - The name for the audio file
 * @returns Promise<{success: boolean, file_path: string, filename: string}> - File save result
 * @throws Error if the save fails
 */
export const saveAudioToFile = async (
  audioData: string, 
  filename: string
): Promise<{success: boolean, file_path: string, filename: string}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tts/save-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_data: audioData,
        filename: filename
      }),
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to save audio file';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('No response from server. Please check if the backend is running.');
    }
    throw error instanceof Error ? error : new Error(`Audio save failed: ${String(error)}`);
  }
};

/**
 * Download Audio File API
 * 
 * Downloads a generated audio file from the server.
 * 
 * @param filename - The name of the audio file to download
 * @returns Promise<Blob> - The audio file as a blob
 * @throws Error if the download fails
 */
export const downloadAudio = async (filename: string): Promise<Blob> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tts/download/${filename}`);
    
    if (!response.ok) {
      let errorMessage = 'Failed to download audio file';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
    
    return await response.blob();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('No response from server. Please check if the backend is running.');
    }
    throw error instanceof Error ? error : new Error(`Audio download failed: ${String(error)}`);
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
  RegenerateScriptRequest,
  TTSVoice,
  TTSVoicesResponse,
  AudioGenerationRequest,
  AudioGenerationResponse,
};
