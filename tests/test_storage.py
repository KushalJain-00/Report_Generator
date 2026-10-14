import json
from fastapi.testclient import TestClient
from rig import storage
from rig.routes import app

client = TestClient(app)


def test_storage_defaults(tmp_path, monkeypatch):
    test_file = tmp_path / "config.json"
    monkeypatch.setattr(storage, "LOCAL_CONFIG_FILE", test_file)

    s = storage.load_settings()
    assert "keys" in s
    assert "models" in s
    assert "groq" in s["keys"]
    assert "gemini" in s["keys"]
    assert "openrouter" in s["keys"]


def test_storage_save_and_load(tmp_path, monkeypatch):
    test_file = tmp_path / "config.json"
    monkeypatch.setattr(storage, "LOCAL_CONFIG_FILE", test_file)
    monkeypatch.setattr(storage, "get_user_config_dir", lambda: tmp_path / "user_rig")

    payload = {
        "keys": {"groq": ["gsk_test123"], "gemini": ["AIza_test456"], "openrouter": []},
        "models": {"groq": "llama-3.3-70b-versatile"},
        "watermark": {"text": "Confidential Corp", "opacity": 0.2, "fontSize": 52},
    }

    saved = storage.save_settings(payload)
    assert saved["keys"]["groq"] == ["gsk_test123"]
    assert test_file.exists()

    loaded = storage.load_settings()
    assert loaded["keys"]["groq"] == ["gsk_test123"]
    assert loaded["keys"]["gemini"] == ["AIza_test456"]
    assert loaded["watermark"]["text"] == "Confidential Corp"


def test_api_settings_endpoints(tmp_path, monkeypatch):
    test_file = tmp_path / "config.json"
    monkeypatch.setattr(storage, "LOCAL_CONFIG_FILE", test_file)
    monkeypatch.setattr(storage, "get_user_config_dir", lambda: tmp_path / "user_rig")

    # GET default
    r = client.get("/api/settings")
    assert r.status_code == 200
    assert "keys" in r.json()

    # POST new settings
    new_settings = {
        "keys": {"groq": ["gsk_saved_via_api"]},
        "watermark": {"text": "API Test", "opacity": 0.1, "fontSize": 40},
    }
    r_post = client.post("/api/settings", json=new_settings)
    assert r_post.status_code == 200
    assert r_post.json()["ok"] is True
    assert r_post.json()["settings"]["keys"]["groq"] == ["gsk_saved_via_api"]

    # GET verified
    r_get = client.get("/api/settings")
    assert r_get.status_code == 200
    assert r_get.json()["keys"]["groq"] == ["gsk_saved_via_api"]
