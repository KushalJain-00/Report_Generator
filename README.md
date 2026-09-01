# RIG — Report Intelligence Generator

> One-command local app for generating 45 professional consulting documents with AI

## Quick Start

```bash
pip install -r requirements.txt
python app.py
```

Open http://localhost:8000 — that's it.

### Without Ollama (cloud only)

1. Get a free API key from [Groq](https://console.groq.com), [OpenRouter](https://openrouter.ai), or [Google AI Studio](https://aistudio.google.com/apikey)
2. Run `python app.py`
3. Select provider in the dashboard, paste your key, generate

### With Ollama (fully offline)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3

# Run RIG
python app.py
```

## How It Works

1. **Select provider** — Groq (fast), Ollama (local), OpenRouter, or Gemini (free)
2. **Fill project details** — name, sector, client, description
3. **Pick documents** — choose from 45 consulting templates
4. **Generate** — app creates a blueprint, then generates each doc with retry + fallback
5. **Preview & download** — preview individual docs, then download ZIP with markdown + HTML

### Provider Fallback Chain

If one provider hits rate limits, the next one picks up. Each provider gets 3 retry attempts with exponential backoff.

## Architecture

```
python app.py (single file)
├── FastAPI backend
│   ├── POST /api/generate  → starts generation job
│   ├── GET  /api/status/{id} → progress polling (with doc content)
│   └── GET  /api/download/{id} → ZIP download
├── LLM provider routing (Groq / Ollama / OpenRouter / Gemini)
├── Retry + fallback logic
├── ZIP packaging
└── Serves frontend (index.html + assets/)
```

## Files

```
├── app.py              # Backend (FastAPI) — the entire server
├── index.html          # Frontend dashboard
├── requirements.txt    # Python dependencies
├── assets/
│   ├── css/index.css   # Styles
│   └── js/app.js          # Frontend logic
├── run.sh              # One-click start script
├── setup.sh            # Full setup (venv + deps + optional Ollama)
└── docker-compose.yml  # Optional: Docker deployment
```

## Document Types (45)

| Category | Count | Examples |
|----------|-------|---------|
| Overview | 6 | Brief Overview, Case Study, Dashboard |
| Planning | 7 | Charter, Scope of Work, Risk Register |
| Operations | 12 | SOP, Methodology, Compliance Check |
| Data & Field | 8 | Data Collection, Interview Guide |
| Business | 4 | Pricing, Quotation, Business Plan |
| Marketing | 7 | Pitch Deck, Email Content, Marketing Plan |

## API

```bash
# Start generation
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "groq",
    "groqKey": "gsk_...",
    "metadata": {"name": "Water Audit", "desc": "Comprehensive audit"},
    "documents": [{"id": "overview", "name": "Brief Overview", "cat": "overview"}]
  }'
# Returns: {"jobId": "a1b2c3d4"}

# Check progress
curl http://localhost:8000/api/status/a1b2c3d4

# Download when done
curl -o output.zip http://localhost:8000/api/download/a1b2c3d4
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Connection refused` on Ollama | Run `ollama serve` in another terminal |
| `429 Too Many Requests` | Normal with free tiers — retry logic handles it automatically |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` |
| Port 8000 in use | `lsof -i :8000` to find what's using it |

## License

MIT
