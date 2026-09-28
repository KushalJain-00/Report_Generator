# RIG — Report Intelligence Generator

> One-command local app for generating 44 professional consulting documents with AI

## Quick Start

```bash
pip install -r requirements.txt
python app.py
```

Open http://localhost:8000 — that's it.

Other launchers: `run.sh` (creates venv, starts uvicorn), `start.py` (starts server + opens browser), `setup.sh` (full setup), `RIG.bat` (Windows), `rig.desktop` (Linux), `docker compose up` (optional Ollama service included).

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

1. **Select provider** — Groq (fast), Gemini (free), OpenRouter (free models), or Ollama (local)
2. **Fill project details** — name, sector, client, description
3. **Pick documents** — choose from 44 consulting templates
4. **Generate** — app creates a blueprint, then generates each doc with retry + key rotation + cross-provider fallback
5. **Preview & download** — live preview streams while generating; ZIP contains `BLUEPRINT.json` plus PDF + DOCX per doc

Generation is **sequential** (one document at a time) — deliberate, so free-tier rate limits aren't blown. PDF/DOCX rendering runs off the event loop (`asyncio.to_thread`), so the live preview keeps streaming during conversion.

### Provider Fallback Chain

Configurable order (default `groq → gemini → ollama → openrouter`). Rate-limited keys rotate immediately; exhausted providers fall through to the next.

## Architecture

```
app.py                 # entry point — uvicorn on :8000
rig/
├── catalog.py         # 44 document templates + validation
├── providers.py       # shared httpx client, 4 providers (Groq/Gemini/OpenRouter/Ollama),
│                      # key rotation + cross-provider fallback
├── render.py          # markdown → PDF / DOCX / HTML, watermark
├── jobs.py            # sequential job runner, off-loop rendering, ZIP packaging
└── routes.py          # API endpoints + static files
index.html             # frontend dashboard
assets/                # css + js
```

## Files

```
├── app.py              # Entry point (runs rig.routes:app)
├── rig/                # Backend package (catalog, providers, render, jobs, routes)
├── index.html          # Frontend dashboard
├── assets/             # css/index.css, js/app.js
├── requirements.txt    # Runtime dependencies
├── requirements-dev.txt # Test dependencies (pytest, httpx2)
├── tests/              # 20 pytest tests — run: .venv/bin/python -m pytest -q
├── run.sh / setup.sh   # Linux/macOS launch + setup
├── start.py            # Cross-platform launcher (server + browser)
├── RIG.bat             # Windows launcher
├── rig.desktop         # Linux desktop entry
├── Dockerfile          # python:3.12-slim, CMD ["python", "app.py"]
└── docker-compose.yml  # rig + optional ollama service
```

## Document Types (44)

| Category | Count | Examples |
|----------|-------|---------|
| Overview | 6 | Brief Overview, Case Study, Table of Contents |
| Planning | 7 | Project Charter, Scope of Work, Timeline / Gantt Chart |
| Operations | 12 | SOP, Methodology of Work, Communication Plan |
| Data & Field | 8 | Data Collection Template, Interview / Questionnaire |
| Business | 4 | Pricing Calculation Reference, Complete Business Plan |
| Marketing | 7 | Pitch Deck, Client Presentation, Marketing & Sales Plan |

## API

```bash
# List all 44 document templates
curl http://localhost:8000/api/docs

# Start generation
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "groq",
    "groqKeys": ["gsk_..."],
    "metadata": {"name": "Water Audit", "desc": "Comprehensive audit"},
    "documents": [{"id": "overview", "name": "Brief Overview", "cat": "overview"}]
  }'
# Returns: {"jobId": "a1b2c3d4"}

# Check progress (includes streamed doc content + logs)
curl http://localhost:8000/api/status/a1b2c3d4

# Download when done
curl -o output.zip http://localhost:8000/api/download/a1b2c3d4

# Health check
curl http://localhost:8000/api/health
```

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/docs` | GET | All 44 templates |
| `/api/generate` | POST | Start a generation job |
| `/api/status/{id}` | GET | Progress, logs, streamed content |
| `/api/download/{id}` | GET | ZIP (blueprint + PDF + DOCX) |
| `/api/health` | GET | Liveness check |

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Connection refused` on Ollama | Run `ollama serve` in another terminal |
| `429 Too Many Requests` | Normal with free tiers — rotation + fallback handle it automatically |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` |
| Port 8000 in use | `lsof -i :8000` to find what's using it |
| Tests fail | `pip install -r requirements-dev.txt`, then `.venv/bin/python -m pytest -q` |

## License

MIT
