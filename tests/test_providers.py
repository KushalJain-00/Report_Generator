import pytest
from rig import providers


@pytest.fixture(autouse=True)
def fast_sleep(monkeypatch):
    async def _fake_sleep(_seconds):
        return None
    monkeypatch.setattr(providers.asyncio, "sleep", _fake_sleep)


def make_cfg(**over):
    cfg = {
        "groq": {"keys": ["k1", "k2"], "model": "m"},
        "gemini": {"keys": [], "model": "m"},
        "openrouter": {"keys": [], "model": "m"},
        "ollama": {"url": "", "model": "m"},
        "fallbackOrder": ["groq", "gemini", "ollama", "openrouter"],
        "enabled": {},
    }
    cfg.update(over)
    return cfg


def test_primary_success(monkeypatch):
    async def fake(client, key, model, prompt, system, temp, on_token):
        if on_token:
            on_token("hello ")
            on_token("world")
        return "hello world"
    monkeypatch.setitem(providers.CALLERS, "groq", fake)
    import asyncio
    content, prov = asyncio.run(providers.call_llm(make_cfg(), "p", "s", 0.7))
    assert (content, prov) == ("hello world", "groq")


def test_429_rotates_keys_then_provider(monkeypatch):
    calls = []
    async def fake(client, key, model, prompt, system, temp, on_token):
        calls.append(key)
        if key == "k1":
            raise providers.RateLimited("429")
        if key == "k2":
            raise providers.RateLimited("429")
        return "from-ollama"
    monkeypatch.setitem(providers.CALLERS, "groq", fake)
    monkeypatch.setitem(providers.CALLERS, "ollama", fake)
    cfg = make_cfg(ollama={"url": "http://x", "model": "m"})
    import asyncio
    content, prov = asyncio.run(providers.call_llm(cfg, "p", "s", 0.7))
    assert content == "from-ollama"
    assert calls == ["k1", "k2", None]  # both keys tried, then ollama


def test_disabled_provider_skipped(monkeypatch):
    async def boom(*a, **k):
        raise AssertionError("should not be called")
    monkeypatch.setitem(providers.CALLERS, "groq", boom)
    async def ok(client, key, model, prompt, system, temp, on_token):
        return "ok"
    monkeypatch.setitem(providers.CALLERS, "ollama", ok)
    cfg = make_cfg(enabled={"groq": False}, ollama={"url": "http://x", "model": "m"})
    import asyncio
    content, prov = asyncio.run(providers.call_llm(cfg, "p", "s", 0.7))
    assert prov == "ollama"


def test_all_fail_raises(monkeypatch):
    async def boom(*a, **k):
        raise RuntimeError("nope")
    for p in ("groq", "gemini", "ollama", "openrouter"):
        monkeypatch.setitem(providers.CALLERS, p, boom)
    import asyncio
    with pytest.raises(Exception) as e:
        asyncio.run(providers.call_llm(make_cfg(), "p", "s", 0.7))
    assert "All providers failed" in str(e.value)
