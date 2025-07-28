import axios from "axios";

const API_BASE_URL = "https://github.com/john-ashraf-7/AI-video-scripts-generator/blob/backend/AIScript.py"; // Change if backend runs elsewhere

export const healthCheck = async () => {
  const response = await axios.get(`${API_BASE_URL}/health`);
  return response.data;
};

export const generateScript = async (artifactType, metadata) => {
  const response = await axios.post(`${API_BASE_URL}/generate-script`, {
    artifact_type: artifactType,
    metadata: metadata,
  });
  return response.data;
};
