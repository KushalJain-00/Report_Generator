"""Sequential job runner — blueprint → docs → in-memory ZIP.

No concurrency of any kind (user requirement: parallel generation hammers
free-tier tokens and fails silently). Rendering runs off the event loop
via asyncio.to_thread so live preview/logs stay responsive.
"""

import asyncio
import json
import time
import uuid
import zipfile
from io import BytesIO

from rig.providers import call_llm
from rig.render import build_html, render_docx, render_pdf

jobs: dict[str, dict] = {}
_inputs: dict[str, dict] = {}


def add_log(job: dict, msg: str, log_type: str = "info") -> None:
    job.setdefault("logs", []).append(
        {"time": time.strftime("%H:%M:%S"), "type": log_type, "message": msg}
    )


def create_job(project: dict, docs: list[dict], llm: dict, watermark: dict) -> str:
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "status": "queued",
        "progressMessage": "Starting...",
        "total": len(docs),
        "current": 0,
        "results": [],
        "blueprint": None,
        "zipBytes": None,
        "error": None,
        "createdAt": time.time(),
        "logs": [],
        "currentContent": "",
        "currentDocName": "",
    }
    _inputs[job_id] = {"project": project, "docs": docs, "llm": llm, "watermark": watermark}
    return job_id


async def generate_blueprint(llm: dict, project: dict, on_log=None) -> dict:
    prompt = f"""Project Blueprint for: "{project['name']}"
Sector: {project['sector']} | Location: {project['geo']} | Client: {project['client']}
Audience: {project['audience']} | Budget: {project['price']} | Duration: {project['duration']}
Description: {project['desc']}
Standards: {project['standards']}

Return ONLY raw JSON with keys: projectTitle, executiveObjective, coreMethodologies(array), primaryLocation, mainStakeholders(array), keyMilestones(array of {{name,duration}}), priceSummary, industryContext, complianceFramework(array)"""

    text, _prov = await call_llm(llm, prompt, "Generate strict JSON. No markdown.", 0.3, on_log=on_log)
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
            "complianceFramework": [],
        }


async def generate_document(llm, project, blueprint, doc, watermark, on_log=None, *, job=None) -> dict:
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

    if job:
        job["currentContent"] = ""
        job["currentDocName"] = doc["name"]

    def on_token(chunk: str):
        if job:
            job["currentContent"] += chunk

    safe = doc["name"].replace(" ", "_").replace("/", "_")
    cat = doc.get("cat", "general").upper()

    try:
        content, used_provider = await call_llm(
            llm, prompt,
            "Expert consultant. Generate comprehensive markdown documents. No preamble, just the document.",
            0.7, on_token=on_token, on_log=on_log,
        )

        if on_log:
            on_log(f"Converting {doc['name']} to PDF + DOCX...", "info")

        html = build_html(content, project, doc, blueprint, used_provider, watermark, pdf=False)
        pdf_bytes = await asyncio.to_thread(
            render_pdf, content, project, doc, blueprint, used_provider, watermark
        )
        docx_bytes = await asyncio.to_thread(
            render_docx, content, project, doc, blueprint, used_provider, watermark
        )

        if on_log:
            on_log(f"{doc['name']} complete — {len(content.split())} words via {used_provider}", "success")

        return {
            "pdfFileName": f"{cat}/{safe}.pdf",
            "docxFileName": f"{cat}/{safe}.docx",
            "docName": doc["name"], "category": doc["cat"],
            "markdown": content, "html": html,
            "pdfBytes": pdf_bytes,
            "docxBytes": docx_bytes,
            "wordCount": len(content.split()),
            "error": False, "usedProvider": used_provider,
        }
    except Exception as e:
        if on_log:
            on_log(f"{doc['name']} FAILED: {e}", "error")
        if job:
            job["currentContent"] = ""
            job["currentDocName"] = ""
        return {
            "pdfFileName": f"{cat}/{safe}.pdf",
            "docxFileName": f"{cat}/{safe}.docx",
            "docName": doc["name"], "category": doc["cat"],
            "markdown": f"# {doc['name']}\n\nFailed: {e}",
            "html": f"<h1>{doc['name']}</h1><p>Failed: {e}</p>",
            "pdfBytes": b"",
            "docxBytes": b"",
            "wordCount": 0, "error": True, "errorMessage": str(e),
        }


async def run_job(job_id: str) -> None:
    job = jobs[job_id]
    req = _inputs[job_id]
    project, docs = req["project"], req["docs"]
    llm, watermark = req["llm"], req["watermark"]
    job["total"] = len(docs)

    def on_log(msg: str, typ: str = "info"):
        add_log(job, msg, typ)

    try:
        add_log(job, f"Starting generation — {len(docs)} documents")
        add_log(job, f"Project: {project['name']} | {project['sector']} | {project['geo']}")

        job["status"] = "generating_blueprint"
        job["progressMessage"] = "Generating project blueprint..."
        add_log(job, "Generating project blueprint...")
        blueprint = await generate_blueprint(llm, project, on_log)
        job["blueprint"] = blueprint
        add_log(job, f"Blueprint ready: {blueprint.get('projectTitle', project['name'])}", "success")

        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("BLUEPRINT.json", json.dumps(blueprint, indent=2))

            for i, doc in enumerate(docs):
                job["current"] = i + 1
                job["progressMessage"] = f"[{i+1}/{len(docs)}] Generating: {doc['name']}"
                job["status"] = "generating"

                result = await generate_document(llm, project, blueprint, doc, watermark, on_log, job=job)

                if result["pdfBytes"]:
                    zf.writestr(result["pdfFileName"], result["pdfBytes"])
                if result["docxBytes"]:
                    zf.writestr(result["docxFileName"], result["docxBytes"])

                job["results"].append({
                    "docName": result["docName"],
                    "pdfFileName": result["pdfFileName"],
                    "docxFileName": result["docxFileName"],
                    "wordCount": result["wordCount"],
                    "error": result["error"],
                    "usedProvider": result.get("usedProvider", ""),
                    "errorMessage": result.get("errorMessage", ""),
                    "markdown": result["markdown"],
                    "html": result["html"],
                    "category": result["category"],
                })

                job["currentContent"] = ""
                job["currentDocName"] = ""

                if i < len(docs) - 1:
                    await asyncio.sleep(1)

        job["zipBytes"] = zip_buffer.getvalue()
        job["status"] = "done"
        job["progressMessage"] = f"Complete! {len(docs)} documents generated."
        add_log(job, f"Done — {len(docs)} documents generated", "success")

    except Exception as e:
        job["status"] = "error"
        job["progressMessage"] = f"Fatal error: {e}"
        job["error"] = str(e)
        add_log(job, f"Fatal error: {e}", "error")
