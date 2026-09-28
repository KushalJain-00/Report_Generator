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
    assert client.get("/api/status/nope").status_code == 404
