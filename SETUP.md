# 🚀 AI Video Script Generator - Setup Guide

This guide will help you set up and run the AI Video Script Generator project on your local machine.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)

## 🔧 Step 1: Install Ollama

The project uses Ollama to run the Llama3.2:3B model locally.

### macOS/Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows:
Download from [https://ollama.ai/download](https://ollama.ai/download)

## 🔧 Step 2: Pull the Required Model

After installing Ollama, pull the Llama3:8B model:

```bash
ollama pull llama3:8b
```

This will download the model (about 5GB). The first run will take some time.

## 🔧 Step 3: Start Ollama Server

In a terminal, start the Ollama server:

```bash
ollama serve
```

Keep this terminal running. The server will be available at `http://localhost:11434`.

## 🔧 Step 4: Set Up Python Backend

1. **Navigate to the project directory:**
   ```bash
   cd /path/to/AI-video-scripts-generator
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the FastAPI backend server:**
   ```bash
   python main.py
   ```

   The backend will be available at `http://localhost:8000`

## 🔧 Step 5: Set Up React Frontend

1. **In a new terminal, navigate to the project directory:**
   ```bash
   cd /path/to/AI-video-scripts-generator
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the React development server:**
   ```bash
   npm start
   ```

   The frontend will be available at `http://localhost:3000`

## 🎯 Step 6: Test the Application

1. **Open your browser** and go to `http://localhost:3000`

2. **Check the API status** - You should see a green checkmark if everything is working

3. **Test with sample data:**
   - Title: "The History of Ancient Egypt"
   - Creator: "Dr. Sarah Johnson"
   - Date: "2020"
   - Description: "A comprehensive study of ancient Egyptian civilization, covering pharaohs, pyramids, and daily life in the Nile Valley."

4. **Select "Publication Deep Dive"** as the artifact type

5. **Click "Generate Script"** and wait for the results

## 🔍 Troubleshooting

### Common Issues:

1. **"Ollama server is not accessible"**
   - Make sure `ollama serve` is running
   - Check if the model is downloaded: `ollama list`

2. **"API not reachable"**
   - Ensure the Python backend is running (`python main.py`)
   - Check if port 8000 is available

3. **"Translation failed"**
   - This is normal for the first run as models download
   - Subsequent runs should work faster

4. **"Module not found" errors**
   - Make sure you're in the virtual environment
   - Reinstall dependencies: `pip install -r requirements.txt`

### Port Conflicts:

If you get port conflicts, you can change the ports:

- **Backend**: Edit `main.py` and change `port=8000` to another port
- **Frontend**: Edit `src/api.js` and change the `API_BASE_URL`

## 📁 Project Structure

```
AI-video-scripts-generator/
├── AIScript.py              # Main AI engine
├── main.py                  # FastAPI backend server
├── requirements.txt         # Python dependencies
├── package.json            # Node.js dependencies
├── public/                 # Static files
├── src/                    # React source code
│   ├── App.jsx            # Main React component
│   ├── index.js           # React entry point
│   ├── index.css          # Styles
│   ├── api.js             # API client
│   └── components/        # React components
│       ├── UploadForm.jsx
│       └── ScriptViewer.jsx
└── README.md              # Project documentation
```

## 🎉 You're Ready!

The application should now be fully functional. You can:

- Generate English video scripts from library metadata
- Get automatic Arabic translations
- View quality control results
- Export scripts for video production

## 📞 Support

If you encounter any issues, check:
1. All services are running (Ollama, Python backend, React frontend)
2. Network connectivity
3. Port availability
4. Model downloads are complete

Happy script generating! 🎬 