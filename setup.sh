#!/bin/bash
# ─────────────────────────────────────────────────────────────
# RIG — Report Intelligence Generator
# Quick Setup Script
# ─────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
LIME='\033[1;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   RIG — Report Intelligence Generator Setup     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Check Python ───────────────────────────────────────────
echo -e "${YELLOW}[1/3] Checking Python...${NC}"

if ! command -v python3 &> /dev/null; then
  echo -e "${RED}  ✗ Python3 not found.${NC}"
  echo -e "  Install from: https://python.org/"
  exit 1
fi
echo -e "${GREEN}  ✓ Python $(python3 --version 2>&1 | cut -d' ' -f2)${NC}"

# ── Create venv + install deps ─────────────────────────────
echo ""
echo -e "${YELLOW}[2/3] Setting up virtual environment...${NC}"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo -e "${GREEN}  ✓ Created .venv${NC}"
else
  echo -e "${GREEN}  ✓ .venv already exists${NC}"
fi

source .venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# ── Optional: Check Ollama ────────────────────────────────
echo ""
echo -e "${YELLOW}[3/3] Checking Ollama (optional, for local AI)...${NC}"

if command -v ollama &> /dev/null; then
  echo -e "${GREEN}  ✓ Ollama installed${NC}"
  if curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo -e "${GREEN}  ✓ Ollama is running${NC}"
  else
    echo -e "${YELLOW}  ! Ollama not running. Start with: ollama serve${NC}"
  fi
else
  echo -e "${YELLOW}  ! Ollama not installed (optional).${NC}"
  echo -e "  Install: curl -fsSL https://ollama.com/install.sh | sh"
  echo -e "  Or use Groq/Gemini/OpenRouter with a free API key."
fi

# ── Done ───────────────────────────────────────────────────
echo ""
echo -e "${LIME}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo ""
echo -e "  Run:  ${CYAN}python app.py${NC}"
echo -e "  Open: ${CYAN}http://localhost:8000${NC}"
echo ""
echo -e "${LIME}═══════════════════════════════════════════════════${NC}"
echo ""
