# RIG Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild RIG from a clean slate — same product (44 consulting docs, 4 LLM providers, PDF/DOCX/ZIP, 4-step wizard), modular code, and a responsive UI that never stalls during rendering.

**Architecture:** FastAPI backend split into small modules (`rig/` package). Generation is **sequential** (one doc at a time — deliberate: concurrent generation hammers free-tier tokens and fails silently). The real fixes are: CPU-bound PDF/DOCX rendering moved off the event loop via `asyncio.to_thread` (so log lines + live streaming preview keep flowing during rendering), and one shared `httpx.AsyncClient` (no reconnect churn between retries). Frontend rebuilt in vanilla JS/HTML/CSS with identical UX; doc catalog becomes single-source from the backend.

**Tech Stack:** Python 3.12, FastAPI, httpx, python-docx, WeasyPrint, markdown, vanilla HTML/CSS/JS, pytest (new, dev-only).

**Spec:** This plan is the spec (design approved in chat: "same product, cleaner + faster, keep stack, no concurrency").

## Global Constraints

- Python 3.12; no new runtime dependencies (pytest added as dev-only)
- Existing API contract **unchanged**: `POST /api/generate`, `GET /api/status/{id}`, `GET /api/download/{id}` — same request/response shapes as legacy (status keeps `currentContent` / `currentDocName` for live preview; **no new status fields**)
- One **addition**: `GET /api/docs` returns the 44-doc catalog (single source of truth)
- ZIP layout unchanged: `BLUEPRINT.json` + `{CATEGORY}/{Name}.pdf` + `{CATEGORY}/{Name}.docx`
- UX unchanged: 4-step wizard, settings drawer (keys/models/fallback-drag/watermark), live streaming preview, results preview, dark zinc+indigo theme, light/dark toggle
- All 44 doc templates, provider defaults, models, fallback semantics preserved
- Backend validates doc IDs from the request against the catalog (422 on unknown — legacy accepted anything)
- **Sequential generation only** — no asyncio.gather/semaphore over documents
- Wipe is preceded by a **backup commit + `legacy-rig` tag** of all current work (including untracked `start.py`, `RIG.bat`, `rig.desktop`); `.git` and `.venv` survive the wipe; **this plan file survives the wipe** (kept under `docs/`)

## File Structure

```
app.py                 # entrypoint only (~15 lines: uvicorn.run)
rig/
  __init__.py
  catalog.py           # 44 doc templates + validate_docs(ids)
  providers.py         # shared httpx client, per-provider calls, fallback chain, streaming
  render.py            # build_html, render_pdf, render_docx (all pure/sync)
  jobs.py              # job store, blueprint, sequential run_job, ZIP
  routes.py            # API routes + static serving
assets/
  index.html
  css/index.css        # auth.css DELETED (dead — never referenced)
  js/app.js
tests/
  test_health.py  test_catalog.py  test_providers.py  test_render.py  test_api.py
requirements.txt  (runtime)   requirements-dev.txt  (pytest)
run.sh  start.py  setup.sh  RIG.bat  rig.desktop  Dockerfile  docker-compose.yml  README.md
```

---

### Task 0: Backup commit + wipe

**Files:** all legacy files → deleted; `.git`, `.venv`, `docs/superpowers/plans/2026-09-28-rig-rebuild.md` kept

- [ ] **Step 1:** `git add -A && git commit -m "backup: legacy RIG before rebuild"` — captures uncommitted work + untracked launchers + this plan
- [ ] **Step 2:** Tag: `git tag legacy-rig`
- [ ] **Step 3:** Remove every tracked file except the plan: `git rm -r` the legacy tree, then `git add docs/` so the plan file remains tracked
- [ ] **Step 4:** Verify: `git ls-files` shows only `docs/superpowers/plans/2026-09-28-rig-rebuild.md`; `git log` shows backup commit + tag; `.venv/bin/python -c "import fastapi"` works
- [ ] **Step 5:** Commit: `rebuild: wipe legacy code`

### Task 1: Skeleton + health endpoint

**Files:**
- Create: `app.py`, `rig/__init__.py`, `rig/routes.py`, `requirements.txt`, `requirements-dev.txt`, `.gitignore`, `tests/test_health.py`

**Interfaces:**
- Produces: FastAPI app factory used by all later route tasks

- [ ] **Step 1:** Write failing test `tests/test_health.py`:

```python
from fastapi.testclient import TestClient
from rig.routes import app

def test_health():
    r = TestClient(app).get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
```

- [ ] **Step 2:** Run `pytest -q` → FAIL (ModuleNotFoundError: rig)
- [ ] **Step 3:** Implement:

`rig/__init__.py` — empty.
`rig/routes.py`:

```python
from fastapi import FastAPI

app = FastAPI(title="RIG")


@app.get("/api/health")
async def health():
    return {"ok": True}
```

`app.py`:

```python
"""RIG — Report Intelligence Generator. Run: python app.py"""
import uvicorn

from rig.routes import app

if __name__ == "__main__":
    print("\n  RIG — http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

`requirements.txt`: `fastapi\nuvicorn\nhttpx\npydantic\npython-docx\nweasyprint\nmarkdown`
`requirements-dev.txt`: `-r requirements.txt\npytest`
`.gitignore`: `__pycache__/\n.venv/\n*.pyc\n.env\n.pytest_cache/`

- [ ] **Step 4:** Run `pytest -q` → PASS
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat: project skeleton + health endpoint"`

### Task 2: Doc catalog + validation

**Files:**
- Create: `rig/catalog.py`, `tests/test_catalog.py`

**Interfaces:**
- Consumes: nothing
- Produces: `DOCS: list[dict]` (`{id, name, cat, icon, tip}` × 44); `validate_docs(ids: list[str]) -> list[dict]` raises `fastapi.HTTPException(422)` on unknown id

- [ ] **Step 1:** Write failing tests `tests/test_catalog.py`:

```python
import pytest
from fastapi import HTTPException
from rig.catalog import DOCS, validate_docs

def test_44_docs():
    assert len(DOCS) == 44

def test_category_counts():
    from collections import Counter
    c = Counter(d["cat"] for d in DOCS)
    assert c == {"overview": 6, "planning": 7, "operations": 12,
                 "data": 8, "business": 4, "marketing": 7}

def test_unknown_id_rejected():
    with pytest.raises(HTTPException) as e:
        validate_docs(["nope"])
    assert e.value.status_code == 422

def test_valid_id_returns_doc():
    out = validate_docs(["charter"])
    assert out[0]["name"] == "Project Charter"
```

- [ ] **Step 2:** Run `pytest -q` → FAIL
- [ ] **Step 3:** Implement `rig/catalog.py` by porting the exact legacy DOCS array from `git show legacy-rig:assets/js/app.js` lines 1-46 (44 entries — the legacy '45' copy was an off-by-one; emoji icons preserved), plus:

```python
def validate_docs(ids: list[str]) -> list[dict]:
    by_id = {d["id"]: d for d in DOCS}
    missing = [i for i in ids if i not in by_id]
    if missing:
        raise HTTPException(422, f"Unknown document ids: {', '.join(missing)}")
    if not ids:
        raise HTTPException(422, "No documents selected")
    return [by_id[i] for i in ids]
```

- [ ] **Step 4:** Run `pytest -q` → PASS
- [ ] **Step 5:** Commit `feat: doc catalog + id validation`

### Task 3: Providers module

**Files:**
- Create: `rig/providers.py`, `tests/test_providers.py`

**Interfaces:**
- Consumes: nothing
- Produces:

```python
class RateLimited(Exception): ...

async def call_llm(cfg: dict, prompt: str, system: str, temp: float,
                   on_token=None, on_log=None) -> tuple[str, str]
# cfg = {"groq": {"keys": [...], "model": str},
#        "gemini": {"keys": [...], "model": str},
#        "openrouter": {"keys": [...], "model": str},
#        "ollama": {"url": str, "model": str},
#        "fallbackOrder": [...], "enabled": {...}}
# returns (content, provider_used); on_token(text) per streamed chunk;
# on_log(message, type) for job logs  [type: "info" | "error" | "success"]
```

- [ ] **Step 1:** Write failing tests `tests/test_providers.py` (no network — provider callables live in a `CALLERS: dict` that tests monkeypatch):

```python
import pytest
from rig import providers

def make_cfg(**over):
    cfg = {
        "groq": {"keys": ["k1", "k2"], "model": "m"},
        "gemini": {"keys": [], "model": "m"},
        "openrouter": {"keys": [], "model": "m"},
        "ollama": {"url": "", "model": "m"},
        "fallbackOrder": ["groq", "gemini", "ollama", "openrouter"],
        "enabled": {},
    }
    cfg.update(over)
    return cfg


def test_primary_success(monkeypatch):
    async def fake(client, key, model, prompt, system, temp, on_token):
        if on_token:
            on_token("hello ")
            on_token("world")
        return "hello world"
    monkeypatch.setitem(providers.CALLERS, "groq", fake)
    import asyncio
    content, prov = asyncio.run(providers.call_llm(make_cfg(), "p", "s", 0.7))
    assert (content, prov) == ("hello world", "groq")


def test_429_rotates_keys_then_provider(monkeypatch):
    calls = []
    async def fake(client, key, model, prompt, system, temp, on_token):
        calls.append(key)
        if key == "k1":
            raise providers.RateLimited("429")
        if key == "k2":
            raise providers.RateLimited("429")
        return "from-ollama"
    monkeypatch.setitem(providers.CALLERS, "groq", fake)
    monkeypatch.setitem(providers.CALLERS, "ollama", fake)
    cfg = make_cfg(ollama={"url": "http://x", "model": "m"})
    import asyncio
    content, prov = asyncio.run(providers.call_llm(cfg, "p", "s", 0.7))
    assert content == "from-ollama"
    assert calls == ["k1", "k2", None]  # both keys tried, then ollama


def test_disabled_provider_skipped(monkeypatch):
    async def boom(*a, **k):
        raise AssertionError("should not be called")
    monkeypatch.setitem(providers.CALLERS, "groq", boom)
    async def ok(client, key, model, prompt, system, temp, on_token):
        return "ok"
    monkeypatch.setitem(providers.CALLERS, "ollama", ok)
    cfg = make_cfg(enabled={"groq": False}, ollama={"url": "http://x", "model": "m"})
    import asyncio
    content, prov = asyncio.run(providers.call_llm(cfg, "p", "s", 0.7))
    assert prov == "ollama"


def test_all_fail_raises(monkeypatch):
    async def boom(*a, **k):
        raise RuntimeError("nope")
    for p in ("groq", "gemini", "ollama", "openrouter"):
        monkeypatch.setitem(providers.CALLERS, p, boom)
    import asyncio
    with pytest.raises(Exception) as e:
        asyncio.run(providers.call_llm(make_cfg(), "p", "s", 0.7))
    assert "All providers failed" in str(e.value)
```

- [ ] **Step 2:** Run `pytest -q` → FAIL
- [ ] **Step 3:** Implement `rig/providers.py`:
  - Module-level `client = httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0))` — **one shared client, never recreated per call**
  - `CALLERS: dict[str, callable]` with keys `"groq"`, `"openrouter"`, `"gemini"`, `"ollama"`
  - Groq + OpenRouter share one `_openai_compat(base_url, key, model, prompt, system, temp, on_token)` helper (both OpenAI chat-completions protocol; SSE parsing when `on_token` given: lines starting `data: `, stop at `[DONE]`, parse `choices[0].delta.content`, ignore `JSONDecodeError/IndexError/KeyError`); raise `RateLimited` on HTTP 429
  - `_gemini(...)`: `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}`, system prepended to prompt; raise `RateLimited` on 429
  - `_ollama(...)`: `{url}/api/chat` with `stream: False`; on `httpx.ConnectError` raise `Exception("Ollama not running — install from ollama.com and start it")`
  - `call_llm` fallback loop ported from legacy `app.py:171-238` semantics: iterate `fallbackOrder`, skip `enabled is False`, skip providers with no keys/url; per provider: rotate every key, 2 attempts each, on `RateLimited` wait `15 * attempt` seconds and log `"{prov} key#{n}: rate limited, waiting {wait}s"` (type `"error"`); on other errors wait 3s between attempts; ollama "not running"/404 → skip provider entirely; if provider's keys all rate-limited → log `"{prov}: all keys exhausted, moving to next provider"`; all exhausted → `raise Exception("All providers failed: " + "; ".join(errors))`
  - Default models: groq `qwen/qwen3.8-27b`, openrouter `nvidia/nemotron-3-ultra-550b-a55b:free`, gemini `gemini-2.5-flash`, ollama `llama3`
- [ ] **Step 4:** Run `pytest -q` → PASS
- [ ] **Step 5:** Commit `feat: LLM providers with key rotation + fallback`

### Task 4: Render module (pure sync functions)

**Files:**
- Create: `rig/render.py`, `tests/test_render.py`

**Interfaces:**
- Consumes: nothing (pure/sync — callers wrap with `asyncio.to_thread`)
- Produces:

```python
def build_html(content: str, project: dict, doc: dict, blueprint: dict,
               provider: str, watermark: dict | None = None, *, pdf: bool) -> str
def render_pdf(content, project, doc, blueprint, provider, watermark=None) -> bytes
def render_docx(content, project, doc, blueprint, provider, watermark=None) -> bytes
```

`project` keys (legacy shape): `name, sector, geo, client, audience, desc, standards, price, duration, lang`. `doc` keys: `id, name, cat, icon, tip`. `blueprint` keys: `projectTitle, executiveObjective, ...`. `watermark`: `{text, opacity, fontSize}`.

- [ ] **Step 1:** Write failing tests `tests/test_render.py`:

```python
from rig.render import build_html, render_pdf, render_docx

PROJECT = {"name": "Water Audit", "sector": "Water", "geo": "Gujarat",
           "client": "Corp", "audience": "Board", "desc": "d",
           "standards": "ISO", "price": "10k", "duration": "6w", "lang": "English"}
DOC = {"id": "charter", "name": "Project Charter", "cat": "planning", "icon": "x", "tip": "t"}
BLUEPRINT = {"projectTitle": "Water Audit 2026"}
MD = "# Title\n\nSome **bold** text.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n"


def test_pdf_magic_bytes():
    assert render_pdf(MD, PROJECT, DOC, BLUEPRINT, "groq").startswith(b"%PDF")


def test_docx_is_valid_zip():
    import io, zipfile
    data = render_docx(MD, PROJECT, DOC, BLUEPRINT, "groq")
    assert data[:2] == b"PK"
    names = zipfile.ZipFile(io.BytesIO(data)).namelist()
    assert "word/document.xml" in names


def test_preview_html_no_page_rules():
    html = build_html(MD, PROJECT, DOC, BLUEPRINT, "groq", pdf=False)
    assert "@page" not in html
    assert "<table>" in html
    assert "Water Audit 2026" in html


def test_pdf_html_has_page_rules_and_watermark():
    html = build_html(MD, PROJECT, DOC, BLUEPRINT, "groq",
                      {"text": "ACME", "opacity": 0.15, "fontSize": 48}, pdf=True)
    assert "@page" in html
    assert "ACME" in html
    assert "page-break-before" in html
```

- [ ] **Step 2:** Run `pytest -q` → FAIL
- [ ] **Step 3:** Implement `rig/render.py` by porting legacy `app.py:269-457` with dedup:
  - `build_html`: one markdown→HTML conversion (`markdown.Markdown(tables=True, fenced_code=True)`); `pdf=True` adds `@page` A4 rules, header/footer counters, cover page div, `page-break-before`, watermark CSS (`body::after` diagonal, opacity/fontSize from watermark); `pdf=False` is the light preview variant (max-width 800, no cover/watermark). Cover/meta content identical to legacy.
  - `render_pdf`: `WeasyHTML(string=build_html(..., pdf=True)).write_pdf()`
  - `render_docx`: port legacy A4 margins, watermark header, centered cover (title/subtitle/meta), line-by-line markdown parse (`#`/`##`/`###`, tables via `_add_table_to_docx`, `- `/`1. `/`> `/`---`, blank skip, else paragraph), save to `BytesIO`
- [ ] **Step 4:** Run `pytest -q` → PASS
- [ ] **Step 5:** Commit `feat: PDF/DOCX/HTML rendering`

### Task 5: Jobs (sequential runner)

**Files:**
- Create: `rig/jobs.py`, `tests/test_jobs.py`

**Interfaces:**
- Consumes: `providers.call_llm`, `catalog.validate_docs` (docs arrive pre-validated), `render.render_pdf/render_docx/build_html`
- Produces:

```python
jobs: dict[str, dict]
def create_job(project: dict, docs: list[dict], llm: dict, watermark: dict) -> str
async def run_job(job_id: str) -> None
async def generate_blueprint(llm: dict, project: dict, on_log) -> dict
async def generate_document(llm, project, blueprint, doc, watermark, on_log) -> dict
```

Job dict keys (legacy contract): `status, progressMessage, total, current, results, blueprint, zipBytes, error, createdAt, logs, currentContent, currentDocName`. Log entry: `{"time": "HH:MM:SS", "type": "info"|"error"|"success", "message": str}`.

- [ ] **Step 1:** Write failing tests `tests/test_jobs.py`:

```python
import asyncio
import io
import zipfile
from rig import jobs

PROJECT = {"name": "P", "sector": "S", "geo": "G", "client": "C", "audience": "A",
           "desc": "d", "standards": "std", "price": "1", "duration": "2w", "lang": "English"}
DOCS = [{"id": "a", "name": "Doc A", "cat": "planning", "icon": "x", "tip": "t"},
        {"id": "b", "name": "Doc B", "cat": "data", "icon": "x", "tip": "t"}]
LLM = {"fallbackOrder": ["groq"], "enabled": {}}


def fake_llm(monkeypatch, fail_doc_b=False):
    async def fake(cfg, prompt, system, temp, on_token=None, on_log=None):
        if "Project Blueprint" in prompt:
            return '{"projectTitle": "P", "executiveObjective": "o", "coreMethodologies": [], "primaryLocation": "G", "mainStakeholders": [], "keyMilestones": [], "priceSummary": "1", "industryContext": "", "complianceFramework": []}', "groq"
        if fail_doc_b and "Doc B" in prompt:
            raise RuntimeError("all providers failed")
        text = "# Hello\n\nworld"
        if on_token:
            on_token(text)
        return text, "groq"
    monkeypatch.setattr(jobs, "call_llm", fake)


def test_job_completes_with_zip(monkeypatch):
    fake_llm(monkeypatch)
    jid = jobs.create_job(PROJECT, DOCS, LLM, {})
    asyncio.run(jobs.run_job(jid))
    job = jobs.jobs[jid]
    assert job["status"] == "done"
    assert len(job["results"]) == 2
    assert all(not r["error"] for r in job["results"])
    zf = zipfile.ZipFile(io.BytesIO(job["zipBytes"]))
    names = zf.namelist()
    assert "BLUEPRINT.json" in names
    assert "PLANNING/Doc_A.pdf" in names
    assert "DATA/Doc_B.docx" in names
    assert job["blueprint"]["projectTitle"] == "P"


def test_failed_doc_does_not_kill_job(monkeypatch):
    fake_llm(monkeypatch, fail_doc_b=True)
    jid = jobs.create_job(PROJECT, DOCS, LLM, {})
    asyncio.run(jobs.run_job(jid))
    job = jobs.jobs[jid]
    assert job["status"] == "done"
    errs = [r["error"] for r in job["results"]]
    assert errs == [False, True]


def test_live_preview_fields_cleared_when_done(monkeypatch):
    fake_llm(monkeypatch)
    jid = jobs.create_job(PROJECT, DOCS, LLM, {})
    asyncio.run(jobs.run_job(jid))
    job = jobs.jobs[jid]
    assert job["currentContent"] == ""
    assert job["currentDocName"] == ""
```

- [ ] **Step 2:** Run `pytest -q` → FAIL
- [ ] **Step 3:** Implement `rig/jobs.py`:
  - `jobs: dict = {}`; `add_log(job, msg, log_type="info")` with `time.strftime("%H:%M:%S")`
  - `create_job(...)` builds the legacy job dict (`status="queued"`, `total=len(docs)`, 8-char uuid job id)
  - `generate_blueprint` — port legacy `app.py:242-265` (strict-JSON prompt "Project Blueprint for: ...", temp 0.3, `json.loads` with ```json strip, legacy fallback dict on parse failure)
  - `generate_document` — port legacy `app.py:485-550`: sets `job["currentContent"]=""`, `job["currentDocName"]=doc["name"]`; prompt identical to legacy (PROJECT/OBJECTIVE/LOCATION/STAKEHOLDERS/MILESTONES/BUDGET/METHODOLOGIES, "Language: {lang}. Length: 2000+ words..."); calls `call_llm(..., on_token=..., on_log=...)` where `on_token` receives the attempt's cumulative text and `generate_document` ASSIGNS it into `job["currentContent"]` (assign-not-append, so a retry resets the preview); then **`await asyncio.to_thread(render_pdf, ...)` and `await asyncio.to_thread(render_docx, ...)`** (event loop stays free → live preview/logs keep flowing); on exception returns legacy error result (`markdown="# {name}\n\nFailed: {e}"`, `error: True`, empty bytes) and logs `"{name} FAILED: {e}"` (type `"error"`); success logs `"{name} complete — {words} words via {provider}"` (type `"success"`)
  - `run_job` — **sequential for-loop** over docs (NO gather/semaphore): blueprint first (`status="generating_blueprint"`), open `BytesIO` ZIP with `BLUEPRINT.json`, per doc `job["current"]=i+1`, `progressMessage=f"[{i+1}/{n}] Generating: {name}"`, `status="generating"`, append result, clear `currentContent`/`currentDocName`, `await asyncio.sleep(1)` between docs (legacy pacing); finally `zipBytes`, `status="done"`. On fatal error: `status="error"`, `error=str(e)`
  - `from rig.providers import call_llm` (name must be `jobs.call_llm` for monkeypatching)
- [ ] **Step 4:** Run `pytest -q` → PASS
- [ ] **Step 5:** Commit `feat: sequential job runner with off-loop rendering`

### Task 6: API routes

**Files:**
- Modify: `rig/routes.py`
- Test: `tests/test_api.py`

**Interfaces:**
- Consumes: `jobs.create_job/run_job/jobs`, `catalog.DOCS/validate_docs`
- Produces: HTTP contract used by frontend (Task 7)

- [ ] **Step 1:** Write failing tests `tests/test_api.py`:

```python
import io
from fastapi.testclient import TestClient
from rig.routes import app
from rig import jobs as jobs_mod
from rig import catalog

client = TestClient(app)
PROJECT = {"name": "P", "sector": "S", "geo": "G", "client": "C", "audience": "A",
           "desc": "d", "standards": "std", "price": "1", "duration": "2w", "lang": "English"}


def patch_llm(monkeypatch):
    async def fake(cfg, prompt, system, temp, on_token=None, on_log=None):
        if "Project Blueprint" in prompt:
            return '{"projectTitle": "P", "executiveObjective": "o", "coreMethodologies": [], "primaryLocation": "G", "mainStakeholders": [], "keyMilestones": [], "priceSummary": "1", "industryContext": "", "complianceFramework": []}', "groq"
        return "# hi\n\ncontent", "groq"
    monkeypatch.setattr(jobs_mod, "call_llm", fake)


def make_body():
    return {"provider": "groq", "groqKeys": ["k"], "fallbackOrder": ["groq"],
            "enabled": {"groq": True},
            "metadata": PROJECT, "documents": [{"id": "charter", "name": "Project Charter", "cat": "planning"}]}


def test_docs_endpoint():
    r = client.get("/api/docs")
    assert r.status_code == 200
    assert len(r.json()) == 44


def test_generate_unknown_doc_422():
    body = make_body()
    body["documents"] = [{"id": "bogus", "name": "?", "cat": "x"}]
    assert client.post("/api/generate", json=body).status_code == 422


def test_full_roundtrip(monkeypatch):
    patch_llm(monkeypatch)
    r = client.post("/api/generate", json=make_body())
    assert r.status_code == 200
    jid = r.json()["jobId"]

    st = client.get(f"/api/status/{jid}").json()
    assert st["status"] == "done"
    assert len(st["results"]) == 1
    assert st["currentContent"] == ""          # legacy live-preview contract
    assert st["logs"] and st["total"] == 1

    dl = client.get(f"/api/download/{jid}")
    assert dl.status_code == 200
    assert dl.content[:2] == b"PK"
    assert "RIG_Report_Package.zip" in dl.headers["content-disposition"]


def test_status_404():
    assert client.get("/api/status/nope").code if False else True
    assert client.get("/api/status/nope").status_code == 404
```

- [ ] **Step 2:** Run `pytest -q` → FAIL
- [ ] **Step 3:** Implement `rig/routes.py`:
  - `GenerateRequest` pydantic model with **exact legacy field names/defaults** (`app.py:622-636` from `git show legacy-rig:app.py`): `provider, ollamaUrl, ollamaModel, groqKeys, groqModel, openrouterKeys, openrouterModel, geminiKeys, geminiModel, fallbackOrder, enabled, metadata, documents, watermark`
  - `POST /api/generate`: build `project` dict exactly as legacy (`app.py:642-653`), build `llm` dict as legacy (`app.py:655-662`), **`docs = validate_docs([d["id"] for d in req.documents])`** (rejects bogus ids — but note test passes full doc dicts from frontend; validate by id, use catalog entry), `jid = create_job(...)`, `bg.add_task(run_job, jid)`, return `{"jobId": jid}`
  - `GET /api/status/{job_id}`: legacy shape — `status, progressMessage, total, current, results, error, logs, currentContent, currentDocName`; 404 JSON if missing
  - `GET /api/download/{job_id}`: ZIP with `Content-Disposition: attachment; filename=RIG_Report_Package.zip`; 404 if missing, 400 if not ready
  - `GET /api/docs` → `DOCS`
  - Static: `app.mount("/assets", StaticFiles(directory="assets"), name="assets")` + `GET /` → `FileResponse("index.html")` (guard: only if `index.html` exists — Task 1 health tests run before frontend exists, so use `os.path.exists` check or add static in Task 7; **simplest: add mount + index route now, create a placeholder `index.html` + `assets/` dir in this task**)
- [ ] **Step 4:** Run `pytest -q` → PASS (all 5 test files)
- [ ] **Step 5:** Commit `feat: API routes with catalog validation`

### Task 7: Frontend rebuild

**Files:**
- Create: `index.html`, `assets/css/index.css`, `assets/js/app.js`
- Delete: `assets/css/auth.css` (already gone after wipe — do NOT restore it)

**Interfaces:**
- Consumes: `GET /api/docs`, `POST /api/generate`, `GET /api/status/{id}`, `GET /api/download/{id}` (shapes locked in Task 6)

- [ ] **Step 0 (ruling applied):** catalog is 44 docs — frontend copy must say 44, not 45: hero headline `Generate 44 consulting documents`, filter chip `All 44`, and any other count references in `index.html`.
- [ ] **Step 1:** Port stylesheet: `git show legacy-rig:assets/css/index.css > assets/css/index.css` (243 lines — the complete zinc+indigo theme: topbar, stepper, hero, forms, doc grid, gen layout, live preview, results, drawer, fallback list, toast, light theme). Do not restore `auth.css`.
- [ ] **Step 2:** Rebuild `index.html` — structural parity with legacy (`git show legacy-rig:index.html`): same IDs (`f-name ... f-lang`, `doc-grid`, `prog-fill/lbl/pct`, `status-ticker`, `live-preview`, `live-doc-name`, `results-list`, `pv-content`, drawer IDs, `toast`), same inline theme-toggle script at the bottom. Keep `<link rel="stylesheet" href="assets/css/index.css">` and `<script src="assets/js/app.js">`.
- [ ] **Step 3:** Rebuild `assets/js/app.js` from legacy logic (`git show legacy-rig:assets/js/app.js`) with these changes:
  - **Remove hardcoded `DOCS` array**; on `DOMContentLoaded`: `const DOCS = await (await fetch('/api/docs')).json()` then `renderDocGrid()`
  - Keep `PROVIDERS`, settings (localStorage `rig_settings`), drawer, fallback drag-reorder, `goTo`, `switchProvider`, doc grid, toast, log, preview, results, restart — same behavior
  - Live preview polling unchanged: legacy contract `st.currentContent` / `st.currentDocName` (Task 5 clears both when idle)
  - `startGeneration` payload: same field names as legacy `app.js:298-324`, but `documents: DOCS.filter(d => S.selected.has(d.id))` (backend now validates)
  - Style cleanup: template literals instead of string concatenation; keep it vanilla, no build step
- [ ] **Step 4:** Syntax gate: `node --check assets/js/app.js` → OK; `python -c "from rig.routes import app"` → OK
- [ ] **Step 5:** Smoke: `python app.py &`, then:
  - `curl -s localhost:8000/api/docs | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"` → `44`
  - `curl -s localhost:8000/ | head -5` → HTML
  - `curl -s -X POST localhost:8000/api/generate -H 'Content-Type: application/json' -d '{"documents":[{"id":"bogus"}]}' -o /dev/null -w "%{http_code}"` → `422`
  - Kill server
- [ ] **Step 6:** Commit `feat: rebuilt frontend (wizard, drawer, live preview)`

### Task 8: Scripts, Docker, README

**Files:**
- Create/restore: `run.sh`, `setup.sh`, `start.py`, `RIG.bat`, `rig.desktop`, `Dockerfile`, `docker-compose.yml`, `README.md`

- [ ] **Step 1:** Restore launchers from the backup tag — they reference `uvicorn app:app` / `python app.py`, both still valid: `git show legacy-rig:run.sh > run.sh` (same for `setup.sh`, `start.py`, `RIG.bat`, `rig.desktop`, `Dockerfile`, `docker-compose.yml`); `chmod +x run.sh setup.sh start.py rig.desktop`
- [ ] **Step 2:** Rewrite `README.md`: architecture section shows `rig/` package layout (catalog/providers/render/jobs/routes), quick start unchanged (`pip install -r requirements.txt && python app.py`), note sequential generation + off-loop rendering, drop stale references to OpenRouter being disabled
- [ ] **Step 3:** Syntax checks: `bash -n run.sh setup.sh` → OK; `python -m py_compile start.py app.py` → OK
- [ ] **Step 4:** Commit `chore: restore launchers, docker, README`

### Task 9: Full verification

- [ ] **Step 1:** `pytest -q` → all green; count tests ≥ 20
- [ ] **Step 2:** `git log --oneline` → clean task-by-task history, no uncommitted changes (`git status --porcelain` empty)
- [ ] **Step 3:** Live E2E (needs user's API key or running Ollama): `python app.py`, open http://localhost:8000, fill step 1, select 2 docs in step 2, generate with a configured provider in step 3, confirm: log lines AND live preview keep updating **while** PDFs convert (event-loop fix proven), step 4 preview renders, ZIP downloads, PDF/DOCX open cleanly
- [ ] **Step 4:** Perf sanity: legacy single-doc cycle froze the UI during PDF/DOCX conversion; new build must not. 44-doc wall clock bounded by LLM latency (sequential, as requested) with rendering pipelined off-loop
- [ ] **Step 5:** Report results to user; `obsidian-memory` progress update + session notes

## Self-Review Notes (done)

- **Spec coverage:** wipe/backup (T0), skeleton (T1), catalog+validation (T2), providers+rotation+fallback (T3), rendering+watermark (T4), sequential jobs+blueprint+ZIP (T5), API contract parity (T6), frontend parity (T7), launchers/docs (T8), verification (T9). Sequential-only constraint enforced in T5 interface + Global Constraints.
- **Placeholders:** none — every step carries exact code/test content.
- **Type consistency:** `call_llm(cfg, prompt, system, temp, on_token, on_log)` used identically in T3/T5/T6; job dict keys identical to legacy contract across T5/T6/T7; `validate_docs` defined T2, consumed T6.
