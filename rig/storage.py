"""Local storage and configuration management for RIG.

Stores settings, API keys, models, and fallback preferences locally on disk
in `config.json` (with backup sync to %APPDATA%/RIG/config.json on Windows
or ~/.config/rig/config.json on Unix), ensuring user keys are safely kept on
the local machine and never committed to version control.
"""

import json
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_CONFIG_FILE = BASE_DIR / "config.json"


def get_user_config_dir() -> Path:
    """Return the platform-specific user configuration directory."""
    if sys.platform == "win32":
        appdata = os.environ.get("APPDATA")
        if appdata:
            return Path(appdata) / "RIG"
        return Path.home() / "AppData" / "Roaming" / "RIG"
    else:
        xdg_config = os.environ.get("XDG_CONFIG_HOME")
        if xdg_config:
            return Path(xdg_config) / "rig"
        return Path.home() / ".config" / "rig"


def get_default_settings() -> dict:
    """Return factory default settings, with environment variable fallbacks."""
    groq_env = os.environ.get("GROQ_API_KEY", "")
    gemini_env = os.environ.get("GEMINI_API_KEY", "")
    openrouter_env = os.environ.get("OPENROUTER_API_KEY", "")
    ollama_url_env = os.environ.get("OLLAMA_URL", "http://localhost:11434")

    def _split_keys(val: str) -> list[str]:
        if not val:
            return []
        return [k.strip() for k in val.replace(",", "\n").split("\n") if k.strip()]

    return {
        "fallbackOrder": ["groq", "gemini", "ollama", "openrouter"],
        "enabled": {
            "groq": bool(groq_env),
            "gemini": bool(gemini_env),
            "openrouter": bool(openrouter_env) or (not groq_env and not gemini_env),
            "ollama": False,
        },
        "keys": {
            "groq": _split_keys(groq_env),
            "gemini": _split_keys(gemini_env),
            "openrouter": _split_keys(openrouter_env),
        },
        "models": {
            "groq": "qwen/qwen3.8-27b",
            "gemini": "gemini-2.5-flash",
            "openrouter": "nvidia/nemotron-3-ultra-550b-a55b:free",
            "ollama": "llama3",
        },
        "ollamaUrl": ollama_url_env,
        "watermark": {
            "text": "",
            "opacity": 0.15,
            "fontSize": 48,
        },
    }


def load_settings() -> dict:
    """Load settings from local config.json or user config directory."""
    defaults = get_default_settings()

    config_path = LOCAL_CONFIG_FILE
    if not config_path.exists():
        user_cfg = get_user_config_dir() / "config.json"
        if user_cfg.exists():
            config_path = user_cfg

    if not config_path.exists():
        return defaults

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Merge with defaults to guarantee all keys exist
        merged = defaults.copy()
        for k, v in data.items():
            if isinstance(v, dict) and isinstance(merged.get(k), dict):
                merged[k] = {**merged[k], **v}
            else:
                merged[k] = v

        # If keys are empty in config but present in env, merge env keys
        for prov in ("groq", "gemini", "openrouter"):
            if not merged["keys"].get(prov) and defaults["keys"].get(prov):
                merged["keys"][prov] = defaults["keys"][prov]

        return merged
    except Exception:
        return defaults


def save_settings(data: dict) -> dict:
    """Save settings and keys locally to disk with secure permissions."""
    current = load_settings()
    for k, v in data.items():
        if isinstance(v, dict) and isinstance(current.get(k), dict):
            current[k] = {**current[k], **v}
        else:
            current[k] = v

    # Write to project-local config.json
    try:
        with open(LOCAL_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
        # Attempt to restrict permissions on POSIX systems (chmod 600)
        if sys.platform != "win32":
            try:
                os.chmod(LOCAL_CONFIG_FILE, 0o600)
            except OSError:
                pass
    except Exception as e:
        print(f"Warning: could not write local config {LOCAL_CONFIG_FILE}: {e}")

    # Also sync to user configuration directory (e.g. %APPDATA%/RIG/config.json)
    try:
        user_dir = get_user_config_dir()
        user_dir.mkdir(parents=True, exist_ok=True)
        user_cfg = user_dir / "config.json"
        with open(user_cfg, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
        if sys.platform != "win32":
            try:
                os.chmod(user_cfg, 0o600)
            except OSError:
                pass
    except Exception:
        pass

    return current
