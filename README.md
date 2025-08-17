
# 📚 AI Video Script Generator

**An AI-powered system to automatically generate bilingual (English/Arabic) promotional video scripts from library digital collection items.**

> ⚙️ **Developed as part of the AUC Library Internship Program (Summer 2025)**

## 👨‍💻 Team

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/john-ashraf-7" target="_blank">
        <img src="https://github.com/john-ashraf-7.png" width="100" alt="John Ashraf"/><br>
        <sub><b>john-ashraf-7</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/my612" target="_blank">
        <img src="https://github.com/my612.png" width="100" alt="Muhammad Elghazaly"/><br>
        <sub><b>my612</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/reffobic" target="_blank">
        <img src="https://github.com/reffobic.png" width="100" alt="Mohamed El-Refai"/><br>
        <sub><b>reffobic</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Farida-Amin" target="_blank">
        <img src="https://github.com/Farida-Amin.png" width="100" alt="Farida Amin"/><br>
        <sub><b>Farida-Amin</b></sub>
      </a>
    </td>
  </tr>
</table>

## 🚀 Project Overview

The AUC Library seeks to promote its unique collections through engaging short-form videos. However, script preparation is time-consuming. This project provides an **AI-powered solution** that generates **2-3 minute video scripts** with **bilingual support** for broader accessibility.

## 🔄 System Architecture

The AI Video Script Generator follows a modern microservices architecture with the following workflow:

![System Sequence Diagram](./Sequence%20Diagram%201.png)

### **System Components:**

- **User**: End-user interacting with the web interface
- **Client**: Next.js frontend application with React components
- **Server**: FastAPI backend orchestrating data flow and AI processing
- **MongoDB**: NoSQL database storing library metadata
- **Ollama**: Local LLM service for English script generation
- **HelsinkiNLP**: AI translation service for Arabic conversion
- **Scraper**: Selenium-based component for metadata collection

### **Primary Workflows:**

#### **1. Script Generation Process:**
1. User selects metadata items in the gallery interface
2. Client sends selected metadata IDs to the server
3. Server fetches complete metadata from MongoDB
4. Server generates English script using Ollama LLM
5. Server translates script to Arabic using HelsinkiNLP
6. Server returns bilingual scripts to client
7. Client displays generated scripts to user

#### **2. Metadata Update Process:**
1. User triggers metadata update from the interface
2. Client sends update request to server
3. Server initiates Selenium scraper
4. Scraper collects new metadata and inserts into MongoDB
5. Server confirms update completion to client
6. Client shows update results to user

## 🎯 Features

### 🆕 **Recent Improvements (Latest Update)**
- **Selective Script Regeneration**: Choose to regenerate English, Arabic, or both with targeted comments
- **Enhanced 3-Paragraph Format**: Strict enforcement of intro/body/conclusion structure with visual cues
- **Improved Arabic Translation**: Better paragraph structure preservation and grammar enhancement
- **Advanced Script Cleaning**: Removes AI-generated comments and annotations for cleaner output
- **Smart Audio Management**: In-memory generation with refresh persistence and automatic cleanup
- **Better Error Handling**: More robust error messages and validation for regeneration modes
- **Comprehensive Metadata Utilization**: Now uses all 25+ available metadata fields for richer script generation

### 🖼️ **Interactive Gallery Interface**
- Browse library collections with rich metadata display
- Responsive grid layout with detailed item cards
- Real-time search and filtering capabilities
- Sort items by name, creator, or publication year
- Individual item detail pages with comprehensive metadata
- Pagination with total counts and page navigation

### 🔍 **Advanced Search & Filtering**
- **Multi-field Search**: Search across all metadata fields including title, creator, call number, date, description, subject, notes, collection, language, type, and Arabic titles
- **Field-Specific Search**: Filter search by specific fields (All Fields, Title, Creator, Call Number, Date)
- **Smart Sorting**: Sort by title (A-Z), creator (A-Z), or year (ascending/descending)
- **Enter Key Search**: Press Enter in search box to instantly apply filters (no need to click Apply button)
- **Clear Filters**: Reset all filters with one click
- **Real-time Results**: Instant search results with MongoDB aggregation
- **Persistent Search State**: Search filters, sort preferences, and page numbers are preserved across navigation
- **URL State Management**: Search state is maintained in URL parameters for bookmarking and sharing

### 🎬 **Advanced Script Regeneration & Enhancement**
- **Selective Regeneration**: Choose to regenerate English script, Arabic translation, or both
- **Comment-Based Enhancement**: Regenerate scripts with specific user comments and feedback
- **Three Regeneration Modes**:
  - **English Only**: Direct improvement of existing English script with comments
  - **Arabic Only**: Direct improvement of existing Arabic translation with comments  
  - **Both**: Full pipeline regeneration with metadata and comments
- **Smart Processing**: Preserves unchanged scripts when regenerating only one language
- **Enhanced Prompts**: AI incorporates user comments to improve script quality, add details, or modify style
- **Example Comments**: "Add more details about the author", "Make it more engaging", "Improve the Arabic translation"
- **Seamless Integration**: Regeneration button appears directly in script viewer for easy access
- **Quality Improvement**: Iteratively enhance scripts until satisfaction

### 🌍 **Enhanced Bilingual Support**
- Utilizes Arabic titles and creator names for authentic translations
- **Strict 3-Paragraph Format**: Ensures consistent intro/body/conclusion structure
- **Visual Cue Preservation**: Maintains visual cues in both English and Arabic
- **Paragraph Structure Validation**: Automatic detection and fixing of paragraph structure
- **Enhanced Translation Quality**: Improved Arabic translation with better grammar and natural flow
- **Format Preservation**: Maintains proper paragraph separation and visual cue positioning
- Quality control validation for translation accuracy
- Bilingual script output (English/Arabic)

### 🎤 **Text-to-Speech Audio Generation**
- **Natural Voice Synthesis**: Generate high-quality audio using Piper TTS
- **Multiple Voice Options**: Choose from male/female voices with different styles (natural, professional, casual)
- **Instagram Optimization**: Audio automatically optimized for Instagram video format
- **Low Resource Usage**: Designed to work efficiently on university PCs
- **Temporary Storage**: Audio files are generated temporarily and cleaned up automatically every 10 minutes
- **Streaming Playback**: Listen to audio directly in the browser without downloading
- **Download Support**: Download audio files only when needed
- **In-Memory Generation**: Audio generated in memory for immediate playback
- **Refresh Persistence**: Audio persists across page refreshes using localStorage
- **Automatic Cleanup**: Temporary files automatically removed after 10 minutes

### 📊 **Rich Metadata Processing**
- Scripts incorporate comprehensive academic metadata:
  - Arabic titles and creator names for authentic bilingual content
  - Publisher and publication details for historical context
  - Subject classifications and academic context
  - Collection and institutional information
  - Rights, licensing, and catalog information
  - Call numbers and catalogue links

### 🔍 **Comprehensive Metadata Utilization**
- **All 25+ Metadata Fields**: Now utilizes every available field from the library database
- **Enhanced Field Categories**:
  - **Basic Identification**: Title (English/Arabic), Creator (English/Arabic), Date, Description
  - **Publication Details**: Publisher, Location, Governorate, Country (English/Arabic)
  - **Academic Context**: Subject, Subject LC, Language, Genre, Type, Keywords (English/Arabic)
  - **Collection Context**: Collection, Source Institution, Medium
  - **Special Fields**: Scale, Format, Geographic Coverage
  - **Rights & Access**: Rights, Access Rights, License, Call Number, Catalogue Link
  - **Additional Context**: Notes, Image URL
- **Bilingual Enhancement**: Arabic titles, creators, and keywords for authentic translations
- **Geographic Context**: Location-specific details for regional relevance
- **Academic Classification**: Proper subject and genre information for scholarly accuracy
- **Institutional Context**: Collection and source information for credibility
- **Complete Metadata**: All available information utilized for comprehensive script generation

### 📁 **Batch Processing**
- Select multiple items for simultaneous processing
- Real-time progress tracking with visual indicators
- Progress counters ("Processing... (2/5)")
- Completion notifications with visual feedback
- Persistent batch results across navigation
- **Cross-Filter Selection**: Selected items remain selected even when changing search filters or navigating between pages
- **Database-First Processing**: Selected items are fetched directly from database using their IDs, ensuring all selections are processed regardless of current view
- **Visual Selection Indicators**: Clear indication of selected items not currently visible in filtered results
- **Persistent State**: Selections survive search, filter, and page changes using localStorage

### 🎬 **Quality Control & Export**
- **Enhanced Script Cleaning**: Removes AI-generated comments and annotations
- **Strict Format Enforcement**: Ensures 3-paragraph structure with visual cues
- **Paragraph Structure Validation**: Automatic detection and correction of formatting issues
- Built-in validation and format preservation for Arabic translations
- Export-ready bilingual video scripts
- Quality control results display
- Production-ready script formatting

### ⚡ **Performance Optimizations**
- **Server-Side Rendering (SSR)**: Optimized performance with server-side data fetching
- **Selective Hydration**: Only interactive components are client-side
- **Minimal JavaScript**: Reduced client-side bundle size
- **Fast Page Loads**: Static content rendered on server
- **MongoDB Aggregation**: Efficient database queries with complex sorting

### 💾 **State Management**
- Persistent selections using localStorage
- Batch results survive navigation
- User preferences maintained across sessions
- Hydration-safe architecture with no mismatches
- URL-based item selection with query parameters

### 🔗 **Navigation & User Experience**
- Individual item detail pages with comprehensive metadata display
- "Add to selection" functionality from detail pages with preserved search state
- Back navigation with preserved state (search filters, selections, page numbers)
- Loading indicators and disabled states during processing
- Auto-scroll to results section
- Responsive design for all screen sizes
- **Balanced UI Layout**: Optimized proportions for search filters, page navigation, and content areas
- **Enhanced Page Navigation**: Streamlined pagination controls with improved spacing and sizing
- **Search State Preservation**: Complete search context maintained when navigating to detail pages and back

### 🔧 **Environment Configuration**
- Environment variable support for flexible deployment
- Configurable MongoDB connection settings
- Customizable CORS origins for security
- Environment-based API configuration

## 🛠️ Technologies Used

| Category           | Tools                                      |
|--------------------|--------------------------------------------|
| **Language Models**    | [Ollama](https://ollama.ai/) + Llama3.2:8B |
| **Translation**        | Helsinki-NLP Arabic translation models      |
| **Text-to-Speech**     | [Piper TTS](https://github.com/rhasspy/piper) |
| **Backend**            | Python 3.8+, FastAPI, Uvicorn              |
| **Frontend**           | Next.js 15.4.4 (React 19) with App Router  |
| **Styling**            | Tailwind CSS 4.0                           |
| **Language**           | TypeScript 5.9.2                           |
| **NLP Libraries**      | Transformers, Torch, SentencePiece         |
| **Audio Processing**   | Pydub, NumPy, SciPy                        |
| **Database**           | MongoDB (Motor driver)                     |
| **Configuration**      | python-dotenv for environment variables    |
| **Deployment**         | Local (CPU)                                |

## 📁 Project Structure

```
AI-video-scripts-generator/
├── AIScript.py                    # Main AI engine and script generation
├── main.py                        # FastAPI backend server
├── tts_service.py                 # Text-to-Speech service
├── api.ts                         # Frontend API client
├── requirements.txt               # Python dependencies
├── package.json                   # Node.js dependencies
├── tsconfig.json                  # TypeScript configuration
├── next.config.ts                 # Next.js configuration
├── .env                           # Environment variables (create this)
├── temp_audio/                    # Temporary audio files (auto-cleanup every 10 min)
├── tts_models/                    # Downloaded TTS voice models (auto-downloaded)
├── app/                           # Next.js App Router
│   ├── components/                # React components
│   │   ├── BatchProcessing.tsx    # Batch processing interface
│   │   ├── ClientGallery.tsx      # Client-side gallery component
│   │   ├── DetailsCard.tsx        # Item details display
│   │   ├── Footer.tsx             # Application footer
│   │   ├── GalleryData.tsx        # Gallery data management
│   │   ├── GalleryGrid.tsx        # Grid layout component
│   │   ├── GenerateButton.tsx     # Script generation button
│   │   ├── GenerateAudio.tsx      # Audio generation component
│   │   ├── Header.tsx             # Application header
│   │   ├── Item.tsx               # Individual item component
│   │   ├── PageNavigation.tsx     # Pagination component
│   │   ├── RegenerateScript.tsx   # Script regeneration with comments
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

## ✅ Deliverables

- ✅ Working prototype of AI script generator
- ✅ 3+ Bilingual sample scripts
- ✅ Video demonstration
- ✅ Public GitHub repository with documentation
- ✅ Comprehensive technical report

## 🖥️ Quick Start

### **Prerequisites for All Platforms:**
- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **MongoDB Atlas Account** - [Sign up here](https://www.mongodb.com/atlas)

1. **Install Ollama and pull the model:**

   **macOS/Linux:**
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama pull llama3:8b
   ```

   **Windows:**
   ```bash
   # Download from https://ollama.ai/download
   # Install the downloaded executable
   ollama pull llama3:8b
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env file in project root
   # On macOS/Linux:
   touch .env
   # On Windows:
   echo. > .env
   
   # Edit .env with your MongoDB credentials and settings
   ```

3. **Set up database (required):**
   ```bash
   # Get library data from scraper branch (12MB JSON file)
   # Direct link: https://github.com/john-ashraf-7/AI-video-scripts-generator/tree/scraper
   git checkout scraper
   cp library_data.json ../library_data.json
   git checkout main

   # Import data to your MongoDB database
   mongoimport --uri "mongodb+srv://your_username:your_password@your_cluster.mongodb.net/metadata" \
     --collection "Digital Collection" \
     --file library_data.json \
     --jsonArray
   ```

4. **Set up Python backend:**
   ```bash
   # Create and activate virtual environment
   python -m venv venv
   
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate

   # Install dependencies (EASIEST OPTION - Automatic installer)
   python install_dependencies.py
   
   # OR install dependencies manually (Alternative)
   pip install -r requirements.txt

   # Install Piper TTS (for audio generation)
   pip install piper-tts

   # Start backend server
   uvicorn main:app --port 8002
   ```

5. **Install frontend dependencies and start:**
   ```bash
   npm install
   npm run dev
   ```

6. **Access the application:**
   ```
   http://localhost:3000
   ```

**🎤 TTS Feature**: After generating a script, click the "Generate Audio" button to convert it to speech using natural-sounding voices. Audio is generated in-memory for immediate playback and only saved to disk when you choose to download it.

7. **Test TTS functionality (optional):**
```bash
# The TTS feature is automatically available in the web interface
# Click "Generate Audio" button next to any generated script
```

For detailed setup instructions, see [SETUP.md](./SETUP.md).

For TTS-specific documentation, see [TTS_README.md](./TTS_README.md).

## 📅 Development Timeline

The project follows an **8-week** structured development plan:
- **Weeks 1-2:** Research, data preparation, architecture setup
- **Weeks 3-5:** Backend and frontend development
- **Weeks 6-7:** Testing, refinement, bilingual optimization
- **Week 8:** Documentation, deliverables, video demo

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
1. Check the [SETUP.md](./SETUP.md) for troubleshooting
2. Ensure all services are running (Ollama, Python backend, Next.js frontend)
3. Verify network connectivity and port availability
4. Confirm model downloads are complete
5. Check environment variable configuration

---

**Happy script generating! 🎬**

