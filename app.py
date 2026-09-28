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
import markdown
from docx import Document
from docx.shared import Pt, Inches, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_ORIENT
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from weasyprint import HTML as WeasyHTML

app = FastAPI(title="RIG")

# ── In-memory job store ────────────────────────────────────────
jobs: dict = {}


def add_log(job: dict, msg: str, log_type: str = "info"):
    """Append a timestamped log entry to the job."""
    ts = time.strftime("%H:%M:%S")
    job.setdefault("logs", []).append({"time": ts, "type": log_type, "message": msg})


# ── LLM providers ──────────────────────────────────────────────
async def call_ollama(url: str, model: str, prompt: str, system: str, temp: float) -> str:
    async with httpx.AsyncClient(timeout=300) as c:
        try:
            r = await c.post(f"{url}/api/chat", json={
                "model": model,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                "stream": False,
                "options": {"temperature": temp}
            })
            r.raise_for_status()
            return r.json().get("message", {}).get("content", "")
        except httpx.ConnectError:
            raise Exception("Ollama not running — install from ollama.com and start it")


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


# ── Streaming LLM functions ────────────────────────────────────
async def stream_openrouter(key: str, model: str, prompt: str, system: str, temp: float, job: dict):
    """Stream tokens from OpenRouter, updating job['currentContent'] live."""
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post("https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ], "temperature": temp, "stream": True},
            timeout=httpx.Timeout(300.0, connect=10.0)
        )
        if r.status_code == 429:
            raise RateLimited("OpenRouter 429")
        r.raise_for_status()

        content = ""
        async for line in r.aiter_lines():
            if not line.startswith("data: "):
                continue
            data = line[6:]
            if data.strip() == "[DONE]":
                break
            try:
                chunk = json.loads(data)
                delta = chunk.get("choices", [{}])[0].get("delta", {})
                token = delta.get("content", "")
                if token:
                    content += token
                    job["currentContent"] = content
            except (json.JSONDecodeError, IndexError, KeyError):
                continue
    return content


async def stream_groq(key: str, model: str, prompt: str, system: str, temp: float, job: dict):
    """Stream tokens from Groq, updating job['currentContent'] live."""
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ], "temperature": temp, "stream": True},
            timeout=httpx.Timeout(300.0, connect=10.0)
        )
        if r.status_code == 429:
            raise RateLimited("Groq 429")
        r.raise_for_status()

        content = ""
        async for line in r.aiter_lines():
            if not line.startswith("data: "):
                continue
            data = line[6:]
            if data.strip() == "[DONE]":
                break
            try:
                chunk = json.loads(data)
                delta = chunk.get("choices", [{}])[0].get("delta", {})
                token = delta.get("content", "")
                if token:
                    content += token
                    job["currentContent"] = content
            except (json.JSONDecodeError, IndexError, KeyError):
                continue
    return content


# ── Retry + fallback ───────────────────────────────────────────

async def call_llm_with_fallback(llm_config: dict, prompt: str, system: str, temp=0.7, job: dict = None) -> tuple[str, str]:
    """Returns (content, provider_used). Tries primary provider, falls back to others on failure."""
    errors = []
    fallback_order = llm_config.get("fallbackOrder", ["groq", "gemini", "ollama", "openrouter"])
    enabled = llm_config.get("enabled", {})
    skip_providers = set()

    for prov in fallback_order:
        if enabled.get(prov) is False or prov in skip_providers:
            continue
        cfg = llm_config.get(prov, {})
        if prov == "ollama":
            if not cfg.get("url"):
                continue
            keys = [None]
        else:
            keys = cfg.get("keys", [])
            if not keys:
                continue

        if job:
            add_log(job, f"Trying {prov}...")

        all_rate_limited = True
        for key_idx, key in enumerate(keys):
            for attempt in range(1, 3):
                try:
                    # Use streaming if job is provided and provider supports it
                    if job and prov in ("openrouter", "groq"):
                        if prov == "openrouter":
                            result = await stream_openrouter(key, cfg.get("model", "nvidia/nemotron-3-ultra-550b-a55b:free"), prompt, system, temp, job)
                        else:
                            result = await stream_groq(key, cfg.get("model", "qwen/qwen3.8-27b"), prompt, system, temp, job)
                        return result, prov
                    elif prov == "ollama":
                        result = await call_ollama(cfg["url"], cfg.get("model", "llama3"), prompt, system, temp)
                    elif prov == "groq":
                        result = await call_groq(key, cfg.get("model", "qwen/qwen3.8-27b"), prompt, system, temp)
                    elif prov == "gemini":
                        result = await call_gemini(key, cfg.get("model", "gemini-2.5-flash"), prompt, system, temp)
                    return result, prov
                except RateLimited:
                    wait = 15 * attempt
                    if job:
                        add_log(job, f"{prov} key#{key_idx+1}: rate limited, waiting {wait}s", "error")
                    errors.append(f"{prov} key#{key_idx+1}: rate limited, waited {wait}s")
                    await asyncio.sleep(wait)
                except Exception as e:
                    err_msg = str(e)
                    if prov == "ollama" and ("404" in err_msg or "Not Found" in err_msg or "not running" in err_msg.lower()):
                        skip_providers.add("ollama")
                        if job:
                            add_log(job, "Ollama not running, skipping", "error")
                        errors.append("ollama: not running, skipping")
                        break
                    if job:
                        add_log(job, f"{prov} key#{key_idx+1} attempt#{attempt}: {e}", "error")
                    errors.append(f"{prov} key#{key_idx+1} attempt#{attempt}: {e}")
                    all_rate_limited = False
                    if attempt < 2:
                        await asyncio.sleep(3)

        if all_rate_limited:
            if job:
                add_log(job, f"{prov}: all keys exhausted, moving to next provider", "error")
            errors.append(f"{prov}: all keys exhausted, moving to next provider")

    raise Exception(f"All providers failed: {'; '.join(errors)}")


# ── Blueprint generation ───────────────────────────────────────
async def generate_blueprint(llm_config: dict, project: dict, job: dict = None) -> dict:
    prompt = f"""Project Blueprint for: "{project['name']}"
Sector: {project['sector']} | Location: {project['geo']} | Client: {project['client']}
Audience: {project['audience']} | Budget: {project['price']} | Duration: {project['duration']}
Description: {project['desc']}
Standards: {project['standards']}

Return ONLY raw JSON with keys: projectTitle, executiveObjective, coreMethodologies(array), primaryLocation, mainStakeholders(array), keyMilestones(array of {{name,duration}}), priceSummary, industryContext, complianceFramework(array)"""

    text, prov = await call_llm_with_fallback(llm_config, prompt, "Generate strict JSON. No markdown.", 0.3, job)
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


# ── PDF generation ─────────────────────────────────────────────
def markdown_to_html(content: str, project: dict, doc: dict, blueprint: dict, provider: str, watermark: dict = None) -> str:
    """Convert markdown to styled HTML with optional watermark."""
    md = markdown.Markdown(tables=True, fenced_code=True)
    body_html = md.convert(content)

    wm_text = watermark.get("text", "") if watermark else ""
    wm_style = ""
    if wm_text:
        opacity = watermark.get("opacity", 0.15)
        font_size = watermark.get("fontSize", 48)
        wm_style = f"""
        body::after {{
            content: "{wm_text}";
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: {font_size}px;
            color: rgba(128,128,128,{opacity});
            pointer-events: none;
            z-index: 999;
            white-space: nowrap;
            font-weight: bold;
        }}"""

    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
@page {{
    size: A4;
    margin: 2.5cm 2cm;
    @top-center {{ content: "{blueprint.get('projectTitle', project['name'])}"; font-size: 9px; color: #888; }}
    @bottom-center {{ content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #888; }}
}}
body{{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#1a1a2e;line-height:1.7;font-size:13px;max-width:100%}}
h1{{font-size:22px;border-bottom:3px solid #6366f1;padding-bottom:8px;margin-top:0;color:#1a1a2e}}
h2{{font-size:17px;color:#2d2d44;margin-top:28px;border-left:4px solid #6366f1;padding-left:10px}}
h3{{font-size:14px;color:#3a3a52;margin-top:20px}}
table{{width:100%;border-collapse:collapse;margin:14px 0;font-size:12px}}
th{{background:#f0f0f5;padding:8px 10px;text-align:left;border:1px solid #d0d0e0;font-weight:600}}
td{{padding:6px 10px;border:1px solid #d0d0e0}}
tr:nth-child(even){{background:#f8f8fc}}
ul,ol{{padding-left:20px}}li{{margin-bottom:5px}}
blockquote{{border-left:3px solid #6366f1;margin:14px 0;padding:8px 14px;background:#f0f0ff;border-radius:0 6px 6px 0}}
code{{font-family:'SF Mono',monospace;font-size:11px;background:#f0f0f5;padding:1px 4px;border-radius:3px}}
pre{{background:#f0f0f5;border:1px solid #d0d0e0;border-radius:6px;padding:10px;overflow-x:auto}}
pre code{{background:none;padding:0}}
.header{{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e0e0f0}}
.meta{{font-size:11px;color:#7a7a9e;margin-top:6px}}
.cover{{text-align:center;padding:60px 0 40px}}
.cover h1{{font-size:28px;border:none;margin-bottom:10px}}
.cover .subtitle{{font-size:14px;color:#666;margin-bottom:30px}}
.cover .info{{font-size:12px;color:#888;line-height:2}}
{wm_style}
</style></head><body>
<div class="cover">
    <h1>{blueprint.get('projectTitle', project['name'])}</h1>
    <div class="subtitle">{doc['name']}</div>
    <div class="info">
        {project['sector']} | {project['geo']} | {project['client']}<br>
        Generated via {provider} | {time.strftime('%B %d, %Y')}
    </div>
</div>
<div style="page-break-before:always"></div>
{body_html}
</body></html>"""


def generate_pdf(content: str, project: dict, doc: dict, blueprint: dict, provider: str, watermark: dict = None) -> bytes:
    """Generate PDF from markdown content."""
    html = markdown_to_html(content, project, doc, blueprint, provider, watermark)
    pdf_bytes = WeasyHTML(string=html).write_pdf()
    return pdf_bytes


# ── DOCX generation ────────────────────────────────────────────
def generate_docx(content: str, project: dict, doc: dict, blueprint: dict, provider: str, watermark: dict = None) -> bytes:
    """Generate Word document from markdown content."""
    d = Document()

    section = d.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)

    wm_text = watermark.get("text", "") if watermark else ""
    if wm_text:
        for para in d.sections[0].header.paragraphs:
            run = para.add_run(wm_text)
            run.font.size = Pt(watermark.get("fontSize", 36))
            run.font.color.rgb = RGBColor(180, 180, 180)
            run.font.bold = True
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        section.header_distance = Cm(1)

    d.add_paragraph()
    d.add_paragraph()
    title = d.add_heading(blueprint.get('projectTitle', project['name']), level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    subtitle = d.add_paragraph(doc['name'])
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.runs[0].font.size = Pt(16)
    subtitle.runs[0].font.color.rgb = RGBColor(100, 100, 100)

    d.add_paragraph()

    info = d.add_paragraph(f"{project['sector']} | {project['geo']} | {project['client']}")
    info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    info.runs[0].font.size = Pt(11)
    info.runs[0].font.color.rgb = RGBColor(120, 120, 120)

    gen_info = d.add_paragraph(f"Generated via {provider} | {time.strftime('%B %d, %Y')}")
    gen_info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    gen_info.runs[0].font.size = Pt(10)
    gen_info.runs[0].font.color.rgb = RGBColor(150, 150, 150)

    d.add_page_break()

    lines = content.split('\n')
    in_table = False
    table_rows = []

    for line in lines:
        stripped = line.strip()

        if stripped.startswith('### '):
            d.add_heading(stripped[4:], level=3)
        elif stripped.startswith('## '):
            d.add_heading(stripped[3:], level=2)
        elif stripped.startswith('# '):
            d.add_heading(stripped[2:], level=1)
        elif stripped.startswith('|') and stripped.endswith('|'):
            cells = [c.strip() for c in stripped.split('|')[1:-1]]
            if all(set(c) <= set('- :') for c in cells):
                continue
            table_rows.append(cells)
            in_table = True
        else:
            if in_table and table_rows:
                _add_table_to_docx(d, table_rows)
                table_rows = []
                in_table = False

            if stripped.startswith('- ') or stripped.startswith('* '):
                d.add_paragraph(stripped[2:], style='List Bullet')
            elif stripped.startswith('1. ') or stripped.startswith('2. '):
                d.add_paragraph(stripped[3:], style='List Number')
            elif stripped.startswith('> '):
                p = d.add_paragraph(stripped[2:])
                p.paragraph_format.left_indent = Cm(1)
                if p.runs:
                    p.runs[0].font.italic = True
                    p.runs[0].font.color.rgb = RGBColor(100, 100, 100)
            elif stripped in ('---', '***', '___'):
                p = d.add_paragraph('─' * 60)
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                if p.runs:
                    p.runs[0].font.color.rgb = RGBColor(200, 200, 200)
            elif not stripped:
                pass
            else:
                d.add_paragraph(stripped)

    if table_rows:
        _add_table_to_docx(d, table_rows)

    buf = BytesIO()
    d.save(buf)
    return buf.getvalue()


def _add_table_to_docx(d: Document, rows: list):
    if not rows:
        return
    num_cols = max(len(r) for r in rows)
    table = d.add_table(rows=len(rows), cols=num_cols)
    table.style = 'Table Grid'

    for i, row_data in enumerate(rows):
        for j, cell_text in enumerate(row_data):
            if j < num_cols:
                cell = table.cell(i, j)
                cell.text = cell_text
                if i == 0:
                    for p in cell.paragraphs:
                        for run in p.runs:
                            run.font.bold = True
                            run.font.size = Pt(11)


# ── HTML generation (for web preview) ──────────────────────────
def generate_preview_html(content: str, project: dict, doc: dict, blueprint: dict, provider: str) -> str:
    md = markdown.Markdown(tables=True, fenced_code=True)
    body_html = md.convert(content)

    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 30px;color:#1a1a2e;line-height:1.7}}
h1{{font-size:26px;border-bottom:3px solid #6366f1;padding-bottom:10px}}
h2{{font-size:20px;color:#2d2d44;margin-top:32px;border-left:4px solid #6366f1;padding-left:12px}}
h3{{font-size:16px;color:#3a3a52;margin-top:24px}}
table{{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}}
th{{background:#f0f0f5;padding:10px 12px;text-align:left;border:1px solid #d0d0e0;font-weight:600}}
td{{padding:8px 12px;border:1px solid #d0d0e0}}
tr:nth-child(even){{background:#f8f8fc}}
ul,ol{{padding-left:22px}}li{{margin-bottom:6px}}
blockquote{{border-left:3px solid #6366f1;margin:16px 0;padding:10px 16px;background:#f0f0ff}}
.header{{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #e0e0f0}}
.meta{{font-size:12px;color:#7a7a9e;margin-top:8px}}
</style></head><body>
<div class="header"><h1>{blueprint.get('projectTitle', project['name'])}</h1>
<p class="meta">{doc['name']} | {project['sector']} | {project['geo']} | via {provider}</p></div>
{body_html}</body></html>"""


# ── Single document generation ─────────────────────────────────
async def generate_document(llm_config: dict, project: dict, blueprint: dict, doc: dict, watermark: dict = None, job: dict = None) -> dict:
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

    try:
        content, used_provider = await call_llm_with_fallback(
            llm_config, prompt,
            "Expert consultant. Generate comprehensive markdown documents. No preamble, just the document.",
            0.7, job
        )
        safe = doc["name"].replace(" ", "_").replace("/", "_")
        cat = doc.get("cat", "general").upper()

        if job:
            add_log(job, f"Converting {doc['name']} to PDF + DOCX...", "info")

        html = generate_preview_html(content, project, doc, blueprint, used_provider)
        pdf_bytes = generate_pdf(content, project, doc, blueprint, used_provider, watermark)
        docx_bytes = generate_docx(content, project, doc, blueprint, used_provider, watermark)

        if job:
            add_log(job, f"{doc['name']} complete — {len(content.split())} words via {used_provider}", "success")

        return {
            "pdfFileName": f"{cat}/{safe}.pdf",
            "docxFileName": f"{cat}/{safe}.docx",
            "docName": doc["name"], "category": doc["cat"],
            "markdown": content, "html": html,
            "pdfBytes": pdf_bytes,
            "docxBytes": docx_bytes,
            "wordCount": len(content.split()),
            "error": False, "usedProvider": used_provider
        }
    except Exception as e:
        if job:
            add_log(job, f"{doc['name']} FAILED: {e}", "error")
            job["currentContent"] = ""
            job["currentDocName"] = ""
        safe = doc["name"].replace(" ", "_").replace("/", "_")
        cat = doc.get("cat", "general").upper()
        return {
            "pdfFileName": f"{cat}/{safe}.pdf",
            "docxFileName": f"{cat}/{safe}.docx",
            "docName": doc["name"], "category": doc["cat"],
            "markdown": f"# {doc['name']}\n\nFailed: {e}",
            "html": f"<h1>{doc['name']}</h1><p>Failed: {e}</p>",
            "pdfBytes": b"",
            "docxBytes": b"",
            "wordCount": 0, "error": True, "errorMessage": str(e)
        }


# ── Job runner ─────────────────────────────────────────────────
async def run_job(job_id: str, data: dict):
    job = jobs[job_id]
    llm_config = data.get("llm", {})
    project = data["project"]
    docs = data["docs"]
    watermark = data.get("watermark", {})
    job["total"] = len(docs)

    try:
        add_log(job, f"Starting generation — {len(docs)} documents")
        add_log(job, f"Project: {project['name']} | {project['sector']} | {project['geo']}")

        job["status"] = "generating_blueprint"
        job["progressMessage"] = "Generating project blueprint..."
        add_log(job, "Generating project blueprint...")
        blueprint = await generate_blueprint(llm_config, project, job)
        job["blueprint"] = blueprint
        add_log(job, f"Blueprint ready: {blueprint.get('projectTitle', project['name'])}", "success")

        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("BLUEPRINT.json", json.dumps(blueprint, indent=2))

            for i, doc in enumerate(docs):
                job["current"] = i + 1
                job["progressMessage"] = f"[{i+1}/{len(docs)}] Generating: {doc['name']}"
                job["status"] = "generating"

                result = await generate_document(llm_config, project, blueprint, doc, watermark, job)

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
                    "category": result["category"]
                })

                # Clear live content after doc is done
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
    fallbackOrder: list = ["groq", "gemini", "ollama", "openrouter"]
    enabled: dict = {}
    metadata: dict = {}
    documents: list = []
    watermark: dict = {}


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
        "fallbackOrder": req.fallbackOrder,
        "enabled": req.enabled,
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
        "logs": [],
        "currentContent": "",
        "currentDocName": "",
    }

    bg.add_task(run_job, job_id, {"project": project, "docs": req.documents, "llm": llm, "watermark": req.watermark})
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
        "logs": job.get("logs", []),
        "currentContent": job.get("currentContent", ""),
        "currentDocName": job.get("currentDocName", ""),
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
