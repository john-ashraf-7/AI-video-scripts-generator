import React, { useState } from "react";
import { generateScript } from "../../api";

// Type definitions
interface Metadata {
  title: string;
  creator: string;
  date: string;
  description: string;
}

interface ScriptResult {
  qc_passed: boolean;
  qc_message: string;
  english_script: string;
  arabic_script: string;
}

interface UploadFormProps {
  onResult: (result: ScriptResult) => void;
}

export default function UploadForm({ onResult }: UploadFormProps) {
  const [metadata, setMetadata] = useState<Metadata>({
    title: "",
    creator: "",
    date: "",
    description: "",
  });
  
  const [artifactType, setArtifactType] = useState<string>("publication_deep_dive");
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMetadata({ ...metadata, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await generateScript(artifactType, metadata);
      onResult(result);
    } catch (error) {
      alert("Error generating script. Check backend.");
    }
    setLoading(false);
  };

  return (
    <form
      className="bg-white p-4 rounded-2xl shadow-md w-full max-w-lg mx-auto"
      onSubmit={handleSubmit}
    >
      <h2 className="text-xl font-bold mb-3">Generate New Script</h2>

      <label className="block mb-2">
        Title:
        <input
          className="w-full p-2 border rounded mt-1"
          name="title"
          value={metadata.title}
          onChange={handleChange}
          required
        />
      </label>

      <label className="block mb-2">
        Creator:
        <input
          className="w-full p-2 border rounded mt-1"
          name="creator"
          value={metadata.creator}
          onChange={handleChange}
          required
        />
      </label>

      <label className="block mb-2">
        Date:
        <input
          className="w-full p-2 border rounded mt-1"
          name="date"
          value={metadata.date}
          onChange={handleChange}
          required
        />
      </label>

      <label className="block mb-2">
        Description:
        <textarea
          className="w-full p-2 border rounded mt-1"
          name="description"
          value={metadata.description}
          onChange={handleChange}
        />
      </label>

      <label className="block mb-2">
        Artifact Type:
        <select
          className="w-full p-2 border rounded mt-1"
          value={artifactType}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setArtifactType(e.target.value)}
        >
          <option value="publication_deep_dive">Publication Deep Dive</option>
          <option value="publication">Publication</option>
          <option value="photograph">Photograph</option>
          <option value="default">Default</option>
        </select>
      </label>

      <button
        type="submit"
        className="bg-blue-600 text-white p-2 rounded w-full mt-3"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Script"}
      </button>
    </form>
  );
}
