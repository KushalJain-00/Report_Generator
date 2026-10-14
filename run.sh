#!/bin/bash
# RIG — One-click launcher
cd "$(dirname "$0")"

# Check if --stop was requested
if [ "$1" == "--stop" ]; then
    echo "Stopping any existing RIG server on port 8000..."
    fuser -k 8000/tcp 2>/dev/null || pkill -f "uvicorn.*app:app" 2>/dev/null
    echo "RIG stopped."
    exit 0
fi

# Use start.py which handles Chrome detection, auto-install, and server health check
if [ -f ".venv/bin/python3" ]; then
    .venv/bin/python3 start.py
elif [ -f ".venv/bin/python" ]; then
    .venv/bin/python start.py
else
    python3 start.py
fi
