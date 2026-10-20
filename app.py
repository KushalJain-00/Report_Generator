"""
RIG — Report Intelligence Generator
Single-file backend. Run: python app.py
"""
import os
import sys

# Windowed PyInstaller exe: no console → std streams are None, which crashes
# uvicorn's logging formatter (sys.stderr.isatty()). Point them at devnull.
# Must run before any third-party import (warnings print to stderr).
if getattr(sys, "frozen", False) and sys.stderr is None:
    sys.stdout = open(os.devnull, "w")
    sys.stderr = open(os.devnull, "w")

import asyncio
import json
import logging
import re
import time
import urllib.parse
import uuid
import zipfile
from io import BytesIO
from pathlib import Path

import httpx
from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Frozen (PyInstaller) builds extract to sys._MEIPASS; source runs sit next to this file.
_BASE = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))

app = FastAPI(title="RIG")
log = logging.getLogger("rig")

# ── In-memory job store ────────────────────────────────────────
jobs: dict = {}

# ── LLM providers ──────────────────────────────────────────────
async def call_ollama(url: str, model: str, prompt: str, system: str, temp: float) -> str:
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post(f"{url}/api/chat", json={
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            "stream": False,
            "options": {"temperature": temp}
        })
        r.raise_for_status()
        return r.json().get("message", {}).get("content", "")


async def call_openrouter(key: str, model: str, prompt: str, system: str, temp: float) -> str:
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post("https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ], "temperature": temp}
        )
        if r.status_code == 429:
            raise RateLimited("OpenRouter 429")
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def call_gemini(key: str, model: str, prompt: str, system: str, temp: float) -> str:
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
            json={"contents": [{"parts": [{"text": f"{system}\n\n{prompt}"}]}],
                  "generationConfig": {"temperature": temp}}
        )
        if r.status_code == 429:
            raise RateLimited("Gemini 429")
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]


async def call_groq(key: str, model: str, prompt: str, system: str, temp: float) -> str:
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ], "temperature": temp}
        )
        if r.status_code == 429:
            raise RateLimited("Groq 429")
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


class RateLimited(Exception):
    pass


def _redact(msg: str) -> str:
    return re.sub(r'\?key=[^&\s\'"]+', '', msg)


_OLLAMA_HOSTS = {"localhost", "127.0.0.1", "ollama", "host.docker.internal"}


def _ollama_ok(url: str) -> bool:
    try:
        p = urllib.parse.urlparse(url)
        host = p.hostname
    except ValueError:
        return False
    return p.scheme in ("http", "https") and host in _OLLAMA_HOSTS


# ── Retry + fallback ───────────────────────────────────────────
PROVIDERS = ["groq", "openrouter", "gemini", "ollama"]
_DISPATCH = {"groq": call_groq, "openrouter": call_openrouter, "gemini": call_gemini}
_cooldowns: dict = {}  # ponytail: in-memory across jobs; server restart clears


def build_pool(llm: dict, order: list, disabled: set, fallback: str = "") -> list:
    """Entries in dispatch order: user priority first, then the rest of the chain."""
    order = [p for p in order if p in PROVIDERS]
    if fallback in PROVIDERS and fallback not in order:
        order.insert(0, fallback)
    order += [p for p in PROVIDERS if p not in order]
    pool = []
    for prov in order:
        cfg = llm.get(prov, {})
        if prov == "ollama":
            if cfg.get("url"):
                pool.append({"prov": "ollama", "idx": 0, "key": cfg["url"], "model": cfg.get("model", "llama3"), "url": cfg["url"], "used": 0, "dead": False})
        else:
            for i, k in enumerate(cfg.get("keys", [])):
                if k and k not in disabled:
                    pool.append({"prov": prov, "idx": i, "key": k, "model": cfg.get("model", ""), "url": "", "used": 0, "dead": False})
    return pool


def _key_status(job, e, state):
    entry = {"state": state, "used": e["used"]}
    if state == "cooldown":
        entry["cooldownLeft"] = max(0, int(_cooldowns.get(e["key"], 0) - time.time()))
    job["keyStatus"][f"{e['prov']}#{e['idx']}"] = entry


async def call_llm(pool: list, job: dict, prompt: str, system: str, temp=0.7) -> tuple[str, str]:
    """Returns (content, provider_used). Least-used-first over healthy pool."""
    if not pool:
        raise Exception("No enabled API keys")
    errors = []
    # ponytail: bounded rounds over the whole pool — no per-entry attempt bookkeeping.
    # 429 → 30s cooldown, 401/403/404 → dead, transient → 5s cooldown (retried next round)
    for _ in range(5):
        now = time.time()
        healthy = sorted((e for e in pool if not e["dead"] and _cooldowns.get(e["key"], 0) <= now),
                         key=lambda e: e["used"])
        if not healthy:
            waits = [t - time.time() for t in (_cooldowns.get(e["key"], 0) for e in pool if not e["dead"])]
            if not waits:
                break  # all entries disabled
            await asyncio.sleep(max(0.2, min(min(waits), 30)))
            continue
        for e in healthy:
            try:
                if e["prov"] == "ollama":
                    result = await call_ollama(e["url"], e["model"], prompt, system, temp)
                else:
                    result = await _DISPATCH[e["prov"]](e["key"], e["model"], prompt, system, temp)
                e["used"] += 1
                _key_status(job, e, "active")
                return result, e["prov"]
            except RateLimited:
                _cooldowns[e["key"]] = time.time() + 30
                _key_status(job, e, "cooldown")
                errors.append(f'{e["prov"]} key#{e["idx"]+1}: rate limited (30s cooldown)')
            except httpx.HTTPStatusError as ex:
                errors.append(f'{e["prov"]} key#{e["idx"]+1}: {_redact(str(ex))}')
                if ex.response.status_code in (401, 403, 404):
                    e["dead"] = True
                    _key_status(job, e, "disabled")
            except Exception as ex:
                errors.append(f'{e["prov"]} key#{e["idx"]+1}: {_redact(str(ex))}')
                _cooldowns[e["key"]] = time.time() + 5
        if all(e["dead"] for e in pool):
            break
    if all(e["dead"] for e in pool) and errors:
        errors.append("all keys disabled for this job — re-enable in the key cards")
    raise Exception(f"All providers failed: {'; '.join(errors[-8:])}")


# ── Blueprint generation ───────────────────────────────────────
def _stub_blueprint(project: dict) -> dict:
    return {
        "projectTitle": project["name"],
        "executiveObjective": project["desc"],
        "coreMethodologies": [project["standards"]],
        "primaryLocation": project["geo"],
        "mainStakeholders": [],
        "keyMilestones": [],
        "priceSummary": project["price"],
        "industryContext": "",
        "complianceFramework": []
    }


async def generate_blueprint(pool: list, job: dict, project: dict) -> dict:
    prompt = f"""You are the master context generator for a set of 44 consulting documents that must all stay factually consistent with your output. Be specific and complete — concrete stakeholders, real milestone names, no empty strings where reasonable data can be inferred from the project.

Project Blueprint for: "{project['name']}"
Sector: {project['sector']} | Location: {project['geo']} | Client: {project['client']}
Audience: {project['audience']} | Budget: {project['price']} | Duration: {project['duration']}
Description: {project['desc']}
Standards: {project['standards']}

Return ONLY raw JSON with keys: projectTitle, executiveObjective, coreMethodologies(array), primaryLocation, mainStakeholders(array), keyMilestones(array of {{name,duration}}), priceSummary, industryContext, complianceFramework(array)"""

    text, _ = await call_llm(pool, job, prompt, "Generate strict JSON. No markdown.", 0.3)
    try:
        text = text.strip()
        try:
            data = json.loads(text.removeprefix("```json").removesuffix("```").strip())
        except Exception:
            start = text.find("{")
            if start < 0:
                raise
            data, _ = json.JSONDecoder().raw_decode(text[start:])
        if not isinstance(data, dict):
            raise ValueError("blueprint is not a JSON object")
        return data
    except Exception:
        return _stub_blueprint(project)


# ── Markdown → DOCX ───────────────────────────────────────────
_INLINE = re.compile(r'(\*\*.+?\*\*|__.+?__|\*.+?\*|_.+?_|`.+?`)')


def _add_inline(p, text: str):
    """Bold/italic/code runs. ponytail: no nested emphasis — good enough for LLM output."""
    for part in _INLINE.split(text):
        if not part:
            continue
        if len(part) > 4 and part[:2] in ("**", "__") and part[:2] == part[-2:]:
            p.add_run(part[2:-2]).bold = True
        elif len(part) > 2 and part[0] == part[-1] == "`":
            r = p.add_run(part[1:-1]); r.font.name = "Consolas"
        elif len(part) > 2 and part[0] == part[-1] in "*_":
            p.add_run(part[1:-1]).italic = True
        else:
            p.add_run(part)


def _is_table_sep(row: str) -> bool:
    cells = [c.strip() for c in row.strip().strip("|").split("|")]
    return bool(cells) and all(re.fullmatch(r":?-{2,}:?", c) for c in cells)


def md_to_docx(md: str) -> bytes:
    from docx import Document
    from docx.shared import Pt
    doc = Document()
    lines = md.splitlines()
    i, code = 0, None
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("```"):
            if code is None:
                code = []
            else:
                r = doc.add_paragraph().add_run("\n".join(code))
                r.font.name, r.font.size = "Consolas", Pt(9)
                code = None
            i += 1
            continue
        if code is not None:
            code.append(line)
            i += 1
            continue
        if line.strip().startswith("|") and i + 1 < len(lines) and _is_table_sep(lines[i + 1]):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                if not _is_table_sep(lines[i]):
                    rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            if rows:
                cols = len(rows[0])
                t = doc.add_table(rows=len(rows), cols=cols)
                t.style = "Table Grid"
                for ri, row in enumerate(rows):
                    for ci in range(min(len(row), cols)):
                        p = t.rows[ri].cells[ci].paragraphs[0]
                        _add_inline(p, row[ci])
                        if ri == 0:
                            for run in p.runs:
                                run.bold = True
            continue
        m = re.match(r'^(#{1,6})\s+(.*)', line)
        if m:
            doc.add_heading(m.group(2), level=len(m.group(1)))
        elif re.match(r'^\s*(-{3,}|\*{3,}|_{3,})\s*$', line):
            pass  # horizontal rule — no native docx equivalent, skip
        elif line.lstrip().startswith(">"):
            _add_inline(doc.add_paragraph(style="Quote"), line.lstrip()[1:].strip())
        elif (m := re.match(r'^\s*([-*+]|\d+\.)\s+(.*)', line)):
            # ponytail: "List Number" style continues one numbering sequence across lists
            style = "List Number" if m.group(1)[0].isdigit() else "List Bullet"
            _add_inline(doc.add_paragraph(style=style), m.group(2))
        elif line.strip():
            _add_inline(doc.add_paragraph(), line.strip())
        i += 1
    if code:
        r = doc.add_paragraph().add_run("\n".join(code))
        r.font.name, r.font.size = "Consolas", Pt(9)
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── Single document generation ─────────────────────────────────
async def generate_document(pool: list, job: dict, project: dict, blueprint: dict, doc: dict) -> dict:
    bp = blueprint
    name = doc.get("name", "Document")
    cat = doc.get("cat", "general")
    # ponytail: sanitize before try so zip paths can't escape (ZIP slip)
    safe = re.sub(r'[^A-Za-z0-9 _-]', '', name.replace(" ", "_")).strip()[:80] or "document"
    cat = re.sub(r'[^A-Za-z0-9_-]', '', cat) or "GENERAL"
    fname = f"{cat}/{safe}.docx"

    prompt = f"""MASTER CONTEXT (stay factually consistent with this across all documents):
{json.dumps(bp, ensure_ascii=False)}

Consulting document: "{name}" ({cat}).

PROJECT: {bp.get('projectTitle', project['name'])}
OBJECTIVE: {bp.get('executiveObjective', project['desc'])}
LOCATION: {bp.get('primaryLocation', project['geo'])}
STAKEHOLDERS: {json.dumps(bp.get('mainStakeholders', []))}
MILESTONES: {json.dumps(bp.get('keyMilestones', []))}
BUDGET: {json.dumps(bp.get('priceSummary', project['price']))}
METHODOLOGIES: {json.dumps(bp.get('coreMethodologies', []))}

Language: {project['lang']}. Length: 2000+ words. Format: Markdown.
Include tables and lists where applicable.
Professional consulting tone. No placeholders. Full content."""

    try:
        content, used_provider = await call_llm(
            pool, job, prompt,
            "Expert consultant. Generate comprehensive markdown documents. No preamble, just the document.",
            0.7
        )

        return {
            "fileName": fname,
            "docName": name, "category": cat,
            "docx": md_to_docx(content),
            "markdown": content,
            "wordCount": len(content.split()),
            "error": False, "usedProvider": used_provider
        }
    except Exception as e:
        msg = _redact(str(e))
        return {
            "fileName": fname,
            "docName": name, "category": cat,
            "docx": None,
            "markdown": f"# {name}\n\nFailed: {msg}",
            "wordCount": 0, "error": True, "errorMessage": msg
        }


def _uniq(name: str, seen: set) -> str:
    if name not in seen:
        seen.add(name)
        return name
    stem, dot, ext = name.rpartition(".")
    if not dot:
        stem, ext = name, ""
    else:
        ext = "." + ext
    n = 2
    while f"{stem}-{n}{ext}" in seen:
        n += 1
    name = f"{stem}-{n}{ext}"
    seen.add(name)
    return name


# ── Job runner ─────────────────────────────────────────────────
async def run_job(job_id: str, data: dict):
    job = jobs[job_id]
    pool = data["pool"]
    project = data["project"]
    docs = data["docs"]
    job["total"] = len(docs)
    log.info("job %s started: %d docs, pool=%d", job_id, len(docs), len(pool))

    try:
        # Step 1: Blueprint
        job["status"] = "generating_blueprint"
        job["progressMessage"] = "Generating project blueprint..."
        try:
            blueprint = await generate_blueprint(pool, job, project)
        except Exception:
            blueprint = _stub_blueprint(project)

        # Step 2: Documents — concurrent, results appended in docs order
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            job["status"] = "generating"
            job["progressMessage"] = f"Generating {len(docs)} documents..."
            sem = asyncio.Semaphore(min(max(len(pool), 1), 8))
            events = [asyncio.Event() for _ in docs]
            seen: set = set()

            async def worker(i: int, doc: dict):
                async with sem:
                    result = await generate_document(pool, job, project, blueprint, doc)
                if i:
                    await events[i - 1].wait()
                if result["docx"]:
                    zf.writestr(_uniq(result["fileName"], seen), result["docx"])
                job["results"].append({
                    "docName": result["docName"],
                    "fileName": result["fileName"],
                    "wordCount": result["wordCount"],
                    "error": result["error"],
                    "usedProvider": result.get("usedProvider", ""),
                    "errorMessage": result.get("errorMessage", ""),
                    "markdown": result["markdown"],
                    "category": result["category"]
                })
                job["current"] = i + 1
                job["progressMessage"] = f"[{i+1}/{len(docs)}] Generated: {result['docName']}"
                events[i].set()

            await asyncio.gather(*(worker(i, d) for i, d in enumerate(docs)))

        job["zipBytes"] = zip_buffer.getvalue()
        job["status"] = "done"
        ok = sum(1 for r in job["results"] if not r["error"])
        job["progressMessage"] = f"Complete! {ok}/{len(docs)} documents generated"
        log.info("job %s done: %d/%d ok", job_id, ok, len(docs))

    except Exception as e:
        log.exception("job %s failed", job_id)
        job["status"] = "error"
        msg = _redact(str(e))
        job["progressMessage"] = f"Fatal error: {msg}"
        job["error"] = msg


# ── API routes ─────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    provider: str = "groq"
    ollamaUrl: str = ""
    ollamaModel: str = "llama3"
    groqKeys: list[str] = []
    groqModel: str = "qwen/qwen3.8-27b"
    openrouterKeys: list[str] = []
    openrouterModel: str = "meta-llama/llama-3-8b-instruct:free"
    geminiKeys: list[str] = []
    geminiModel: str = "gemini-2.5-flash"
    metadata: dict = {}
    documents: list[dict] = []
    providerOrder: list[str] = []
    disabledKeys: list[str] = []


@app.post("/api/generate")
async def start_generation(req: GenerateRequest, bg: BackgroundTasks):
    for old in [k for k, v in jobs.items() if time.time() - v.get("createdAt", 0) > 3600]:
        del jobs[old]
    req.documents = req.documents[:45]

    meta = req.metadata
    project = {
        "name": meta.get("name", "Unnamed"),
        "sector": meta.get("sector", "General"),
        "geo": meta.get("geo", "N/A"),
        "client": meta.get("client", "N/A"),
        "audience": meta.get("audience", "N/A"),
        "desc": meta.get("desc", ""),
        "standards": meta.get("standards", "N/A"),
        "price": meta.get("price", "N/A"),
        "duration": meta.get("duration", "N/A"),
        "lang": meta.get("lang", "English"),
    }

    llm = {
        "ollama": {"url": req.ollamaUrl if _ollama_ok(req.ollamaUrl) else "", "model": req.ollamaModel},
        "groq": {"keys": req.groqKeys, "model": req.groqModel},
        "openrouter": {"keys": req.openrouterKeys, "model": req.openrouterModel},
        "gemini": {"keys": req.geminiKeys, "model": req.geminiModel},
    }
    pool = build_pool(llm, req.providerOrder, set(req.disabledKeys), fallback=req.provider)
    if not pool:
        return JSONResponse({"error": "No enabled API keys — add or re-enable keys first"}, 400)

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued",
        "progressMessage": "Starting...",
        "total": len(req.documents),
        "current": 0,
        "results": [],
        "zipBytes": None,
        "error": None,
        "keyStatus": {},
        "createdAt": time.time(),
    }

    bg.add_task(run_job, job_id, {"project": project, "docs": req.documents, "pool": pool})
    return {"jobId": job_id}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, 404)
    return {
        "status": job["status"],
        "progressMessage": job["progressMessage"],
        "total": job["total"],
        "current": job["current"],
        "results": [{k: v for k, v in r.items() if k != "markdown"} for r in job["results"]],
        "error": job["error"],
        "keyStatus": job.get("keyStatus", {}),
    }


@app.get("/api/document/{job_id}/{index}")
async def get_document(job_id: str, index: int):
    job = jobs.get(job_id)
    if not job or index < 0 or index >= len(job["results"]):
        return JSONResponse({"error": "Not found"}, 404)
    r = job["results"][index]
    return {
        "docName": r["docName"],
        "markdown": r["markdown"],
        "wordCount": r["wordCount"],
        "error": r["error"],
        "errorMessage": r.get("errorMessage", ""),
        "category": r["category"],
    }


@app.get("/api/download/{job_id}")
async def download(job_id: str):
    job = jobs.get(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, 404)
    if not job["zipBytes"]:
        return JSONResponse({"error": "Not ready"}, 400)
    return Response(
        content=job["zipBytes"],
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=RIG_Report_Package.zip"}
    )


@app.get("/health")
async def health():
    return {"ok": True}


# ── Serve frontend ─────────────────────────────────────────────
app.mount("/assets", StaticFiles(directory=str(_BASE / "assets")), name="assets")

@app.get("/")
async def index():
    return FileResponse(_BASE / "index.html")


def _free_port(preferred: int = 8000, tries: int = 11) -> int:
    import socket
    for port in range(preferred, preferred + tries):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return preferred


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 0)) or _free_port()
    host = os.environ.get("HOST", "127.0.0.1")
    if getattr(sys, "frozen", False):
        # Windowed exe: no console — open the browser ourselves.
        import threading
        import webbrowser
        threading.Timer(1.5, lambda: webbrowser.open(f"http://localhost:{port}")).start()
    else:
        print("\n  RIG — Report Intelligence Generator")
        print(f"  http://localhost:{port}\n")
    uvicorn.run(app, host=host, port=port)
