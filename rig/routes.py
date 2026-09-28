from pathlib import Path

from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from rig import jobs as jobs_mod
from rig.catalog import DOCS, validate_docs

app = FastAPI(title="RIG")

BASE_DIR = Path(__file__).resolve().parent.parent


@app.get("/api/health")
async def health():
    return {"ok": True}


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
    fallbackOrder: list = ["groq", "gemini", "ollama", "openrouter"]
    enabled: dict = {}
    metadata: dict = {}
    documents: list = []
    watermark: dict = {}


@app.post("/api/generate")
async def start_generation(req: GenerateRequest, bg: BackgroundTasks):
    docs = validate_docs([d["id"] for d in req.documents])
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
        "fallbackOrder": req.fallbackOrder,
        "enabled": req.enabled,
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
