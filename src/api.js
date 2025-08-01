import axios from "axios";

const API_BASE_URL = "http://localhost:8002"; // Change if backend runs elsewhere

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

export const getGallery = async () => {
  const response = await axios.get(`${API_BASE_URL}/gallery`);
  return response.data;
};
