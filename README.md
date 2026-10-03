# RIG -- Report Intelligence Generator

Generate 44 professional consulting documents with AI. Runs on your computer.

You fill in your project details, pick the documents you need, and RIG creates
a ZIP containing PDF and DOCX files ready to send to a client.

---

## Requirements

- **Python 3.10 or newer.** The Dockerfile uses 3.12. Any 3.10+ should work.
- **A free API key** from at least one provider (Groq, Gemini, or OpenRouter),
  *or* a local Ollama install for fully offline use.
- **WeasyPrint system libraries** (for PDF rendering). On most systems
  `pip install weasyprint` handles this automatically. If PDF generation
  fails, see the [Troubleshooting](#troubleshooting) section.

---

## Installation

### Windows

1. Install Python from <https://www.python.org/downloads/>.
   **Check "Add Python to PATH"** during the installer.
2. Download or clone this repository.
3. Double-click **`RIG.bat`**.

The batch file checks Python, creates a virtual environment (`.venv`),
installs all dependencies, opens your browser, and starts the server.
No command line needed.

<details>
<summary>Manual steps (PowerShell / Command Prompt)</summary>

```
cd Report_Generator_Dashboard
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open <http://localhost:8000> in your browser.

</details>

### macOS / Linux

**Option A -- one command:**

```bash
chmod +x run.sh
./run.sh
```

`run.sh` creates a `.venv`, installs packages, opens your browser, and starts
the server.

**Option B -- full setup script (checks Python, pip, Ollama):**

```bash
chmod +x setup.sh
./setup.sh          # sets everything up
python app.py       # start the server
```

<details>
<summary>Manual steps</summary>

```bash
cd Report_Generator_Dashboard
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open <http://localhost:8000>.

</details>

### Docker

```bash
docker compose up --build
```

This starts two containers:

| Container | Purpose |
|-----------|---------|
| `rig-app` | The RIG server on port 8000. |
| `rig-ollama` | An Ollama instance on port 11434 (optional; requires an NVIDIA GPU). |

Open <http://localhost:8000> after the containers start.

If you do not have a GPU, comment out or remove the `ollama` service in
`docker-compose.yml` and use a cloud provider instead.

---

## How to use RIG (step by step)

### Step 1 -- Open the dashboard

Start the server (see Installation above) and go to <http://localhost:8000>.

<!-- TODO: replace with actual screenshot -->
> Screenshot placeholder: `docs/img/step1_dashboard.png`

### Step 2 -- Configure a provider

Click the **gear icon** (top-right) to open Settings. Pick a provider and
paste your API key.

| Provider | Where to get a key | Cost |
|----------|--------------------|------|
| **Groq** | <https://console.groq.com> | Free tier available |
| **Gemini** | <https://aistudio.google.com/apikey> | Free tier available |
| **OpenRouter** | <https://openrouter.ai> | Free and paid models |
| **Ollama** | <https://ollama.com> (local install) | Free, runs on your machine |

You can add multiple keys for the same provider (one per line). If one key
hits a rate limit, RIG rotates to the next key automatically.

Click **Save Settings** when done.

<!-- TODO: replace with actual screenshot -->
> Screenshot placeholder: `docs/img/step2_settings.png`

### Step 3 -- Fill in project details

Enter the project name (required), sector, location, client name, audience,
description, standards, budget, duration, and output language.

The **description** field matters most. Everything you write here is included
in every document prompt, so be specific.

<!-- TODO: replace with actual screenshot -->
> Screenshot placeholder: `docs/img/step3_details.png`

### Step 4 -- Select documents

Click **Continue** to see all 44 templates. Filter by category or use
Select All / Select None. Click individual cards to toggle them.

<!-- TODO: replace with actual screenshot -->
> Screenshot placeholder: `docs/img/step4_documents.png`

### Step 5 -- Generate

Click **Generate Documents**. RIG will:

1. Create a project **Blueprint** (a JSON plan aligning all documents).
2. Generate each document one at a time.
3. Convert each document to PDF and DOCX.

A live preview panel on the right shows the content as it streams in.
The log panel on the left shows which provider is being used and any errors.

Documents are generated **sequentially** (one after another) to avoid
blowing through free-tier rate limits.

<!-- TODO: replace with actual screenshot -->
> Screenshot placeholder: `docs/img/step5_generating.png`

### Step 6 -- Download

When generation finishes, you land on the Results screen. Click any document
in the list to preview it, then click **Download ZIP**.

The ZIP contains:
- `BLUEPRINT.json` -- the project plan.
- One PDF and one DOCX per document, organized by category folders
  (e.g., `PLANNING/Project_Charter.pdf`).

<!-- TODO: replace with actual screenshot -->
> Screenshot placeholder: `docs/img/step6_results.png`

---

## Provider behavior and fallback

You pick **one primary provider** in Settings. That is what RIG tries first.

If a call fails (rate limit, network error, model unavailable), RIG
automatically falls through a **fallback chain**. The default order is:

```
groq -> gemini -> ollama -> openrouter
```

You can drag to reorder and toggle providers on/off in Settings under
"Fallback Order".

What happens on a failure:

1. **Rate limit (HTTP 429):** RIG rotates to the next API key for that
   provider. If all keys are exhausted, it moves to the next provider in the
   fallback chain.
2. **Other errors:** RIG retries once (after 3 seconds), then moves to the
   next key, then to the next provider.
3. **Ollama not running:** RIG skips it immediately and moves on.
4. **All providers fail:** The document is marked as failed. Other documents
   still generate.

---

## What you get -- all 44 document templates

### Overview (6 documents)

| # | Document | Description |
|---|----------|-------------|
| 1 | Brief Overview | High-level summary |
| 2 | Applicability of Service | Who the service applies to |
| 3 | Pro's and Con's | Balanced decision analysis |
| 4 | Table of Contents | Master TOC |
| 5 | Case Study | Illustrative case study |
| 6 | Dashboard Template | KPI tracking dashboard |

### Planning (7 documents)

| # | Document | Description |
|---|----------|-------------|
| 7 | Project Charter | Project authorization |
| 8 | Scope of Work | Deliverables and boundaries |
| 9 | Project Plan / WBS | Work breakdown structure |
| 10 | Timeline / Gantt Chart | Week-by-week timeline |
| 11 | Resource Allocation Plan | Team and roles |
| 12 | Assumption and Constraint Log | Dependencies and impact |
| 13 | Risk Register and Mitigation | Risk identification and plan |

### Operations (12 documents)

| # | Document | Description |
|---|----------|-------------|
| 14 | SOP for Service Preparation | Standard operating procedure |
| 15 | Methodology of Work | Approach and framework |
| 16 | Terms of Reference | Roles and governance |
| 17 | Stakeholder Register | Stakeholder mapping |
| 18 | Communication Plan | Communication matrix |
| 19 | Process Flow Diagram | Process flow |
| 20 | Gap Analysis Template | Current vs required state |
| 21 | Compliance Check | Compliance matrix |
| 22 | Tools and Equipment List | Required tools |
| 23 | Softwares Required List | Software requirements |
| 24 | People and Expertise Required | Qualifications needed |
| 25 | Do's and Don'ts | Critical considerations |

### Data and Field (8 documents)

| # | Document | Description |
|---|----------|-------------|
| 26 | Data and Documents Checklist | Required data checklist |
| 27 | Data Collection Template | Data collection forms |
| 28 | Document Submission Tracker | Submission tracking |
| 29 | Site Visit / Field Observation | Field observation form |
| 30 | Interview / Questionnaire | Interview guide |
| 31 | Secondary Data Review Sheet | Secondary data review |
| 32 | Sample Format for Service | Sample report format |
| 33 | Draft Report | Full draft report |

### Business (4 documents)

| # | Document | Description |
|---|----------|-------------|
| 34 | Pricing Calculation Reference | Fee structure and pricing |
| 35 | Techno-Commercial Quotation | Professional quotation |
| 36 | Complete Business Plan | Full business plan |
| 37 | Excel Project Tracker | Multi-project tracker |

### Marketing (7 documents)

| # | Document | Description |
|---|----------|-------------|
| 38 | Client Pitch | Client pitch deck |
| 39 | Pitch Deck (VC / Investor) | Investor pitch deck |
| 40 | Client Presentation | Client presentation |
| 41 | Marketing and Sales Plan | Marketing strategy |
| 42 | Email Marketing Content | Email sequences |
| 43 | WhatsApp Marketing Content | WhatsApp scripts |
| 44 | Sample Copy -- Pharma | Pharma industry sample |

### Sample output

> **TODO:** A sample ZIP is planned at [`samples/`](samples/). Until then, run
> RIG with a free provider key and one or two documents to see the output.

---

## Model recommendations (OpenRouter)

OpenRouter gives access to many models through one API key. You enter the
**model ID** in Settings under "OpenRouter > Model".

The model IDs below are the ones currently available in the RIG dropdown.
Model availability changes over time. **Always verify current model IDs on
<https://openrouter.ai/docs/models> before use.**

### Free models (included in the RIG dropdown)

| Model ID | Notes |
|----------|-------|
| `nvidia/nemotron-3-ultra-550b-a55b:free` | Default. Very large model, slow but capable. |
| `qwen/qwen3-coder-480b-a35b:free` | Strong for structured content. |
| `nvidia/nemotron-3-super-120b-a12b:free` | Good balance of speed and quality. |
| `openai/gpt-oss-120b:free` | Fast. |
| `google/gemma-4-31b-it:free` | Compact, reliable. |
| `nvidia/nemotron-3-nano-30b-a3b:free` | Fastest free option, shorter output. |
| `meta-llama/llama-3-8b-instruct:free` | Lightweight. May produce shorter documents. |

Free models show `$0.00` cost. They often have strict rate limits (requests
per minute). Adding multiple OpenRouter keys or enabling fallback to another
provider helps.

### Cost-efficient paid models

These are not in the default dropdown. Type the model ID manually in the
OpenRouter model field. Prices are approximate and change; check
<https://openrouter.ai/docs/models> for current rates.

| Model ID | Approx. cost (per 1M tokens) | Why use it |
|----------|------------------------------|-----------|
| `google/gemini-2.5-flash` | ~$0.15 input / ~$0.60 output | Cheapest reliable option. Fast. |
| `meta-llama/llama-3.3-70b-instruct` | ~$0.40 | Strong reasoning, excellent value. |
| `anthropic/claude-3-5-haiku` | ~$1.00 input / ~$5.00 output | Fast, good at structured formatting. |

### High-end paid models

| Model ID | Approx. cost (per 1M tokens) | Why use it |
|----------|------------------------------|-----------|
| `anthropic/claude-sonnet-4` | ~$3.00 input / ~$15.00 output | Excellent writing quality and format adherence. |
| `openai/gpt-4o` | ~$2.50 input / ~$10.00 output | Versatile, reliable. |
| `google/gemini-2.5-pro` | ~$1.25 input / ~$10.00 output | Large context window for detailed descriptions. |

### Rough time and cost estimates

These estimates assume ~2,000 words per document (typical RIG output).
Actual numbers depend on model, prompt length, and provider load.

| Scenario | Estimated time | Estimated cost (paid model) |
|----------|---------------|----------------------------|
| 1 document | 30--90 seconds | $0.01--$0.05 |
| 10 documents | 5--15 minutes | $0.10--$0.50 |
| All 44 documents | 20--60 minutes | $0.50--$2.00 |

Free models and Ollama cost $0.00 but may be slower and rate-limited.

---

## API key handling and privacy

- **Keys are stored in your browser's `localStorage`** under the key
  `rig_settings`. They are sent to the RIG backend (running on your own
  machine at `localhost:8000`) only when you click Generate.
- **Keys are never saved to disk on the server.** The backend holds them in
  memory for the duration of the job, then discards them.
- **No telemetry, no analytics, no external calls** except the LLM API
  requests to the provider you selected (Groq, Gemini, OpenRouter, or your
  local Ollama). The code makes no other outbound HTTP calls. You can verify
  this in `rig/providers.py` -- the only `httpx` calls go to the four
  provider endpoints.
- **Ollama mode is fully offline.** If you use only Ollama with no cloud
  fallback enabled, nothing leaves your machine.

---

## Architecture

```
app.py                  # Entry point -- uvicorn on port 8000
rig/
  catalog.py            # 44 document templates + validation
  providers.py          # 4 LLM providers, key rotation, fallback chain
  render.py             # Markdown to PDF (WeasyPrint) and DOCX (python-docx)
  jobs.py               # Sequential job runner, ZIP packaging
  routes.py             # FastAPI endpoints + static file serving
index.html              # Frontend dashboard (single page)
assets/
  css/index.css         # Stylesheet
  js/app.js             # Frontend logic (vanilla JS, no build step)
```

---

## API reference

```bash
# List all 44 document templates
curl http://localhost:8000/api/docs

# Start a generation job
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "groq",
    "groqKeys": ["gsk_..."],
    "metadata": {"name": "Water Audit", "desc": "Comprehensive audit"},
    "documents": [{"id": "overview", "name": "Brief Overview", "cat": "overview"}]
  }'
# Returns: {"jobId": "a1b2c3d4"}

# Check progress (includes streamed content and logs)
curl http://localhost:8000/api/status/a1b2c3d4

# Download the ZIP when done
curl -o output.zip http://localhost:8000/api/download/a1b2c3d4

# Health check
curl http://localhost:8000/api/health
```

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/docs` | GET | List all 44 templates. |
| `/api/generate` | POST | Start a generation job. Returns a job ID. |
| `/api/status/{id}` | GET | Progress, logs, streamed content. |
| `/api/download/{id}` | GET | Download ZIP (blueprint + PDF + DOCX). |
| `/api/health` | GET | Returns `{"ok": true}`. |

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `ModuleNotFoundError` | Dependencies not installed. | Run `pip install -r requirements.txt` inside your `.venv`. |
| Port 8000 in use | Another process is using that port. | **Linux/macOS:** `lsof -i :8000`. **Windows:** `netstat -ano \| findstr :8000`, then `taskkill /PID <pid> /F`. |
| `Connection refused` on Ollama | Ollama server is not running. | Open a new terminal and run `ollama serve`. |
| `429 Too Many Requests` | Free-tier rate limit hit. | Normal. RIG rotates keys and falls back to the next provider automatically. Add more keys or switch to a paid model. |
| `Invalid API key` / `401 Unauthorized` | Wrong or expired key. | Open Settings, check the key, re-copy it from the provider's dashboard. Make sure there are no extra spaces or newlines. |
| PDF render fails / blank PDF | Missing WeasyPrint system libraries (cairo, pango, gdk-pixbuf). | **Ubuntu/Debian:** `sudo apt install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0`. **macOS:** `brew install pango gdk-pixbuf`. **Windows:** WeasyPrint bundles these via pip, but if it fails, see <https://doc.courtbouillon.org/weasyprint/stable/first_steps.html>. |
| DOCX files are empty | The LLM returned an empty or error response. | Check the logs in the Generate screen. The document was likely marked as failed. Try again with a different provider or model. |
| Job stuck / no progress | Provider is slow or unresponsive. The timeout is 300 seconds (5 minutes) per request. | Wait for the timeout. RIG will log the error and try the fallback provider. If all providers are stuck, close the tab, restart the server, and try with a different provider. |
| ZIP is empty | All documents failed to generate. | Check the log panel. Common causes: all API keys invalid, all providers rate-limited, or Ollama model not pulled. Fix the root cause and run again. |
| Tests fail | Dev dependencies not installed. | `pip install -r requirements-dev.txt`, then `python -m pytest -q`. |

---

## License

MIT
