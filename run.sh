#!/bin/bash
# RIG — One-click start
cd "$(dirname "$0")"

echo ""
echo "  RIG — Report Intelligence Generator"
echo "  ────────────────────────────────────"
echo ""

# ── Create venv if missing ─────────────────────────────────
if [ ! -d ".venv" ]; then
    echo "  [1/3] Creating virtual environment..."
    python3 -m venv .venv
fi

# ── Activate ────────────────────────────────────────────────
echo "  [2/3] Activating environment..."
source .venv/bin/activate

# ── Check and install requirements ──────────────────────────
echo "  [3/3] Checking requirements..."
pip show fastapi > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "        Installing missing packages..."
    pip install -r requirements.txt
fi
echo "        All packages OK."

echo ""
echo "  ────────────────────────────────────"
echo "   Open http://localhost:8000"
echo "   Press Ctrl+C to stop."
echo "  ────────────────────────────────────"
echo ""

# ── Open browser and start server ──────────────────────────
(sleep 1.5 && xdg-open http://localhost:8000 2>/dev/null || open http://localhost:8000 2>/dev/null) &
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000
