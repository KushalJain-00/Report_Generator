"""
RIG — Report Intelligence Generator
Single-file backend. Run: python app.py
"""
import asyncio
import json
import time
import uuid
import zipfile
from io import BytesIO

import httpx
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="RIG")

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
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
            headers={"Content-Type": "application/json"},
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


# ── Retry + fallback ───────────────────────────────────────────
PROVIDERS = ["groq", "gemini", "ollama"]

async def call_llm_with_fallback(llm_config: dict, prompt: str, system: str, temp=0.7) -> tuple[str, str]:
    """Returns (content, provider_used). Rotates through keys on 429."""
    errors = []
    for prov in PROVIDERS:
        cfg = llm_config.get(prov, {})
        if prov == "ollama":
            if not cfg.get("url"):
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
                    elif prov == "gemini":
                        result = await call_gemini(key, cfg.get("model", "gemini-2.5-flash"), prompt, system, temp)
                    return result, prov
                except RateLimited:
                    if key_idx < len(keys) - 1:
                        errors.append(f"{prov} key#{key_idx+1}: rate limited, trying next key")
                        break  # break attempt loop, move to next key
                    wait = 5 * attempt
                    errors.append(f"{prov} key#{key_idx+1}: rate limited, waited {wait}s (last key)")
                    await asyncio.sleep(wait)
                except Exception as e:
                    errors.append(f"{prov} key#{key_idx+1} attempt#{attempt}: {e}")
                    if attempt < 3:
                        await asyncio.sleep(2)

    raise Exception(f"All providers failed: {'; '.join(errors)}")


# ── Blueprint generation ───────────────────────────────────────
async def generate_blueprint(llm_config: dict, project: dict) -> dict:
    prompt = f"""Project Blueprint for: "{project['name']}"
Sector: {project['sector']} | Location: {project['geo']} | Client: {project['client']}
Audience: {project['audience']} | Budget: {project['price']} | Duration: {project['duration']}
Description: {project['desc']}
Standards: {project['standards']}

Return ONLY raw JSON with keys: projectTitle, executiveObjective, coreMethodologies(array), primaryLocation, mainStakeholders(array), keyMilestones(array of {{name,duration}}), priceSummary, industryContext, complianceFramework(array)"""

    text, _ = await call_llm_with_fallback(llm_config, prompt, "Generate strict JSON. No markdown.", 0.3)
    try:
        return json.loads(text.strip().removeprefix("```json").removesuffix("```").strip())
    except Exception:
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


# ── Single document generation ─────────────────────────────────
async def generate_document(llm_config: dict, project: dict, blueprint: dict, doc: dict) -> dict:
    bp = blueprint
    prompt = f"""Consulting document: "{doc['name']}" ({doc['cat']}).

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
            0.7
        )
        safe = doc["name"].replace(" ", "_").replace("/", "_")
        cat = doc.get("cat", "general").upper()
        fname = f"{cat}/{safe}.md"
        hname = f"{cat}/{safe}.html"

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
<div class="header"><h1>{bp.get('projectTitle', project['name'])}</h1>
<p class="meta">{doc['name']} | {project['sector']} | {project['geo']} | via {used_provider}</p></div>
{content}</body></html>"""

        return {
            "fileName": fname, "htmlFileName": hname,
            "docName": doc["name"], "category": doc["cat"],
            "markdown": content, "html": html,
            "wordCount": len(content.split()),
            "error": False, "usedProvider": used_provider
        }
    except Exception as e:
        safe = doc["name"].replace(" ", "_").replace("/", "_")
        cat = doc.get("cat", "general").upper()
        fname = f"{cat}/{safe}.md"
        return {
            "fileName": fname, "htmlFileName": f"{cat}/{safe}.html",
            "docName": doc["name"], "category": doc["cat"],
            "markdown": f"# {doc['name']}\n\nFailed: {e}",
            "html": f"<h1>{doc['name']}</h1><p>Failed: {e}</p>",
            "wordCount": 0, "error": True, "errorMessage": str(e)
        }


# ── Job runner ─────────────────────────────────────────────────
async def run_job(job_id: str, data: dict):
    job = jobs[job_id]
    llm_config = data.get("llm", {})
    project = data["project"]
    docs = data["docs"]
    job["total"] = len(docs)

    try:
        # Step 1: Blueprint
        job["status"] = "generating_blueprint"
        job["progressMessage"] = "Generating project blueprint..."
        blueprint = await generate_blueprint(llm_config, project)
        job["blueprint"] = blueprint

        # Step 2: Each document
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            # Add blueprint
            zf.writestr("BLUEPRINT.json", json.dumps(blueprint, indent=2))

            for i, doc in enumerate(docs):
                job["current"] = i + 1
                job["progressMessage"] = f"[{i+1}/{len(docs)}] Generating: {doc['name']}"
                job["status"] = "generating"

                result = await generate_document(llm_config, project, blueprint, doc)

                zf.writestr(result["fileName"], result["markdown"])
                zf.writestr(result["htmlFileName"], result["html"])

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

        job["zipBytes"] = zip_buffer.getvalue()
        job["status"] = "done"
        job["progressMessage"] = f"Complete! {len(docs)} documents generated."

    except Exception as e:
        job["status"] = "error"
        job["progressMessage"] = f"Fatal error: {e}"
        job["error"] = str(e)


# ── API routes ─────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    provider: str = "groq"
    ollamaUrl: str = "http://localhost:11434"
    ollamaModel: str = "llama3"
    groqKeys: list = []
    groqModel: str = "qwen/qwen3.8-27b"
    openrouterKeys: list = []
    openrouterModel: str = "meta-llama/llama-3-8b-instruct:free"
    geminiKeys: list = []
    geminiModel: str = "gemini-2.5-flash"
    metadata: dict = {}
    documents: list = []


@app.post("/api/generate")
async def start_generation(req: GenerateRequest, bg: BackgroundTasks):
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
        "ollama": {"url": req.ollamaUrl, "model": req.ollamaModel},
        "groq": {"keys": req.groqKeys, "model": req.groqModel},
        "openrouter": {"keys": req.openrouterKeys, "model": req.openrouterModel},
        "gemini": {"keys": req.geminiKeys, "model": req.geminiModel},
    }

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "status": "queued",
        "progressMessage": "Starting...",
        "total": len(req.documents),
        "current": 0,
        "results": [],
        "blueprint": None,
        "zipBytes": None,
        "error": None,
        "createdAt": time.time(),
    }

    bg.add_task(run_job, job_id, {"project": project, "docs": req.documents, "llm": llm})
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
        "results": job["results"],
        "error": job["error"],
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


# ── Serve frontend ─────────────────────────────────────────────
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
async def index():
    return FileResponse("index.html")


if __name__ == "__main__":
    import uvicorn
    print("\n  RIG — Report Intelligence Generator")
    print("  http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
