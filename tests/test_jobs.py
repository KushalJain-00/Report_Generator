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


def test_preview_not_garbled_when_attempt_retries(monkeypatch):
    jid = jobs.create_job(PROJECT, DOCS[:1], LLM, {})
    job = jobs.jobs[jid]
    snapshots = []

    async def fake(cfg, prompt, system, temp, on_token=None, on_log=None):
        if "Project Blueprint" in prompt:
            return '{"projectTitle": "P", "executiveObjective": "o", "coreMethodologies": [], "primaryLocation": "G", "mainStakeholders": [], "keyMilestones": [], "priceSummary": "1", "industryContext": "", "complianceFramework": []}', "groq"
        try:
            if on_token:
                on_token("# attempt 1 partial")
            raise RuntimeError("transient")
        except RuntimeError:
            pass  # providers.call_llm retry loop — attempt 2 starts fresh
        if on_token:
            on_token("# attempt 2 final")
        snapshots.append(job["currentContent"])
        return "# attempt 2 final", "groq"

    monkeypatch.setattr(jobs, "call_llm", fake)
    asyncio.run(jobs.run_job(jid))
    assert snapshots == ["# attempt 2 final"]
    assert job["currentContent"] == ""
