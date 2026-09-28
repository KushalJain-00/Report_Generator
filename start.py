#!/usr/bin/env python3
"""RIG Launcher — starts server and opens browser. Cross-platform."""
import sys, os, subprocess, threading, time, webbrowser

PORT = 8000
URL = f"http://localhost:{PORT}"
DIR = os.path.dirname(os.path.abspath(__file__))
VENV_DIR = os.path.join(DIR, ".venv")

def get_python():
    """Return venv python if available, else sys.executable."""
    if sys.platform == "win32":
        venv_py = os.path.join(VENV_DIR, "Scripts", "python.exe")
    else:
        venv_py = os.path.join(VENV_DIR, "bin", "python3")
    if os.path.exists(venv_py):
        return venv_py
    return sys.executable

def ensure_deps(python):
    """Install requirements if fastapi is missing."""
    try:
        subprocess.run([python, "-c", "import fastapi"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("  Installing dependencies...")
        req = os.path.join(DIR, "requirements.txt")
        subprocess.run([python, "-m", "pip", "install", "-r", req], cwd=DIR)

def open_browser():
    time.sleep(1.5)
    webbrowser.open(URL)

def main():
    python = get_python()
    ensure_deps(python)

    print(f"\n  RIG — Report Intelligence Generator")
    print(f"  {URL}\n")
    print("  Close this window or press Ctrl+C to stop.\n")

    t = threading.Thread(target=open_browser, daemon=True)
    t.start()

    try:
        subprocess.run(
            [python, "-m", "uvicorn", "app:app",
             "--host", "0.0.0.0", "--port", str(PORT)],
            cwd=DIR
        )
    except KeyboardInterrupt:
        print("\n  Stopped.")

if __name__ == "__main__":
    main()
