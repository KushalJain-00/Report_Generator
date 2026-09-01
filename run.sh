#!/bin/bash
# RIG — One-click start
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q fastapi uvicorn httpx 2>/dev/null

echo ""
echo "  RIG — Report Intelligence Generator"
echo "  http://localhost:8000"
echo ""
python3 app.py
