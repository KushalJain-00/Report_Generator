#!/bin/bash
# RIG — One-click start
set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

echo ""
echo "  RIG — Report Intelligence Generator"
echo "  http://localhost:8000"
echo ""
python3 app.py
