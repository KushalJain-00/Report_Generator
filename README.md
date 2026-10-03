# RIG — Report Intelligence Generator

> One-command local app for generating 44 professional consulting documents with AI

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```
Open http://localhost:8000 in your browser.

Other ways to launch:
- `run.sh` (creates virtual environment, starts uvicorn)
- `start.py` (starts server + opens browser automatically)
- `setup.sh` (full setup script for Linux/macOS)
- `RIG.bat` (Windows launcher)
- `rig.desktop` (Linux desktop entry)
- `docker compose up` (optional Ollama service included)

---

## 📖 How to Use the Report Generator

Using RIG is designed to be straightforward and highly customizable.

### 1. Launch and Access
Start the server using any of the methods above, then navigate to `http://localhost:8000` in your web browser. You'll be greeted by the RIG Dashboard.

### 2. Configure Your Provider
On the left sidebar, select your preferred AI provider:
- **Groq:** Ultra-fast generation (requires Groq API key).
- **Gemini:** Free tier available (requires Google AI Studio key).
- **Ollama:** 100% local, offline generation (requires local Ollama installation).
- **OpenRouter:** Access to hundreds of AI models in one place (requires OpenRouter API key).

Paste your API key(s) in the respective fields. If you have multiple keys for rate-limit rotation, you can add them separated by commas.

### 3. Enter Project Details
In the **Project Details** section, fill out the metadata for your report:
- **Project Name:** The overarching title of the engagement.
- **Client Name:** The client or company you are preparing the report for.
- **Sector / Industry:** E.g., Healthcare, FinTech, Construction.
- **Context / Description:** Be as detailed as possible! This context is injected into every document generated to ensure the output is tailored exactly to your specific use case.

### 4. Select Documents
Browse through the 44 available document templates grouped by categories (Overview, Planning, Operations, Data & Field, Business, Marketing).
Click on the documents you wish to generate. You can select one, a few, or all of them. 

### 5. Generate and Monitor
Click the **Generate** button. 
- The app will first formulate a master "Blueprint" to align all documents.
- It will then generate each document sequentially.
- You can watch the **Live Preview** stream in real-time as the AI writes the documents.

### 6. Download Results
Once generation is complete, click **Download ZIP**. Your ZIP file will contain:
- A `BLUEPRINT.json` file mapping out the project structure.
- **PDF** and **DOCX** files for *every* document you selected, perfectly formatted and ready to deliver.

---

## 🧠 OpenRouter: Setup & Model Recommendations

OpenRouter is highly recommended as it gives you access to virtually every major AI model through a single API.

### How to Properly Set Up OpenRouter
1. Go to [OpenRouter.ai](https://openrouter.ai/) and sign up for an account.
2. Navigate to **Settings -> Keys** and create a new API Key.
3. Add some credits to your account (if you plan on using paid models).
4. In the RIG Dashboard, select **OpenRouter** as your provider.
5. Paste your new API key into the `API Key(s)` field.
6. **Important:** Enter the specific **Model ID** you want to use in the `OpenRouter Model` field (see recommendations below).

### 🏆 Model Recommendations

#### Best Free Models (Great for testing)
*Note: Free models may have strict rate limits. Comma-separate multiple OpenRouter keys in RIG if you hit limits.*
- **`meta-llama/llama-3.3-70b-instruct:free`** — Exceptional reasoning and writing quality for a free model.
- **`google/gemini-2.0-pro-exp-02-05:free`** — Excellent for generating long, detailed documents.
- **`mistralai/mistral-nemo:free`** — Fast and reliable for shorter documents.

#### Best Cost-Efficient Paid Models (High Quality, Low Cost)
If you want professional-grade output without spending dollars per report, these are the best value:
- **`meta-llama/llama-3.3-70b-instruct`** (~$0.40 / 1M tokens)
  *The absolute best bang for your buck. Performs on par with high-end models but costs 90% less.*
- **`anthropic/claude-3-5-haiku`** (~$1.00 / 1M tokens)
  *Extremely fast, excellent at structured formatting, and writes with a great professional tone.*
- **`google/gemini-2.5-flash`** (or `google/gemini-2.0-flash-001`) (~$0.10 / 1M tokens)
  *Insanely cheap and fast. Great if you are generating all 44 documents at once.*

#### High-End Paid Models (For critical, client-ready reports)
For maximum reasoning, nuance, and minimal editing required:
- **`anthropic/claude-3.5-sonnet`** — **(Top Pick)** Widely considered the best model for coding and professional writing. Unmatched formatting adherence.
- **`openai/gpt-4o`** — Highly reliable, versatile, and excellent at following complex consulting prompts.
- **`google/gemini-pro-1.5`** — Massive context window, great if your "Context/Description" is incredibly long.

---

## 🔌 Fully Local Offline Usage (Ollama)

Don't want to use cloud APIs? You can run RIG entirely offline.

```bash
# 1. Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull a strong local model
ollama pull llama3.3  # or llama3.2, mistral, phi3

# 3. Run RIG
python app.py
```
*In the RIG dashboard, select "Ollama", ensure it points to `http://localhost:11434`, and enter your downloaded model name (e.g., `llama3.3`).*

---

## ⚙️ Architecture & Under the Hood

The app is built to be resilient and asynchronous:
- **Sequential Generation:** Documents are generated one at a time to respect API rate limits.
- **Fallback Chain:** Configurable fallback (`groq → gemini → ollama → openrouter`). If one API fails or hits a rate limit, the system gracefully falls back to the next provider.
- **Async Rendering:** Markdown to PDF/DOCX conversion runs off the main event loop, meaning the UI never freezes and live previews stream continuously.

### Project Structure
```text
├── app.py              # Entry point (runs rig.routes:app)
├── rig/                # Backend package
│   ├── catalog.py      # 44 document templates + validation
│   ├── providers.py    # LLM clients, key rotation + fallback logic
│   ├── render.py       # markdown → PDF / DOCX / HTML conversions
│   ├── jobs.py         # Job runner and ZIP packager
│   └── routes.py       # FastAPI endpoints + static files
├── index.html          # Frontend dashboard UI
├── assets/             # css/index.css, js/app.js
└── ...                 # Launchers and config files
```

## 🛠️ API Reference

You can also use RIG headlessly via its REST API:

```bash
# List all 44 document templates
curl http://localhost:8000/api/docs

# Start a generation job
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openrouter",
    "openRouterKeys": ["sk-or-v1-..."],
    "openRouterModel": "meta-llama/llama-3.3-70b-instruct",
    "metadata": {"name": "Water Audit", "desc": "Comprehensive audit"},
    "documents": [{"id": "overview", "name": "Brief Overview", "cat": "overview"}]
  }'

# Check progress & stream content
curl http://localhost:8000/api/status/{jobId}

# Download ZIP
curl -o output.zip http://localhost:8000/api/download/{jobId}
```

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection refused` (Ollama) | Ensure Ollama is running (`ollama serve` in a new terminal). |
| `429 Too Many Requests` | Normal on free tiers. The app handles this with rotation and fallbacks. Try OpenRouter free models if you hit limits elsewhere. |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt`. |
| Port 8000 in use | Run `lsof -i :8000` (macOS/Linux) to find the conflicting process. |

## 📄 License
MIT
