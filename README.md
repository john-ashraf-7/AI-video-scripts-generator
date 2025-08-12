
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
- **Clear Filters**: Reset all filters with one click
- **Real-time Results**: Instant search results with MongoDB aggregation

### 🌍 **Enhanced Bilingual Support**
- Utilizes Arabic titles and creator names for authentic translations
- Automatic Arabic translation with format preservation
- Quality control validation for translation accuracy
- Bilingual script output (English/Arabic)

### 📊 **Rich Metadata Processing**
- Scripts incorporate comprehensive academic metadata:
  - Arabic titles and creator names for authentic bilingual content
  - Publisher and publication details for historical context
  - Subject classifications and academic context
  - Collection and institutional information
  - Rights, licensing, and catalog information
  - Call numbers and catalogue links

### 📁 **Batch Processing**
- Select multiple items for simultaneous processing
- Real-time progress tracking with visual indicators
- Progress counters ("Processing... (2/5)")
- Completion notifications with visual feedback
- Persistent batch results across navigation

### 🎬 **Quality Control & Export**
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
- "Add to selection" functionality from detail pages
- Back navigation with preserved state
- Loading indicators and disabled states during processing
- Auto-scroll to results section
- Responsive design for all screen sizes

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
| **Backend**            | Python 3.8+, FastAPI, Uvicorn              |
| **Frontend**           | Next.js 15.4.4 (React 19) with App Router  |
| **Styling**            | Tailwind CSS 4.0                           |
| **Language**           | TypeScript 5.9.2                           |
| **NLP Libraries**      | Transformers, Torch, SentencePiece         |
| **Database**           | MongoDB (Motor driver)                     |
| **Configuration**      | python-dotenv for environment variables    |
| **Deployment**         | Local (CPU)                                |

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
├── .env                           # Environment variables (create this)
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

## ✅ Deliverables

- ✅ Working prototype of AI script generator
- ✅ 3+ Bilingual sample scripts
- ✅ Video demonstration
- ✅ Public GitHub repository with documentation
- ✅ Comprehensive technical report

## 🖥️ Quick Start

1. **Install Ollama and pull the model:**
```bash
ollama pull llama3:8b
```

2. **Set up environment variables:**
```bash
# Create .env file in project root
cp .env.example .env
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
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

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

For detailed setup instructions, see [SETUP.md](./SETUP.md).

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

