
<div align="center">

  <!-- Logo Placeholder -->
  <img src="./public/favicon.svg" alt="Logo" width="100" height="100" />

  # FastType AI Fixer

  **Your Intelligent Assistant for High-Speed Typing**
  
  [![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-5.0-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![Electron](https://img.shields.io/badge/Electron-29-grey?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
  [![Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%20Flash-orange?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

  <p align="center">
    <a href="#-about">About</a> •
    <a href="#-features">Features</a> •
    <a href="#-how-it-works">How it Works</a> •
    <a href="#-installation">Installation</a> •
    <a href="#-tech-stack">Tech Stack</a>
  </p>
  
  <p align="center">
    <a href="./README.md">🇷🇺 <b>Russian Version</b></a>
  </p>
</div>

---

## 🚀 About

**FastType AI Fixer** is a modern Electron application designed to act as your real-time proofreader. Unlike standard spellcheckers, it understands context.

Simply type, and the app automatically corrects typos, adds punctuation, and removes filler words using the power of **Google Gemini 3 Flash**. It also supports smart dictation with automatic silence removal.

## ✨ Features

| Feature | Description |
| :--- | :--- |
| **🧠 AI Correction** | On-the-fly typo and grammar correction with context awareness. |
| **🎙️ Smart Dictation** | Voice recording with VAD (Voice Activity Detection). Automatically trims silence. |
| **🎨 Visualizer** | Beautiful audio visualizer and color-coded text status indication. |
| **💬 Chat Mode** | Built-in chat with Gemini for questions, brainstorming, or image analysis. |
| **📋 Clipboard History** | Integrated clipboard manager with search functionality. |
| **⚡ Offline Dictionary** | Hybrid system: instant dictionary check + AI for complex cases. |

## 🚦 How it Works

The app uses text color differentiation ("Traffic Light" system) so you always know the processing status:

1.  <span style="color: #cbd5e1">**Grey (Typing)**</span>: Raw text you are currently typing.
2.  <span style="color: #f87171">**Red (Check)**</span>: Words not found in the local dictionary. They are queued for AI verification.
3.  <span style="color: #fbbf24">**Orange (Processed)**</span>: Text checked for typos; words are valid.
4.  <span style="color: #10b981">**Green (Finalized)**</span>: Sentence completed. AI has applied punctuation, capitalization, and removed filler words.

## 🛠️ Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   Google Gemini API Key ([Get it here](https://aistudio.google.com/app/apikey))

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Neytrino2134/FastType-Fixer.git
    cd FastType-Fixer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run in Development Mode:**
    ```bash
    # Starts both Vite server and Electron window
    npm run electron:dev
    ```

4.  **Build Application:**
    ```bash
    npm run electron:build
    ```

## 🧩 Tech Stack

*   **Core:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
*   **Build:** [Vite](https://vitejs.dev/)
*   **Runtime:** [Electron](https://www.electronjs.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/), Lucide Icons
*   **AI:** Google GenAI SDK (`gemini-2.5-flash`, `gemini-3-flash-preview`)
*   **Audio:** Web Audio API (Custom Visualizer & VAD implementation)

## 📂 Project Structure

```text
FastType-Fixer/
├── src/
│   ├── components/      # UI Components (Editor, Chat, Settings...)
│   ├── hooks/           # Logic (useAudioRecorder, useTextProcessor...)
│   ├── services/        # Gemini API Integration
│   ├── workers/         # Web Worker for dictionary checks
│   └── utils/           # Helpers and dictionaries
├── electron/
│   ├── main.js          # Electron Main Process
│   └── preload.js       # Preload script
└── public/              # Static assets and dictionaries
```

## 🛡️ Privacy

Your **API Key** is stored locally on your device (`localStorage`). The application communicates directly with Google Gemini servers without an intermediate backend.

---

<div align="center">
  <sub>Built with ❤️ by MeowMasterArt</sub>
</div>
