"""
RIG — Report Intelligence Generator
Single-file backend. Run: python app.py
"""
import asyncio
import json
import logging
import os
import re
import time
import urllib.parse
import uuid
import zipfile
from html import escape
from io import BytesIO

import httpx
from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

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

async def call_llm_with_fallback(llm_config: dict, prompt: str, system: str, temp=0.7, preferred: str = "") -> tuple[str, str]:
    """Returns (content, provider_used). Rotates through keys on 429."""
    errors = []
    order = list(PROVIDERS)
    if preferred in order:
        order.remove(preferred)
        order.insert(0, preferred)

    for prov in order:
        cfg = llm_config.get(prov, {})
        if prov == "ollama":
            if not _ollama_ok(cfg.get("url") or ""):
                continue
            keys = [None]  # ollama doesn't use keys
        else:
            keys = cfg.get("keys", [])
            if not keys:
                continue

        for key_idx, key in enumerate(keys):
            for attempt in range(1, 4):
                try:
                    if prov == "ollama":
                        result = await call_ollama(cfg["url"], cfg.get("model", "llama3"), prompt, system, temp)
                    elif prov == "groq":
                        result = await call_groq(key, cfg.get("model", "qwen/qwen3.8-27b"), prompt, system, temp)
                    elif prov == "openrouter":
                        result = await call_openrouter(key, cfg.get("model", "meta-llama/llama-3-8b-instruct:free"), prompt, system, temp)
                    elif prov == "gemini":
                        result = await call_gemini(key, cfg.get("model", "gemini-2.5-flash"), prompt, system, temp)
                    else:
                        continue
                    return result, prov
                except RateLimited:
                    if key_idx < len(keys) - 1:
                        errors.append(f"{prov} key#{key_idx+1}: rate limited, trying next key")
                        break  # break attempt loop, move to next key
                    if attempt >= 3:
                        errors.append(f"{prov} key#{key_idx+1}: rate limited on last key")
                        break
                    wait = 5 * attempt
                    errors.append(f"{prov} key#{key_idx+1}: rate limited, waited {wait}s (last key)")
                    await asyncio.sleep(wait)
                except httpx.HTTPStatusError as e:
                    errors.append(f"{prov} key#{key_idx+1} attempt#{attempt}: {_redact(str(e))}")
                    if e.response.status_code in (401, 403, 404):
                        break  # bad key/config — don't retry, next key
                    if attempt < 3:
                        await asyncio.sleep(2)
                except Exception as e:
                    errors.append(f"{prov} key#{key_idx+1} attempt#{attempt}: {_redact(str(e))}")
                    if attempt < 3:
                        await asyncio.sleep(2)

    raise Exception(f"All providers failed: {'; '.join(errors)}")


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


async def generate_blueprint(llm_config: dict, project: dict, preferred: str = "") -> dict:
    prompt = f"""Project Blueprint for: "{project['name']}"
Sector: {project['sector']} | Location: {project['geo']} | Client: {project['client']}
Audience: {project['audience']} | Budget: {project['price']} | Duration: {project['duration']}
Description: {project['desc']}
Standards: {project['standards']}

Return ONLY raw JSON with keys: projectTitle, executiveObjective, coreMethodologies(array), primaryLocation, mainStakeholders(array), keyMilestones(array of {{name,duration}}), priceSummary, industryContext, complianceFramework(array)"""

    text, _ = await call_llm_with_fallback(llm_config, prompt, "Generate strict JSON. No markdown.", 0.3, preferred)
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


# ── Single document generation ─────────────────────────────────
async def generate_document(llm_config: dict, project: dict, blueprint: dict, doc: dict, preferred: str = "") -> dict:
    bp = blueprint
    name = doc.get("name", "Document")
    cat = doc.get("cat", "general")
    # ponytail: sanitize before try so zip paths can't escape (ZIP slip)
    safe = re.sub(r'[^A-Za-z0-9 _-]', '', name.replace(" ", "_")).strip()[:80] or "document"
    cat = re.sub(r'[^A-Za-z0-9_-]', '', cat) or "GENERAL"
    fname = f"{cat}/{safe}.md"
    hname = f"{cat}/{safe}.html"

    prompt = f"""Consulting document: "{name}" ({cat}).

PROJECT: {bp.get('projectTitle', project['name'])}
OBJECTIVE: {bp.get('executiveObjective', project['desc'])}
LOCATION: {bp.get('primaryLocation', project['geo'])}
STAKEHOLDERS: {json.dumps(bp.get('mainStakeholders', []))}
MILESTONES: {json.dumps(bp.get('keyMilestones', []))}
BUDGET: {json.dumps(bp.get('priceSummary', project['price']))}
METHODOLOGIES: {json.dumps(bp.get('coreMethodologies', []))}

Language: {project['lang']}. Length: 2000+ words. Format: Markdown.
Include tables, lists, Mermaid diagrams where applicable.
Professional consulting tone. No placeholders. Full content."""

    try:
        content, used_provider = await call_llm_with_fallback(
            llm_config, prompt,
            "Expert consultant. Generate comprehensive markdown documents. No preamble, just the document.",
            0.7, preferred
        )

        html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 30px;color:#1a1a2e;line-height:1.7}}
h1{{font-size:26px;border-bottom:3px solid #b8f241;padding-bottom:10px}}
h2{{font-size:20px;color:#2d2d44;margin-top:32px;border-left:4px solid #41e8f2;padding-left:12px}}
h3{{font-size:16px;color:#3a3a52;margin-top:24px}}
table{{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}}
th{{background:#f0f0f5;padding:10px 12px;text-align:left;border:1px solid #d0d0e0;font-weight:600}}
td{{padding:8px 12px;border:1px solid #d0d0e0}}
tr:nth-child(even){{background:#f8f8fc}}
ul,ol{{padding-left:22px}}li{{margin-bottom:6px}}
blockquote{{border-left:3px solid #b8f241;margin:16px 0;padding:10px 16px;background:#f8fdf0}}
.header{{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #e0e0f0}}
.meta{{font-size:12px;color:#7a7a9e;margin-top:8px}}
</style></head><body>
<div class="header"><h1>{escape(str(bp.get('projectTitle', project['name'])))}</h1>
<p class="meta">{escape(str(name))} | {escape(str(project['sector']))} | {escape(str(project['geo']))} | via {escape(used_provider)}</p></div>
<pre style="white-space:pre-wrap">{escape(content)}</pre></body></html>"""

        return {
            "fileName": fname, "htmlFileName": hname,
            "docName": name, "category": cat,
            "markdown": content, "html": html,
            "wordCount": len(content.split()),
            "error": False, "usedProvider": used_provider
        }
    except Exception as e:
        msg = _redact(str(e))
        return {
            "fileName": fname, "htmlFileName": hname,
            "docName": name, "category": cat,
            "markdown": f"# {name}\n\nFailed: {msg}",
            "html": f"<h1>{escape(str(name))}</h1><p>{escape(msg)}</p>",
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
    llm_config = data.get("llm", {})
    project = data["project"]
    docs = data["docs"]
    preferred = data.get("preferred", "")
    job["total"] = len(docs)
    log.info("job %s started: %d docs", job_id, len(docs))

    try:
        # Step 1: Blueprint
        job["status"] = "generating_blueprint"
        job["progressMessage"] = "Generating project blueprint..."
        try:
            blueprint = await generate_blueprint(llm_config, project, preferred)
        except Exception:
            blueprint = _stub_blueprint(project)

        # Step 2: Documents — concurrent, results appended in docs order
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("BLUEPRINT.json", json.dumps(blueprint, indent=2))

            job["status"] = "generating"
            job["progressMessage"] = f"Generating {len(docs)} documents..."
            sem = asyncio.Semaphore(4)
            events = [asyncio.Event() for _ in docs]
            seen: set = set()

            async def worker(i: int, doc: dict):
                async with sem:
                    result = await generate_document(llm_config, project, blueprint, doc, preferred)
                if i:
                    await events[i - 1].wait()
                zf.writestr(_uniq(result["fileName"], seen), result["markdown"])
                zf.writestr(_uniq(result["htmlFileName"], seen), result["html"])
                job["results"].append({
                    "docName": result["docName"],
                    "fileName": result["fileName"],
                    "wordCount": result["wordCount"],
                    "error": result["error"],
                    "usedProvider": result.get("usedProvider", ""),
                    "errorMessage": result.get("errorMessage", ""),
                    "markdown": result["markdown"],
                    "html": result["html"],
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

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued",
        "progressMessage": "Starting...",
        "total": len(req.documents),
        "current": 0,
        "results": [],
        "zipBytes": None,
        "error": None,
        "createdAt": time.time(),
    }

    bg.add_task(run_job, job_id, {"project": project, "docs": req.documents, "llm": llm, "preferred": req.provider})
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
        "results": [{k: v for k, v in r.items() if k not in ("markdown", "html")} for r in job["results"]],
        "error": job["error"],
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
        "html": r["html"],
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
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
async def index():
    return FileResponse("index.html")


if __name__ == "__main__":
    import uvicorn
    print("\n  RIG — Report Intelligence Generator")
    print("  http://localhost:8000\n")
    uvicorn.run(app, host=os.environ.get("HOST", "127.0.0.1"), port=8000)
