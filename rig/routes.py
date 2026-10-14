from pathlib import Path

from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from rig import jobs as jobs_mod
from rig import storage
from rig.catalog import DOCS, validate_docs

app = FastAPI(title="RIG")

BASE_DIR = Path(__file__).resolve().parent.parent


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.get("/api/settings")
async def get_settings_endpoint():
    """Retrieve locally stored settings and API keys."""
    return storage.load_settings()


@app.post("/api/settings")
async def save_settings_endpoint(payload: dict):
    """Save settings and API keys locally to disk."""
    saved = storage.save_settings(payload)
    return {"ok": True, "settings": saved}


class GenerateRequest(BaseModel):
    provider: str = "groq"
    ollamaUrl: str = "http://localhost:11434"
    ollamaModel: str = "llama3"
    groqKeys: list = []
    groqModel: str = "qwen/qwen3.8-27b"
    openrouterKeys: list = []
    openrouterModel: str = "nvidia/nemotron-3-ultra-550b-a55b:free"  # keep in sync with assets/js/app.js defaultModel
    geminiKeys: list = []
    geminiModel: str = "gemini-2.5-flash"
    fallbackOrder: list = ["groq", "gemini", "ollama", "openrouter"]
    enabled: dict = {}
    metadata: dict = {}
    documents: list = []
    watermark: dict = {}


@app.post("/api/generate")
async def start_generation(req: GenerateRequest, bg: BackgroundTasks):
    docs = validate_docs([d.get("id") for d in req.documents if isinstance(d, dict)])
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

    # Fallback to local stored keys/configs if omitted in request
    stored = storage.load_settings()
    stored_keys = stored.get("keys", {})

    groq_keys = req.groqKeys if req.groqKeys else stored_keys.get("groq", [])
    openrouter_keys = req.openrouterKeys if req.openrouterKeys else stored_keys.get("openrouter", [])
    gemini_keys = req.geminiKeys if req.geminiKeys else stored_keys.get("gemini", [])
    ollama_url = req.ollamaUrl if req.ollamaUrl else stored.get("ollamaUrl", "http://localhost:11434")

    llm = {
        "ollama": {"url": ollama_url, "model": req.ollamaModel},
        "groq": {"keys": groq_keys, "model": req.groqModel},
        "openrouter": {"keys": openrouter_keys, "model": req.openrouterModel},
        "gemini": {"keys": gemini_keys, "model": req.geminiModel},
        "fallbackOrder": req.fallbackOrder or stored.get("fallbackOrder", ["groq", "gemini", "ollama", "openrouter"]),
        "enabled": req.enabled or stored.get("enabled", {}),
    }

    jid = jobs_mod.create_job(project, docs, llm, req.watermark)
    bg.add_task(jobs_mod.run_job, jid)
    return {"jobId": jid}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    job = jobs_mod.jobs.get(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, 404)
    return {
        "status": job["status"],
        "progressMessage": job["progressMessage"],
        "total": job["total"],
        "current": job["current"],
        "results": job["results"],
        "error": job["error"],
        "logs": job.get("logs", []),
        "currentContent": job.get("currentContent", ""),
        "currentDocName": job.get("currentDocName", ""),
    }


@app.get("/api/download/{job_id}")
async def download(job_id: str):
    job = jobs_mod.jobs.get(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, 404)
    if not job["zipBytes"]:
        return JSONResponse({"error": "Not ready"}, 400)
    return Response(
        content=job["zipBytes"],
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=RIG_Report_Package.zip"},
    )


@app.get("/api/docs")
async def docs_endpoint():
    return DOCS


app.mount("/assets", StaticFiles(directory=str(BASE_DIR / "assets")), name="assets")


@app.get("/")
async def index():
    return FileResponse(str(BASE_DIR / "index.html"))
