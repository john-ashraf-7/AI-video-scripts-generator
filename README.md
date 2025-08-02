
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

## 🎯 Features

- ✅ **Interactive Gallery Interface**: Browse library collections with rich metadata display
- 🔍 **Advanced Search & Filtering**: Search by title, creator, call number, or date with year-range filtering
- 📊 **Smart Sorting**: Sort items by name, creator, or year (ascending/descending)
- 🌍 **Enhanced Bilingual Support**: Utilizes Arabic titles and creator names for authentic translations
- 🏛️ **Rich Metadata Processing**: Scripts incorporate comprehensive academic metadata (publishers, subjects, collections, rights)
- 📁 **Batch Processing**: Process multiple items with real-time progress tracking
- 🎬 **Quality Control**: Built-in validation and format preservation for Arabic translations
- 🌐 **Modern React Interface**: Responsive design with loading indicators and user feedback
- 📜 **Export-Ready Scripts**: Generate production-ready bilingual video scripts

## 🛠️ Technologies Used

| Category           | Tools                                      |
|--------------------|--------------------------------------------|
| Language Models    | [Ollama](https://ollama.ai/) + Llama3.2:3B |
| Translation        | Helsinki-NLP Arabic translation models      |
| Backend            | Python, FastAPI                            |
| Frontend           | React.js                                   |
| NLP Libraries      | Transformers, Torch, BeautifulSoup4        |
| Deployment         | Local (CPU)                                |


## ✅ Deliverables

- ✅ Working prototype of AI script generator
- ✅ 3+ Bilingual sample scripts
- ✅ Video demonstration
- ✅ Public GitHub repository with documentation
- ✅ Comprehensive technical report

## 🖥️ Setup Instructions

1. Install [Ollama](https://ollama.ai/) and pull the required Llama model:
```bash
ollama pull llama3:8b
```

**Note:** The system is configured for `llama3:8b`. You can use `llama3.2:3b` by updating the model name in `AIScript.py`.

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start the FastAPI backend server:
```bash
python main.py
```

The backend will be available at `http://localhost:8002`.

4. Install frontend dependencies and start the React development server:
```bash
npm install
npm start
```

5. Access the application in your browser at:
```
http://localhost:3000
```

## 🆕 New Features & Enhancements

### **Gallery Interface**
- Interactive library collection browser
- Rich metadata display including Arabic titles, publishers, and institutional information
- Responsive grid layout with detailed item cards

### **Search & Filter Capabilities**
- **Search**: Find items by title, creator, call number, or date
- **Filter by Year**: Use dropdown menus to filter by publication year range
- **Sort Options**: Sort by name (A-Z), creator (A-Z), year (oldest/newest first)
- **Clear Filters**: Reset all filters with one click

### **Enhanced Script Generation**
- **Rich Metadata Usage**: Scripts now incorporate comprehensive metadata including:
  - Arabic titles and creator names for authentic bilingual content
  - Publisher and publication details for historical context
  - Subject classifications and academic context
  - Collection and institutional information
  - Rights, licensing, and catalog information
- **Batch Processing**: Select multiple items and process them with real-time progress tracking
- **Progress Indicators**: Visual feedback during script generation with completion notifications

### **Improved User Experience**
- Loading indicators and disabled states during processing
- Auto-scroll to results section
- Progress counters for batch operations ("Processing... (2/5)")
- Completion messages with visual feedback

## 📅 Work Plan

The project follows an **8-week** structured development plan:
- **Weeks 1-2:** Research, data preparation, architecture setup
- **Weeks 3-5:** Backend and frontend development
- **Weeks 6-7:** Testing, refinement, bilingual optimization
- **Week 8:** Documentation, deliverables, video demo

Detailed documentation can be found in the [`docs/`](./docs/) directory.

