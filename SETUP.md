# 🚀 AI Video Script Generator - Setup Guide

This guide will help you set up and run the AI Video Script Generator project on your local machine.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)

## 🔧 Step 1: Clone the Repository

```bash
git clone https://github.com/john-ashraf-7/AI-video-scripts-generator.git
cd AI-video-scripts-generator
```

## 🔧 Step 2: Install Ollama

The project uses Ollama to run the Llama3.2:8B model locally.

### macOS/Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows:
Download from [https://ollama.ai/download](https://ollama.ai/download)

## 🔧 Step 3: Pull the Required Model

After installing Ollama, pull the Llama3:8B model:

```bash
ollama pull llama3:8b
```

**Note:** The system is configured to work with `llama3:8b`. If you prefer to use `llama3.2:3b`, you'll need to update the model name in `AIScript.py`.

This will download the model (about 5GB). The first run will take some time.

## 🔧 Step 4: Start Ollama Server

In a terminal, start the Ollama server:

```bash
ollama serve
```

Keep this terminal running. The server will be available at `http://localhost:11434`.

## 🔧 Step 5: Set Up Python Backend

1. **Create a virtual environment (recommended):**
   ```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate virtual environment
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate
   ```
   
   **Note:** You should see `(venv)` at the beginning of your terminal prompt when the virtual environment is activated.

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI backend server:**
   ```bash
   # Option 1: Using uvicorn directly (recommended)
   uvicorn main:app --port 8002
   
   # Option 2: Using the main.py script
   python main.py
   ```

   The backend will be available at `http://localhost:8002`

## 🔧 Step 6: Set Up Next.js Frontend

1. **In a new terminal, navigate to the project directory:**
   ```bash
   cd /path/to/AI-video-scripts-generator
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the Next.js development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## 🎯 Step 7: Test the Application

1. **Open your browser** and go to `http://localhost:3000`

2. **Check the API status** - You should see a green checkmark if everything is working

3. **Browse the Library Collection:**
   - The Gallery interface will load sample items from `sample_data.jsonl`
   - Use the search, filter, and sort features to find items
   - Items include rich metadata like Arabic titles, publishers, subjects, and institutional information

4. **Generate Scripts:**
   - Click "Generate Script" on any item for individual processing
   - Select multiple items and use "Process X Items" for batch processing
   - Watch the progress indicators during processing

5. **Enhanced Features:**
   - **Search**: Find items by title, creator, call number, or date
   - **Filter**: Filter by year range using dropdown menus
   - **Sort**: Sort by name, creator, or year (ascending/descending)
   - **Rich Metadata**: Scripts use comprehensive metadata including Arabic titles, publishers, subjects, and collection information

## 🔍 Troubleshooting

### Common Issues:

1. **"Ollama server is not accessible"**
   - Make sure `ollama serve` is running
   - Check if the model is downloaded: `ollama list`
   - Verify Ollama is accessible at `http://localhost:11434`

2. **"API not reachable"**
   - Ensure the Python backend is running (`uvicorn main:app --port 8002`)
   - Check if port 8002 is available
   - Verify the backend is accessible at `http://localhost:8002`

3. **"Translation failed"**
   - This is normal for the first run as models download
   - Subsequent runs should work faster
   - Check if the Helsinki-NLP models are properly loaded

4. **"Module not found" errors**
   - Make sure you're in the virtual environment (check for `(venv)` in terminal)
   - Activate virtual environment: `source venv/bin/activate` (macOS/Linux) or `venv\Scripts\activate` (Windows)
   - Reinstall dependencies: `pip install -r requirements.txt`
   - Check Python version compatibility (3.8+)
   - Verify virtual environment is created: `ls venv/` or `dir venv\`

5. **"Next.js build errors"**
   - Clear Next.js cache: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`
   - Check TypeScript configuration in `tsconfig.json`

### Port Conflicts:

If you get port conflicts, you can change the ports:

- **Backend**: Use a different port with uvicorn: `uvicorn main:app --port 8003`
- **Frontend**: Edit `api.ts` and change the `API_BASE_URL` to match the new backend port

### Model Issues:

- **Slow performance**: Consider using `llama3.2:3b` instead of `llama3:8b`
- **Memory issues**: Ensure you have at least 8GB RAM available
- **Model not found**: Run `ollama list` to see available models

## 📁 Project Structure

```
AI-video-scripts-generator/
├── AIScript.py                    # Main AI engine and script generation
├── main.py                        # FastAPI backend server
├── api.ts                         # Frontend API client
├── requirements.txt               # Python dependencies
├── package.json                   # Node.js dependencies
├── tsconfig.json                  # TypeScript configuration
├── next.config.ts                 # Next.js configuration
├── app/                           # Next.js App Router
│   ├── components/                # React components
│   │   ├── BatchProcessing.tsx    # Batch processing interface
│   │   ├── ClientGallery.tsx      # Client-side gallery component
│   │   ├── DetailsCard.tsx        # Item details display
│   │   ├── Footer.tsx             # Application footer
│   │   ├── GalleryData.tsx        # Gallery data management
│   │   ├── GalleryGrid.tsx        # Grid layout component
│   │   ├── GenerateButton.tsx     # Script generation button
│   │   ├── Header.tsx             # Application header
│   │   ├── Item.tsx               # Individual item component
│   │   ├── PageNavigation.tsx     # Pagination component
│   │   ├── ScriptViewer.tsx       # Script display component
│   │   └── SearchAndFilter.tsx    # Search and filter interface
│   ├── Record/[id]/               # Dynamic record pages
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   ├── loading.tsx                # Loading component
│   └── page.tsx                   # Main page
├── public/                        # Static assets
│   └── favicon.ico               # Application icon
├── sample_data.jsonl              # Sample library data
└── README.md                      # Project documentation
```

## 🛠️ Technology Stack

### Backend
- **Python 3.8+**: Core programming language
- **FastAPI**: Modern web framework for APIs
- **Uvicorn**: ASGI server for FastAPI
- **Transformers**: Hugging Face transformers library
- **Torch**: PyTorch for machine learning
- **SentencePiece**: Text tokenization
- **Motor**: Async MongoDB driver

### Frontend
- **Next.js 15.4.4**: React framework with App Router
- **React 19.1.0**: UI library
- **TypeScript 5.9.2**: Type-safe JavaScript
- **Tailwind CSS 4.0**: Utility-first CSS framework

### AI/ML
- **Ollama**: Local LLM inference
- **Llama3.2:8B**: Language model for script generation
- **Helsinki-NLP**: Arabic translation models

## 🎉 You're Ready!

The application should now be fully functional. You can:

- **Browse Library Collection**: Interactive gallery with search, filter, and sort capabilities
- **Rich Metadata Processing**: Scripts utilize comprehensive metadata including Arabic titles, publishers, subjects, and institutional context
- **Batch Processing**: Generate scripts for multiple items with progress tracking
- **Bilingual Output**: Get automatic Arabic translations with format preservation
- **Quality Control**: View quality control results and validation
- **Enhanced User Experience**: Loading indicators, auto-scroll, and completion notifications

## 📞 Support

If you encounter any issues, check:
1. All services are running (Ollama, Python backend, Next.js frontend)
2. Network connectivity
3. Port availability
4. Model downloads are complete
5. Python and Node.js versions are compatible

For additional help:
- Check the [README.md](./README.md) for project overview
- Review the troubleshooting section above
- Ensure all prerequisites are met

Happy script generating! 🎬 
