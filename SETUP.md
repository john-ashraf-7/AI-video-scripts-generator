# 🚀 AI Video Script Generator - Setup Guide

This guide will help you set up and run the AI Video Script Generator project on your local machine.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **MongoDB Atlas Account** - [Sign up here](https://www.mongodb.com/atlas) (for cloud database)

## 🔧 Step 1: Clone the Repository

```bash
git clone https://github.com/john-ashraf-7/AI-video-scripts-generator.git
cd AI-video-scripts-generator
```

## 🔧 Step 2: Set Up Environment Variables

The project uses environment variables for configuration. Create a `.env` file in the project root:

**macOS/Linux:**
```bash
# Create .env file
touch .env
```

**Windows:**
```bash
# Create .env file
echo. > .env
```

Add the following configuration to your `.env` file:

```env
# MongoDB Configuration
MONGODB_USERNAME=your_mongodb_username
MONGODB_PASSWORD=your_mongodb_password
MONGODB_CLUSTER=your_cluster_name
MONGODB_DATABASE=metadata
MONGODB_COLLECTION=Digital Collection

# Backend Configuration
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8002
OLLAMA_MODEL=llama3:8b

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Frontend Configuration (optional)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8002
```

**Important:** Replace `your_mongodb_username`, `your_mongodb_password`, and `your_cluster_name` with your actual MongoDB Atlas credentials.

**Note:** You'll need to populate your database with library data. See the "Database Setup" section below for instructions.

## 🔧 Step 3: Set Up Database

You need to populate your MongoDB database with library metadata. The project includes a comprehensive JSON file with library data (approximately 12MB).

1. **Get the data file from the scraper branch:**
   
   **Direct link:** [scraper branch](https://github.com/john-ashraf-7/AI-video-scripts-generator/tree/scraper)
   
   ```bash
   # Switch to the scraper branch to get the data file
   git checkout scraper
   
   # Copy the JSON data file (approximately 12MB)
   cp library_data.json ../library_data.json
   
   # Switch back to main branch
   git checkout main
   ```

2. **Import the data into your MongoDB database:**

   **macOS/Linux:**
   ```bash
   # Using mongoimport (install MongoDB tools if needed)
   mongoimport --uri "mongodb+srv://your_username:your_password@your_cluster.mongodb.net/metadata" \
     --collection "Digital Collection" \
     --file library_data.json \
     --jsonArray
   ```

   **Windows:**
   ```bash
   # Using mongoimport (install MongoDB tools if needed)
   mongoimport --uri "mongodb+srv://your_username:your_password@your_cluster.mongodb.net/metadata" --collection "Digital Collection" --file library_data.json --jsonArray
   ```

   **Alternative:** You can also use MongoDB Compass or the MongoDB Atlas web interface to import the JSON file.

## 🔧 Step 4: Install Ollama

The project uses Ollama to run the Llama3.2:8B model locally.

### macOS/Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows:
Download from [https://ollama.ai/download](https://ollama.ai/download)

## 🔧 Step 5: Pull the Required Model

After installing Ollama, pull the Llama3:8B model:

```bash
ollama pull llama3:8b
```

**Note:** The system is configured to work with `llama3:8b`. If you prefer to use `llama3.2:3b`, update the `OLLAMA_MODEL` in your `.env` file.

This will download the model (about 5GB). The first run will take some time.

## 🔧 Step 6: Start Ollama Server

In a terminal, start the Ollama server:

```bash
ollama serve
```

Keep this terminal running. The server will be available at `http://localhost:11434`.

## 🔧 Step 7: Set Up Python Backend

### **Automatic Dependency Installation (Recommended)**

The project includes an automatic dependency installer that handles all Python package installation and verification:

```bash
python install_dependencies.py
```

**Features of the automatic installer:**
- ✅ Installs all packages from `requirements.txt`
- ✅ Verifies each package can be imported successfully
- ✅ Checks version requirements are met
- ✅ Detects virtual environment usage
- ✅ Provides detailed error reporting
- ✅ Cross-platform compatibility
- ✅ System compatibility checks

**What the installer does:**
1. **System Detection**: Identifies your Python version, platform, and architecture
2. **Virtual Environment Check**: Warns if not using a virtual environment
3. **Package Installation**: Installs all required packages with pip
4. **Import Verification**: Tests that each package can be imported
5. **Version Validation**: Ensures installed versions meet requirements
6. **System Checks**: Verifies key packages work correctly
7. **Summary Report**: Shows installation results and any issues

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
   # EASIEST OPTION - Automatic installer (recommended)
   python install_dependencies.py
   
   # Alternative - Manual installation
   pip install -r requirements.txt
   ```

   **💡 Pro Tip:** The automatic installer (`install_dependencies.py`) is the easiest way to set up dependencies as it:
   - Installs all packages from `requirements.txt`
   - Verifies each package can be imported successfully
   - Checks version requirements are met
   - Detects virtual environment usage
   - Provides detailed error reporting
   - Runs system compatibility checks

3. **Start the FastAPI backend server:**
   ```bash
   # Option 1: Using uvicorn directly (recommended)
   uvicorn main:app --port 8002
   
   # Option 2: Using the main.py script
   python main.py
   ```

   The backend will be available at `http://localhost:8002`

## 🔧 Step 8: Set Up Next.js Frontend

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

## 🔧 Platform-Specific Considerations

### **Windows Users:**
- **Path Separators**: Use backslashes (`\`) in file paths and forward slashes (`/`) in URLs
- **Command Prompt**: Use `cmd` or PowerShell for running commands
- **Virtual Environment**: Use `venv\Scripts\activate` to activate Python virtual environment
- **File Creation**: Use `echo. > filename` to create empty files
- **Directory Removal**: Use `rmdir /s directory` to remove directories recursively

### **macOS/Linux Users:**
- **Path Separators**: Use forward slashes (`/`) in all paths
- **Terminal**: Use bash, zsh, or other Unix shells
- **Virtual Environment**: Use `source venv/bin/activate` to activate Python virtual environment
- **File Creation**: Use `touch filename` to create empty files
- **Directory Removal**: Use `rm -rf directory` to remove directories recursively

### **Cross-Platform Compatibility:**
- **Node.js**: Works identically on all platforms
- **Python**: Virtual environments work the same way, just different activation commands
- **MongoDB**: Atlas cloud database works the same on all platforms
- **Ollama**: Installation differs, but usage is identical once installed
- **Ports**: All services use the same ports (3000, 8002, 11434) on all platforms

## 🎯 Step 9: Test the Application

1. **Open your browser** and go to `http://localhost:3000`

2. **Check the API status** - You should see a green checkmark if everything is working

3. **Browse the Library Collection:**
   - The Gallery interface will load items from your MongoDB database
   - Use the advanced search and filter features to find items
   - Items include rich metadata like Arabic titles, publishers, subjects, and institutional information
   - **Note:** Make sure you've imported the library data from the scraper branch (required)

4. **Test Advanced Features:**
   - **Search**: Find items by title, creator, call number, or date with field-specific filtering
   - **Filter**: Use dropdown menus to search in specific fields
   - **Sort**: Sort by title, creator, or year (ascending/descending)
   - **Pagination**: Navigate through pages with total counts
   - **Rich Metadata**: Scripts use comprehensive metadata including Arabic titles, publishers, subjects, and collection information

5. **Generate Scripts:**
   - Click "Generate Script" on any item for individual processing
   - Select multiple items and use "Process X Items" for batch processing
   - Watch the progress indicators during processing

## 🔍 Troubleshooting

### Common Issues:

1. **"Ollama server is not accessible"**
   - Make sure `ollama serve` is running
   - Check if the model is downloaded: `