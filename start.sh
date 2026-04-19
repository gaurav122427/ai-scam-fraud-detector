#!/bin/bash
# FraudShield — Start Script

set -e
cd "$(dirname "$0")"

echo "🛡️  FraudShield AI Fraud Detector (Gemini 2.5 Pro)"
echo "===================================================="

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ Python3 not found. Install it from https://python.org"
  exit 1
fi

# Create .env if missing
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "⚠️  Created backend/.env — add your GEMINI_API_KEY to it, then re-run."
  exit 1
fi

# Check API key
GEMINI_API_KEY=$(grep GEMINI_API_KEY backend/.env | cut -d= -f2 | tr -d ' ')
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-gemini-api-key-here" ]; then
  echo ""
  echo "⚠️  Set your GEMINI_API_KEY in backend/.env first!"
  echo "   Get your key at: https://aistudio.google.com/app/apikey"
  echo ""
  exit 1
fi

# Install deps if needed
python3 -c "import google.genai, fastapi, uvicorn" 2>/dev/null || {
  echo "📦 Installing dependencies..."
  pip3 install "google-genai>=1.0.0" fastapi uvicorn python-dotenv pydantic httpx --quiet
}

export $(grep -v '^#' backend/.env | xargs)

echo ""
echo "🚀 Starting FraudShield..."
echo "   Model:    Gemini 2.5 Pro"
echo "   API:      http://localhost:8000/api"
echo "   Docs:     http://localhost:8000/docs"
echo "   Frontend: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop."
echo ""

python3 -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
