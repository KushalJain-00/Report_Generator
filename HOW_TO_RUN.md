# How to Run RIG — Complete User Guide

**RIG (Report Intelligence Generator)** is a local, AI-powered desktop application that generates up to 44 professional consulting documents (proposals, blueprints, audit reports, etc.) in PDF and DOCX formats.

---

## 🚀 Quick Start (Windows) — One-Click Setup

No technical knowledge or manual installation is required.

### Step 1: Open the Project Folder
Open the extracted `Report_Generator_Dashboard` folder in Windows File Explorer.

### Step 2: Double-Click `RIG.bat`
Double-click **`RIG.bat`**.

A command window will appear and automatically perform all setup tasks:
1. **Checks for Python**: If Python is missing, it automatically installs Python 3.12 (via `winget` or direct download from python.org) with `Add Python to PATH` enabled.
2. **Checks pip & virtual environment**: Creates a clean, isolated `.venv` folder.
3. **Installs all dependencies**: Automatically installs FastAPI, Uvicorn, WeasyPrint, python-docx, and other required packages.
4. **Creates a Desktop Shortcut**: Installs a shortcut named **RIG** on your Windows Desktop (with the official RIG icon).
5. **Starts the local server**: Launches the backend on `http://localhost:8000`.
6. **Opens Google Chrome in App Mode**: Launches Google Chrome in a dedicated, distraction-free desktop window (`--app=http://localhost:8000`) that looks and feels like a native desktop program.

> 💡 **Keep the command window open** while using RIG. When you are finished, simply close the window or press `Ctrl + C` in it.

---

## 🖥️ Running in the Future

Once the initial setup is complete, you never need to run `RIG.bat` from File Explorer again:

1. Look for the **RIG** icon on your **Windows Desktop**.
2. Double-click **RIG** to start the server and open the app in Chrome automatically.

---

## 🔑 Storing API Keys Locally

RIG is designed with privacy first: your API keys are stored **locally on your computer** and are never shared or sent to any central server.

### How to enter your keys:
1. In the top-right corner of RIG, click the **Settings icon (⚙)**.
2. Select your provider or enter keys for any of the supported services:
   - **Groq** (Recommended for blazing speed): Free key at [console.groq.com](https://console.groq.com)
   - **Gemini**: Free key at [aistudio.google.com](https://aistudio.google.com/apikey)
   - **OpenRouter**: Free key at [openrouter.ai](https://openrouter.ai)
   - **Ollama** (100% offline & local): Install from [ollama.com](https://ollama.com), run `ollama pull llama3`
3. Click **Save Settings**.

### Where keys are stored:
- Keys are written to `config.json` inside your RIG directory (and backed up to `%APPDATA%\RIG\config.json`).
- This file is ignored by Git (`.gitignore`), so your keys will never be accidentally committed.
- Once saved, RIG remembers your keys every time you open the app.

---

## 📄 Generating Documents — 4 Easy Steps

1. **Step 1: Details**
   - Enter your **Service / Project Name** (e.g., *Smart City IoT Audit*, *ESG Compliance Strategy*).
   - Enter optional details: Sector, Geography, Client Name, Target Audience, Standards/Regulations, Budget, and Language.
   - Click **Next: Choose Documents**.

2. **Step 2: Documents**
   - Choose which documents to generate. You can select individual documents, filter by category (Planning, Financials, Compliance, etc.), or click **Select All (44)**.
   - Click **Start Generation**.

3. **Step 3: Generation & Live Preview**
   - RIG will generate each document using AI.
   - You can watch the real-time document output in the live markdown preview pane.
   - If an API key encounters a rate limit (HTTP 429), RIG automatically rotates to your backup key or falls back to the next provider in your priority order.

4. **Step 4: Download Results**
   - Once generation is complete, click **Download ZIP Package**.
   - Your ZIP file will contain organized folders with both **PDF** and **Word (.docx)** versions of every generated document.

---

## 🖨️ PDF Generation Note (WeasyPrint / GTK3)

RIG uses **WeasyPrint** to render professional PDF documents from styled HTML:

- **Word (.docx) files always work** out of the box with zero additional setup.
- **For PDF files on Windows**: WeasyPrint requires the GTK3 runtime libraries.
  1. Download the GTK3 installer from:  
     👉 <https://github.com/nickvdp/gtk3-windows/releases>
  2. Run the `.exe` installer (standard default options).
  3. Restart RIG.
  *(Alternatively, install via MSYS2: `pacman -S mingw-w64-x86_64-pango`)*

---

## 🐧 Alternative: Running on Linux or macOS

If you or a team member are using Linux or macOS:

### Linux
1. Open a terminal in the project directory.
2. Run:
   ```bash
   ./run.sh
   ```
3. A desktop shortcut is also installed to `~/Desktop/RIG.desktop` and your application launcher menu (Hyprland, GNOME, KDE, rofi, wofi).

### macOS
1. Open Terminal in the project directory.
2. Run:
   ```bash
   python3 start.py
   ```

---

## ❓ Troubleshooting & FAQ

### Q: What if Google Chrome is not installed?
RIG looks for Chrome in standard paths (`Program Files`, `LocalAppData`, etc.). If Chrome is not found, RIG will automatically fall back to Chromium or your system's default web browser.

### Q: Port 8000 is already in use?
If RIG is already running in another window, clicking the launcher will simply focus or open Chrome directly to `http://localhost:8000` without throwing a port conflict error. To stop a stuck server:
- On Windows: Close the open command prompt window, or run `netstat -ano | findstr :8000` and kill the PID in Task Manager.
- On Linux: Run `./run.sh --stop`.

### Q: How do I change the default AI model or fallback order?
Click the **Settings (⚙)** drawer:
- Drag and drop providers in the **Fallback Order** list to adjust priority.
- Select your preferred model from the dropdown for each provider.
- You can also add custom watermark text and opacity for branded client exports.
