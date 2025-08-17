# Text-to-Speech (TTS) Feature for AI Video Scripts Generator

This document explains how to use the new Text-to-Speech functionality that generates natural-sounding audio for your Instagram video scripts.

## 🎤 Overview

The TTS feature uses **Piper TTS**, a lightweight, high-quality text-to-speech engine that runs efficiently on low-spec PCs. It's perfect for university computers and generates audio optimized for Instagram videos.

## ✨ Features

- **Multiple Voice Options**: Choose from different voices (male/female, natural/professional/casual)
- **Instagram Optimization**: Audio is automatically optimized for Instagram video format
- **Low Resource Usage**: Designed to work on average university PCs
- **High Quality**: Natural-sounding speech with proper pronunciation
- **Easy Integration**: Simple API endpoints for seamless integration

## 🚀 Quick Start

### 1. Install Dependencies

First, install the required Python packages:

```bash
pip install -r requirements.txt
```

### 2. Install Piper TTS

Run the automatic installation script:

```bash
python install_piper.py
```

This script will:
- Detect your operating system
- Install Piper TTS automatically
- Download a sample voice model
- Test the installation

### 3. Manual Installation (if automatic fails)

#### macOS
```bash
brew install piper-tts
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install piper-tts
```

#### Windows
```bash
pip install piper-tts
```

### 4. Start the Server

```bash
python main.py
```

## 🎯 Available Voices

The system comes with several pre-configured voices:

| Voice ID | Name | Gender | Style | Best For |
|----------|------|--------|-------|----------|
| `en_US-amy-low` | Amy (Female, Natural) | Female | Natural | General content, friendly tone |
| `en_US-ryan-low` | Ryan (Male, Natural) | Male | Natural | General content, authoritative |
| `en_US-libritts-high` | LibriTTS (Female, Professional) | Female | Professional | Educational content, formal |
| `en_US-common_voice-low` | Common Voice (Male, Casual) | Male | Casual | Informal content, conversational |

## 📡 API Endpoints

### Get Available Voices
```http
GET /tts/voices
```

**Response:**
```json
{
  "voices": [
    {
      "id": "en_US-amy-low",
      "name": "Amy (Female, Natural)",
      "language": "en_US",
      "gender": "female",
      "style": "natural",
      "downloaded": true
    }
  ]
}
```

### Set Voice
```http
POST /tts/set-voice
Content-Type: application/json

{
  "voice_id": "en_US-amy-low"
}
```

### Generate Audio from Script
```http
POST /tts/generate-audio
Content-Type: application/json

{
  "script": "Your script text here...",
  "voice_id": "en_US-amy-low",
  "output_filename": "my_script_audio.wav"
}
```

**Response:**
```json
{
  "success": true,
  "audio_path": "audio_output/script_audio_1234567890.wav",
  "filename": "script_audio_1234567890.wav",
  "duration_seconds": 45.23,
  "voice_used": "en_US-amy-low",
  "voice_name": "Amy (Female, Natural)",
  "file_size_mb": 2.1
}
```

### Download Audio File
```http
GET /tts/download/{filename}
```

### Generate Script with Audio (All-in-One)
```http
POST /generate-script-with-audio
Content-Type: application/json

{
  "artifact_type": "publication_deep_dive",
  "metadata": {
    "title": "Your artifact title",
    "description": "Your artifact description"
  }
}
```

**Response:**
```json
{
  "english_script": "Generated script text...",
  "qc_passed": true,
  "qc_message": "Script passed quality check",
  "arabic_translation_refined": "Arabic translation...",
  "audio_generated": true,
  "audio_info": {
    "success": true,
    "audio_path": "audio_output/script_audio_1234567890.wav",
    "filename": "script_audio_1234567890.wav",
    "duration_seconds": 45.23,
    "voice_used": "en_US-amy-low",
    "voice_name": "Amy (Female, Natural)",
    "file_size_mb": 2.1
  }
}
```

## 💻 Usage Examples

### Python Example
```python
import requests

# Generate audio from existing script
script_text = "Welcome to our latest video about ancient artifacts..."

response = requests.post("http://localhost:8002/tts/generate-audio", json={
    "script": script_text,
    "voice_id": "en_US-amy-low"
})

if response.status_code == 200:
    result = response.json()
    print(f"Audio generated: {result['filename']}")
    print(f"Duration: {result['duration_seconds']} seconds")
else:
    print(f"Error: {response.text}")
```

### JavaScript Example
```javascript
// Generate audio from script
const response = await fetch('http://localhost:8002/tts/generate-audio', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        script: "Your script text here...",
        voice_id: "en_US-amy-low"
    })
});

const result = await response.json();
if (result.success) {
    console.log(`Audio generated: ${result.filename}`);
    console.log(`Duration: ${result.duration_seconds} seconds`);
}
```

## 🎵 Audio Optimization

The TTS system automatically optimizes audio for Instagram videos:

- **Sample Rate**: 44.1kHz (Instagram preferred)
- **Audio Normalization**: Consistent volume levels
- **Dynamic Range Compression**: Prevents audio clipping
- **Fade In/Out**: Smooth transitions
- **Format**: WAV (high quality, Instagram compatible)

## 📁 File Structure

```
your-project/
├── audio_output/          # Generated audio files
├── tts_models/           # Downloaded voice models
│   ├── en_US-amy-low.onnx
│   ├── en_US-amy-low.onnx.json
│   └── ...
├── tts_service.py        # TTS service implementation
├── install_piper.py      # Installation script
└── main.py              # FastAPI server with TTS endpoints
```

## 🔧 Troubleshooting

### Common Issues

1. **"Piper TTS not found"**
   - Run `python install_piper.py` to install Piper TTS
   - Ensure Piper is in your system PATH

2. **"Model download failed"**
   - Check your internet connection
   - Try downloading models manually from the Piper voices repository

3. **"Audio generation timeout"**
   - Reduce script length
   - Check system resources
   - Try a different voice model

4. **"Low audio quality"**
   - Use high-quality voice models (e.g., `en_US-libritts-high`)
   - Ensure sufficient system memory
   - Check audio file format compatibility

### Performance Tips

- **For Low-Spec PCs**: Use `-low` voice models (smaller, faster)
- **For Better Quality**: Use `-high` voice models (larger, better quality)
- **Batch Processing**: Generate multiple audio files sequentially
- **Storage**: Monitor `audio_output/` directory size

## 🌐 Voice Model Sources

Voice models are sourced from the official Piper voices repository:
- **Repository**: https://huggingface.co/rhasspy/piper-voices
- **Documentation**: https://github.com/rhasspy/piper

## 📊 System Requirements

### Minimum Requirements
- **CPU**: Dual-core 2.0 GHz
- **RAM**: 4 GB
- **Storage**: 2 GB free space
- **OS**: Windows 10, macOS 10.14+, Ubuntu 18.04+

### Recommended Requirements
- **CPU**: Quad-core 2.5 GHz or better
- **RAM**: 8 GB or more
- **Storage**: 5 GB free space
- **OS**: Latest stable versions

## 🤝 Contributing

To add new voice models or improve the TTS functionality:

1. Fork the repository
2. Add new voice models to `tts_service.py`
3. Test with different scripts and voice combinations
4. Submit a pull request

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs in your terminal
3. Ensure all dependencies are properly installed
4. Test with the provided installation script

## 🎉 What's Next?

The TTS feature is now fully integrated! You can:

1. Generate scripts with automatic audio generation
2. Choose from multiple voice options
3. Download high-quality audio files
4. Create Instagram-ready video content

Happy audio generation! 🎤✨
