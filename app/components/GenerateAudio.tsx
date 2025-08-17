"use client";

import React, { useState, useEffect } from "react";
import { 
  generateAudio, 
  getTTSVoices, 
  saveAudioToFile,
  type TTSVoice,
  type AudioGenerationResponse 
} from "../../api";

interface GenerateAudioProps {
  script: string;
  onAudioGenerated?: (audioInfo: AudioGenerationResponse) => void;
}

export default function GenerateAudio({ script, onAudioGenerated }: GenerateAudioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("en_US-amy-low");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioInfo, setAudioInfo] = useState<AudioGenerationResponse | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  // Load saved audio data from localStorage on component mount
  useEffect(() => {
    const savedAudioData = localStorage.getItem('generatedAudioData');
    if (savedAudioData) {
      try {
        const parsed = JSON.parse(savedAudioData);
        if (parsed.script === script && parsed.audioInfo) {
          setAudioInfo(parsed.audioInfo);
          
          // Recreate audio URL from saved base64 data
          if (parsed.audioInfo.audio_data) {
            const audioBlob = new Blob([
              Uint8Array.from(atob(parsed.audioInfo.audio_data), c => c.charCodeAt(0))
            ], { type: parsed.audioInfo.mime_type || 'audio/wav' });
            
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
          }
        }
      } catch (error) {
        console.error('Error loading saved audio data:', error);
        localStorage.removeItem('generatedAudioData');
      }
    }
  }, [script]);

  // Cleanup audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Load available voices when component mounts
  useEffect(() => {
    if (isOpen) {
      loadVoices();
    }
  }, [isOpen]);

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    setMessage("");
    
    try {
      const response = await getTTSVoices();
      setVoices(response.voices);
      
      // Set default voice to first downloaded voice, or first available
      const downloadedVoice = response.voices.find(v => v.downloaded);
      if (downloadedVoice) {
        setSelectedVoice(downloadedVoice.id);
      } else if (response.voices.length > 0) {
        setSelectedVoice(response.voices[0].id);
      }
    } catch (error) {
      setMessage(`Error loading voices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!script.trim()) {
      setMessage("No script available to convert to audio.");
      return;
    }

    setIsGenerating(true);
    setMessage("");

    try {
      const audioData: AudioGenerationResponse = await generateAudio({
        script: script,
        voice_id: selectedVoice
      });

      if (audioData.success && audioData.audio_data) {
        setAudioInfo(audioData);
        
        // Create audio URL from base64 data for immediate playback
        const audioBlob = new Blob([
          Uint8Array.from(atob(audioData.audio_data), c => c.charCodeAt(0))
        ], { type: audioData.mime_type || 'audio/wav' });
        
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        setMessage("Audio generated successfully!");
        
        // Save audio data to localStorage for persistence across refreshes
        localStorage.setItem('generatedAudioData', JSON.stringify({
          script: script,
          audioInfo: audioData
        }));
        
        // Call callback if provided
        if (onAudioGenerated) {
          onAudioGenerated(audioData);
        }
      } else {
        setMessage(`Audio generation failed: ${audioData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!audioInfo?.audio_data) return;

    try {
      // Save audio to temporary file first
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `script_audio_${timestamp}.wav`;
      
      const saveResult = await saveAudioToFile(audioInfo.audio_data, filename);
      
      if (saveResult.success) {
        // Create download link from the saved file
        const response = await fetch(`/api/tts/download/${saveResult.filename}`);
        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up URL
        URL.revokeObjectURL(url);
      } else {
        setMessage("Failed to save audio file for download");
      }
    } catch (error) {
      setMessage(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const selectedVoiceInfo = voices.find(v => v.id === selectedVoice);

  return (
    <div className="mt-6">
      {/* Generate Audio Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        <span>{isOpen ? "Hide Audio Generation" : "Generate Audio"}</span>
      </button>

      {/* Audio Generation Form */}
      {isOpen && (
        <div className="mt-4 bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-green-600">
            Generate Audio from Script
          </h3>

          {/* Voice Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Voice
            </label>
            {isLoadingVoices ? (
              <div className="text-sm text-gray-500">Loading voices...</div>
            ) : (
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender}, {voice.style}) {voice.downloaded ? '✅' : '⏳'}
                  </option>
                ))}
              </select>
            )}
            {selectedVoiceInfo && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedVoiceInfo.downloaded ? 'Voice is ready to use' : 'Voice will be downloaded automatically'}
              </p>
            )}
          </div>

          {/* Script Preview */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Script Preview
            </label>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
              {script.length > 200 ? `${script.substring(0, 200)}...` : script}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {script.length} characters • ~{Math.ceil(script.length / 150)} seconds estimated
            </p>
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

          {/* Generated Audio Display */}
          {audioInfo && audioUrl && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Generated Audio</h4>
              <div className="space-y-2">
                <p className="text-sm text-blue-700">
                  <strong>Voice:</strong> {audioInfo.voice_name}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Duration:</strong> {audioInfo.duration_seconds || 'Unknown'} seconds
                </p>
                <p className="text-sm text-blue-700">
                  <strong>File Size:</strong> {audioInfo.file_size_mb} MB
                </p>
                
                {/* Audio Player */}
                <audio controls className="w-full">
                  <source src={audioUrl} type={audioInfo.mime_type || 'audio/wav'} />
                  Your browser does not support the audio element.
                </audio>
                
                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Audio</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerateAudio}
              disabled={isGenerating || !script.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? "Generating Audio..." : "Generate Audio"}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              <strong>Tip:</strong> The generated audio is optimized for Instagram videos. 
              You can download the WAV file and use it in your video editing software.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
