"""LLM providers — key rotation + cross-provider fallback (ported from legacy app.py)."""

import asyncio
import json

import httpx

DEFAULT_MODELS = {
    "groq": "qwen/qwen3.8-27b",
    "openrouter": "nvidia/nemotron-3-ultra-550b-a55b:free",
    "gemini": "gemini-2.5-flash",
    "ollama": "llama3",
}

client = httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0))

# ponytail: ollama url is per-call config but CALLERS entries take a fixed
# signature (tests monkeypatch them) — call_llm stashes the url here first.
_ollama_url = ""


class RateLimited(Exception):
    pass


async def _openai_compat(client, base_url, key, model, prompt, system, temp, on_token):
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": temp,
    }
    if on_token:
        payload["stream"] = True
        async with client.stream("POST", f"{base_url}/chat/completions",
                                 headers=headers, json=payload) as r:
            if r.status_code == 429:
                raise RateLimited(f"{base_url} 429")
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
                except (json.JSONDecodeError, IndexError, KeyError):
                    continue
                if token:
                    content += token
                    on_token(token)
            return content
    r = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
    if r.status_code == 429:
        raise RateLimited(f"{base_url} 429")
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


async def _groq(client, key, model, prompt, system, temp, on_token):
    return await _openai_compat(client, "https://api.groq.com/openai/v1",
                                key, model, prompt, system, temp, on_token)


async def _openrouter(client, key, model, prompt, system, temp, on_token):
    return await _openai_compat(client, "https://openrouter.ai/api/v1",
                                key, model, prompt, system, temp, on_token)


async def _gemini(client, key, model, prompt, system, temp, on_token):
    r = await client.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
        headers={"Content-Type": "application/json"},
        json={"contents": [{"parts": [{"text": f"{system}\n\n{prompt}"}]}],
              "generationConfig": {"temperature": temp}},
    )
    if r.status_code == 429:
        raise RateLimited("Gemini 429")
    r.raise_for_status()
    return r.json()["candidates"][0]["content"]["parts"][0]["text"]


async def _ollama(client, key, model, prompt, system, temp, on_token):
    try:
        r = await client.post(
            f"{_ollama_url}/api/chat",
            json={
                "model": model,
                "messages": [{"role": "system", "content": system},
                             {"role": "user", "content": prompt}],
                "stream": False,
                "options": {"temperature": temp},
            },
        )
        r.raise_for_status()
        return r.json().get("message", {}).get("content", "")
    except httpx.ConnectError:
        raise Exception("Ollama not running — install from ollama.com and start it")


CALLERS = {
    "groq": _groq,
    "openrouter": _openrouter,
    "gemini": _gemini,
    "ollama": _ollama,
}


async def call_llm(cfg: dict, prompt: str, system: str, temp: float,
                   on_token=None, on_log=None) -> tuple[str, str]:
    """Returns (content, provider_used). Rotates keys, falls back across providers."""

    def log(msg: str, typ: str = "info"):
        if on_log:
            on_log(msg, typ)

    global _ollama_url
    errors: list[str] = []
    skip_providers: set[str] = set()
    fallback_order = cfg.get("fallbackOrder", ["groq", "gemini", "ollama", "openrouter"])
    enabled = cfg.get("enabled", {})

    for prov in fallback_order:
        if enabled.get(prov) is False or prov in skip_providers:
            continue
        pcfg = cfg.get(prov, {})
        if prov == "ollama":
            if not pcfg.get("url"):
                continue
            _ollama_url = pcfg["url"]
            keys = [None]
        else:
            keys = pcfg.get("keys", [])
            if not keys:
                continue
        model = pcfg.get("model") or DEFAULT_MODELS[prov]
        caller = CALLERS[prov]

        log(f"Trying {prov}...")

        all_rate_limited = True
        for key_idx, key in enumerate(keys):
            if prov in skip_providers:
                break
            for attempt in (1, 2):
                try:
                    result = await caller(client, key, model, prompt, system, temp, on_token)
                    return result, prov
                except RateLimited:
                    wait = 15 * attempt
                    log(f"{prov} key#{key_idx + 1}: rate limited, waiting {wait}s", "error")
                    errors.append(f"{prov} key#{key_idx + 1}: rate limited, waited {wait}s")
                    await asyncio.sleep(wait)
                    break  # rate-limited key is spent — rotate to the next key
                except Exception as e:
                    err_msg = str(e)
                    if prov == "ollama" and ("404" in err_msg or "Not Found" in err_msg
                                             or "not running" in err_msg.lower()):
                        skip_providers.add(prov)
                        log("Ollama not running, skipping", "error")
                        errors.append("ollama: not running, skipping")
                        all_rate_limited = False
                        break
                    log(f"{prov} key#{key_idx + 1} attempt#{attempt}: {e}", "error")
                    errors.append(f"{prov} key#{key_idx + 1} attempt#{attempt}: {e}")
                    all_rate_limited = False
                    if attempt < 2:
                        await asyncio.sleep(3)

        if all_rate_limited:
            log(f"{prov}: all keys exhausted, moving to next provider", "error")
            errors.append(f"{prov}: all keys exhausted, moving to next provider")

    raise Exception("All providers failed: " + "; ".join(errors))
