import os
import json
import tempfile
import subprocess
import requests
from pathlib import Path
from typing import Optional, Dict, List
import logging
from pydub import AudioSegment
import numpy as np
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TTSService:
    """
    Text-to-Speech service using Piper TTS for generating natural-sounding audio
    optimized for Instagram videos and low-spec PCs.
    """
    
    def __init__(self, models_dir: str = "tts_models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        
        # Available voice models for different styles
        self.voice_models = {
            "en_US-amy-low": {
                "name": "Amy (Female, Natural)",
                "language": "en_US",
                "gender": "female",
                "style": "natural",
                "url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/low/en_US-amy-low.onnx",
                "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/low/en_US-amy-low.onnx.json"
            },
            "en_US-ryan-low": {
                "name": "Ryan (Male, Natural)",
                "language": "en_US", 
                "gender": "male",
                "style": "natural",
                "url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/low/en_US-ryan-low.onnx",
                "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/low/en_US-ryan-low.onnx.json"
            },
            "en_US-libritts-high": {
                "name": "LibriTTS (Female, Professional)",
                "language": "en_US",
                "gender": "female", 
                "style": "professional",
                "url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/libritts/high/en_US-libritts-high.onnx",
                "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/libritts/high/en_US-libritts-high.onnx.json"
            },
            "en_US-common_voice-low": {
                "name": "Common Voice (Male, Casual)",
                "language": "en_US",
                "gender": "male",
                "style": "casual", 
                "url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/common_voice/low/en_US-common_voice-low.onnx",
                "config_url": "https://huggingface.co/rhasspy/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/common_voice/low/en_US-common_voice-low.onnx.json"
            }
        }
        
        self.current_model = "en_US-amy-low"
        self._ensure_piper_installed()
        
    def _ensure_piper_installed(self):
        """Ensure Piper TTS is installed and accessible."""
        try:
            import piper
            logger.info("Piper TTS Python package is available")
        except ImportError:
            logger.warning("Piper TTS Python package not found. Please install it manually.")
            logger.info("Installation: pip install piper-tts")
    
    def download_model(self, model_key: str) -> bool:
        """Download a voice model if not already present."""
        if model_key not in self.voice_models:
            raise ValueError(f"Unknown model: {model_key}")
            
        model_info = self.voice_models[model_key]
        model_path = self.models_dir / f"{model_key}.onnx"
        config_path = self.models_dir / f"{model_key}.onnx.json"
        
        # Check if model already exists
        if model_path.exists() and config_path.exists():
            logger.info(f"Model {model_key} already exists")
            return True
            
        try:
            logger.info(f"Downloading model: {model_key}")
            
            # Download model file
            response = requests.get(model_info["url"], stream=True)
            response.raise_for_status()
            with open(model_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    
            # Download config file
            response = requests.get(model_info["config_url"], stream=True)
            response.raise_for_status()
            with open(config_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    
            logger.info(f"Successfully downloaded model: {model_key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to download model {model_key}: {str(e)}")
            return False
    
    def get_available_voices(self) -> List[Dict]:
        """Get list of available voice models with their properties."""
        voices = []
        for key, info in self.voice_models.items():
            model_path = self.models_dir / f"{key}.onnx"
            voices.append({
                "id": key,
                "name": info["name"],
                "language": info["language"],
                "gender": info["gender"],
                "style": info["style"],
                "downloaded": model_path.exists()
            })
        return voices
    
    def set_voice(self, voice_id: str):
        """Set the current voice model."""
        if voice_id not in self.voice_models:
            raise ValueError(f"Unknown voice: {voice_id}")
        
        # Ensure model is downloaded
        if not self.download_model(voice_id):
            raise RuntimeError(f"Failed to download voice model: {voice_id}")
            
        self.current_model = voice_id
        logger.info(f"Voice set to: {voice_id}")
    
    def _clean_text_for_tts(self, text: str) -> str:
        """Clean and prepare text for TTS processing."""
        # Remove extra whitespace
        text = " ".join(text.split())
        
        # Handle common abbreviations for better pronunciation
        abbreviations = {
            "Dr.": "Doctor",
            "Mr.": "Mister", 
            "Mrs.": "Missus",
            "Ms.": "Miss",
            "Prof.": "Professor",
            "vs.": "versus",
            "etc.": "et cetera",
            "i.e.": "that is",
            "e.g.": "for example",
            "A.D.": "A D",
            "B.C.": "B C",
            "U.S.": "U S",
            "U.K.": "U K"
        }
        
        for abbr, full in abbreviations.items():
            text = text.replace(abbr, full)
        
        # Remove special characters that might cause issues
        text = text.replace('"', '').replace('"', '').replace(''', "'").replace(''', "'")
        
        return text
    
    def _optimize_for_instagram(self, audio: AudioSegment) -> AudioSegment:
        """Optimize audio for Instagram video format."""
        try:
            # Instagram prefers 44.1kHz sample rate
            if audio.frame_rate != 44100:
                audio = audio.set_frame_rate(44100)
            
            # Normalize audio levels for better quality
            audio = audio.normalize()
            
            # Apply gentle compression for consistent levels
            audio = audio.compress_dynamic_range(threshold=-20, ratio=4, attack=5, release=50)
            
            # Add slight fade in/out to prevent clicks
            audio = audio.fade_in(50).fade_out(50)
            
            return audio
        except Exception as e:
            # If optimization fails, return original audio
            logger.warning(f"Audio optimization failed: {str(e)}. Using original audio.")
            return audio
    
    def generate_audio(self, text: str, output_path: str = None, 
                      speed: float = 1.0, volume: float = 1.0) -> str:
        """
        Generate audio from text using Piper TTS.
        
        Args:
            text: Text to convert to speech
            output_path: Path to save the audio file (optional)
            speed: Speech rate multiplier (0.5 to 2.0)
            volume: Volume multiplier (0.1 to 2.0)
            
        Returns:
            Path to the generated audio file
        """
        if not text.strip():
            raise ValueError("Text cannot be empty")
        
        # Clean text for TTS
        cleaned_text = self._clean_text_for_tts(text)
        
        # Ensure model is downloaded
        if not self.download_model(self.current_model):
            raise RuntimeError(f"Failed to download voice model: {self.current_model}")
        
        # Create temporary file for text
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(cleaned_text)
            temp_text_file = f.name
        
        # Generate output path if not provided
        if output_path is None:
            output_path = f"audio_output/script_{hash(cleaned_text) % 10000}.wav"
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        try:
            # Import piper
            import piper
            
            # Build model path
            model_path = self.models_dir / f"{self.current_model}.onnx"
            
            # Initialize Piper TTS
            logger.info(f"Generating audio with voice: {self.current_model}")
            
            # Create Piper voice
            voice = piper.PiperVoice.load(str(model_path))
            
            # Generate audio - handle both generator and bytes output
            audio_data = voice.synthesize(cleaned_text)
            
            # Save raw audio with proper WAV header
            import wave
            import numpy as np
            
            # Collect all audio data first
            all_audio_data = []
            sample_rate = 16000  # Default sample rate
            
            if hasattr(audio_data, '__iter__') and not isinstance(audio_data, bytes):
                # If it's a generator, collect AudioChunk objects
                for chunk in audio_data:
                    sample_rate = chunk.sample_rate  # Get actual sample rate
                    if chunk.audio_int16_bytes is None:
                        # Convert float array to int16
                        audio_int16 = (chunk.audio_float_array * 32767).astype(np.int16)
                        all_audio_data.append(audio_int16.tobytes())
                    else:
                        all_audio_data.append(chunk.audio_int16_bytes)
                
                # Combine all audio data
                combined_audio = b''.join(all_audio_data)
            else:
                # If it's bytes, use directly
                combined_audio = audio_data
            
            # Write WAV file with proper header
            with wave.open(output_path, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(combined_audio)
            
            # Audio file created successfully
            if os.path.exists(output_path):
                logger.info(f"Audio generated successfully: {output_path}")
                return output_path
            else:
                raise RuntimeError("Audio file was not created")
                
        except Exception as e:
            raise RuntimeError(f"Audio generation failed: {str(e)}")
        finally:
            # Clean up temporary file
            if os.path.exists(temp_text_file):
                os.unlink(temp_text_file)
    
    def generate_script_audio(self, script: str, voice_id: str = None, 
                            output_filename: str = None) -> Dict:
        """
        Generate audio for a complete script with Instagram optimization.
        
        Args:
            script: The script text to convert to audio
            voice_id: Voice model to use (optional)
            output_filename: Custom output filename (optional)
            
        Returns:
            Dictionary with audio file information
        """
        try:
            # Set voice if specified
            if voice_id:
                self.set_voice(voice_id)
            
            # Generate filename if not provided
            if output_filename is None:
                timestamp = int(time.time())
                output_filename = f"script_audio_{timestamp}.wav"
            
            output_path = f"audio_output/{output_filename}"
            
            # Generate audio with Instagram-optimized settings
            audio_path = self.generate_audio(
                text=script,
                output_path=output_path,
                speed=1.0,  # Normal speed for Instagram
                volume=1.0  # Normal volume
            )
            
            # Get audio file info with proper duration calculation
            import wave
            
            file_size = os.path.getsize(audio_path)
            duration_seconds = 0.0
            
            try:
                # Calculate duration from WAV file
                with wave.open(audio_path, 'rb') as wav_file:
                    frames = wav_file.getnframes()
                    sample_rate = wav_file.getframerate()
                    duration_seconds = frames / sample_rate
            except Exception as e:
                logger.warning(f"Could not calculate duration: {str(e)}")
                # Fallback: estimate duration based on script length
                duration_seconds = len(script.split()) / 2.5  # Rough estimate: 2.5 words per second
            
            return {
                "success": True,
                "audio_path": audio_path,
                "filename": output_filename,
                "duration_seconds": round(duration_seconds, 2),
                "voice_used": self.current_model,
                "voice_name": self.voice_models[self.current_model]["name"],
                "file_size_mb": round(file_size / (1024 * 1024), 2)
            }
            
        except Exception as e:
            logger.error(f"Script audio generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

# Global TTS service instance
tts_service = TTSService()
