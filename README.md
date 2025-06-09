
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

- ✅ Generate full video scripts from library collection metadata
- 🌍 **Bilingual support:** Generates parallel English and Arabic scripts
- 🏛️ Engaging narratives to bring historical artifacts to life
- 🌐 React-based web interface for ease of use
- 📁 Batch processing for multiple collection items
- 📜 Export scripts for video production workflows

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
ollama pull llama3.2:3b
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start the FastAPI backend server:
```bash
uvicorn main:app --reload
```

4. Install frontend dependencies and start the React development server:
```bash
cd frontend
npm install
npm start
```

5. Access the application in your browser at:
```
http://localhost:3000
```

## 📅 Work Plan

The project follows an **8-week** structured development plan:
- **Weeks 1-2:** Research, data preparation, architecture setup
- **Weeks 3-5:** Backend and frontend development
- **Weeks 6-7:** Testing, refinement, bilingual optimization
- **Week 8:** Documentation, deliverables, video demo

Detailed documentation can be found in the [`docs/`](./docs/) directory.

