#!/usr/bin/env python3
"""RIG Launcher — Starts the local server and opens RIG in Google Chrome.

Supports Windows, Linux, and macOS.
Auto-detects Chrome, checks health before launching, avoids duplicate instances,
and auto-installs missing dependencies.
"""

import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser

PORT = 8000
URL = f"http://localhost:{PORT}"
HEALTH_URL = f"http://127.0.0.1:{PORT}/api/health"
DIR = os.path.dirname(os.path.abspath(__file__))
VENV_DIR = os.path.join(DIR, ".venv")


def get_python():
    """Return venv python executable if available, else sys.executable."""
    if sys.platform == "win32":
        venv_py = os.path.join(VENV_DIR, "Scripts", "python.exe")
    else:
        venv_py = os.path.join(VENV_DIR, "bin", "python3")
        if not os.path.exists(venv_py):
            venv_py = os.path.join(VENV_DIR, "bin", "python")

    if os.path.exists(venv_py):
        return venv_py
    return sys.executable


def ensure_deps(python):
    """Ensure virtualenv and required dependencies are installed."""
    try:
        subprocess.run(
            [python, "-c", "import fastapi; import uvicorn; import httpx"],
            capture_output=True,
            check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("  [Setup] Missing dependencies detected. Installing...")
        req = os.path.join(DIR, "requirements.txt")
        if os.path.exists(req):
            subprocess.run([python, "-m", "pip", "install", "-r", req], cwd=DIR)
        else:
            subprocess.run(
                [python, "-m", "pip", "install", "fastapi", "uvicorn", "httpx", "python-docx", "weasyprint", "markdown"],
                cwd=DIR,
            )


def find_chrome():
    """Locate Google Chrome or Chromium executable across Windows, Linux, macOS."""
    # 1. Windows paths
    if sys.platform == "win32":
        candidates = [
            os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), r"Google\Chrome\Application\chrome.exe"),
            os.path.join(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"), r"Google\Chrome\Application\chrome.exe"),
            os.path.join(os.environ.get("LocalAppData", ""), r"Google\Chrome\Application\chrome.exe"),
            os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), r"Chromium\Application\chrome.exe"),
        ]
        for p in candidates:
            if p and os.path.isfile(p):
                return p
        # Check PATH
        for cmd in ("chrome", "chrome.exe", "google-chrome"):
            found = shutil.which(cmd)
            if found:
                return found

    # 2. Linux / Unix paths
    elif sys.platform.startswith("linux"):
        for cmd in ("google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "google-chrome-beta"):
            found = shutil.which(cmd)
            if found:
                return found

    # 3. macOS
    elif sys.platform == "darwin":
        mac_chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        if os.path.isfile(mac_chrome):
            return mac_chrome
        mac_chromium = "/Applications/Chromium.app/Contents/MacOS/Chromium"
        if os.path.isfile(mac_chromium):
            return mac_chromium

    return None


def is_server_running(timeout=0.6):
    """Check if RIG is already running on port 8000."""
    try:
        req = urllib.request.Request(HEALTH_URL, headers={"User-Agent": "RIG-Launcher"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False


def wait_for_server(max_wait=30.0):
    """Wait until the server starts responding to health checks."""
    start_time = time.time()
    while time.time() - start_time < max_wait:
        if is_server_running():
            return True
        time.sleep(0.5)
    return False


def open_chrome_app(url=URL):
    """Open the URL in Chrome standalone app mode, or fallback to default browser."""
    chrome = find_chrome()
    if chrome:
        try:
            # --app creates a sleek standalone app window without browser URL bar
            subprocess.Popen([chrome, f"--app={url}"])
            return True
        except Exception:
            pass

    # Fallback to system default browser
    try:
        webbrowser.open(url)
        return True
    except Exception:
        return False


def main():
    print("\n  ╔══════════════════════════════════════════════════╗")
    print("  ║       RIG — Report Intelligence Generator       ║")
    print("  ╚══════════════════════════════════════════════════╝\n")

    # If already running, simply focus/open Chrome and exit!
    if is_server_running():
        print(f"  ✓ RIG server is already running on {URL}")
        print("  Opening RIG in Google Chrome...\n")
        open_chrome_app(URL)
        return

    python = get_python()
    ensure_deps(python)

    print(f"  Starting server on {URL} ...")
    print("  Press Ctrl+C or close this window to stop.\n")

    # Build environment for the server subprocess
    env = os.environ.copy()
    env["PYTHONPATH"] = DIR + (os.pathsep + env.get("PYTHONPATH", "") if env.get("PYTHONPATH") else "")

    # Start the uvicorn server as a background process (not blocking main thread)
    server_proc = subprocess.Popen(
        [python, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", str(PORT)],
        cwd=DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    # Stream server output in a background thread so we can see logs
    def stream_output():
        try:
            for line in iter(server_proc.stdout.readline, b""):
                decoded = line.decode("utf-8", errors="replace").rstrip()
                if decoded:
                    print(f"  [server] {decoded}")
        except Exception:
            pass

    output_thread = threading.Thread(target=stream_output, daemon=True)
    output_thread.start()

    # Wait for the server to become healthy
    print("  Waiting for server to start...")
    server_healthy = False
    for attempt in range(60):  # Up to 30 seconds (60 × 0.5s)
        # Check if the process crashed
        ret = server_proc.poll()
        if ret is not None:
            print(f"\n  ✗ Server process exited with code {ret}")
            print("  Check the output above for error details.")
            print("  Common fixes:")
            print("    - Ensure all dependencies are installed: pip install -r requirements.txt")
            print("    - Check if port 8000 is already in use")
            print("    - Try running manually: python -m uvicorn app:app --host 127.0.0.1 --port 8000")
            return

        if is_server_running(timeout=1.0):
            server_healthy = True
            break

        time.sleep(0.5)

    if not server_healthy:
        print("\n  ✗ Server did not respond to health checks within 30 seconds.")
        print("  The server process may still be starting.")
        print("  Check the output above for any errors.")
        # Don't open Chrome if server isn't healthy
        try:
            server_proc.terminate()
        except Exception:
            pass
        return

    # Server is confirmed healthy — now open Chrome
    print(f"  ✓ Server is ready at {URL}")
    print("  Opening Google Chrome...\n")
    print("  ══════════════════════════════════════════════════")
    print(f"   Server:  {URL}")
    print("   Browser: Google Chrome (App Mode)")
    print("   Storage: Local keys saved to config.json")
    print("  ══════════════════════════════════════════════════")
    print("\n  Close this window or press Ctrl+C to stop.\n")

    open_chrome_app(URL)

    # Keep the main thread alive, waiting for the server process
    try:
        server_proc.wait()
    except KeyboardInterrupt:
        print("\n  Stopping RIG server...")
        server_proc.terminate()
        try:
            server_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_proc.kill()
        print("  RIG server stopped.")


if __name__ == "__main__":
    main()
