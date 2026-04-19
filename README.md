# 🛡️ FraudShield AI — Scam & Fraud Detector

An AI-powered system to detect phishing, scams, and fraudulent messages using **Google Gemini 2.5 Pro**. Supports single messages, full conversations, a web UI, and a Chrome extension.

---

## ✨ Features

- **Message Analysis** — Paste any email, SMS, or WhatsApp message and get instant risk scoring
- **Conversation Analysis** — Analyze multi-message chats holistically for grooming/scam patterns
- **Chrome Extension** — Scan any webpage or selected text directly from your browser
- **Risk Levels** — Low / Medium / High with confidence score (0–100%)
- **Scam Categories** — Phishing, Job Scam, OTP Fraud, Lottery Scam, Romance Scam, Investment Scam, Impersonation
- **Explainability** — Red flags, suspicious phrases, tone analysis for every result
- **Dark Mode** — Fully supported in the web UI
- **Sample Tests** — 6 pre-loaded sample messages (4 scams + 2 safe) to try instantly

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| AI Model | Google Gemini 2.5 Pro |
| Frontend | HTML + CSS + Vanilla JS |
| Extension | Chrome Manifest v3 |
| Package | `google-genai` SDK |

---

## 📁 Project Structure

```
fraud detector/
├── backend/
│   ├── app.py                  # FastAPI entry point — serves API + frontend
│   ├── routes/
│   │   └── analyze.py          # POST /api/analyze, POST /api/analyze/chat
│   ├── services/
│   │   └── ai_service.py       # Gemini 2.5 Pro integration
│   ├── models/
│   │   └── schemas.py          # Pydantic request/response models
│   ├── requirements.txt
│   ├── .env                    # Your GEMINI_API_KEY goes here
│   └── .env.example
├── frontend/
│   ├── index.html              # Web UI
│   ├── style.css
│   └── app.js
├── extension/
│   ├── manifest.json           # Chrome Manifest v3
│   ├── popup.html              # Extension popup UI
│   ├── popup.js
│   ├── background.js           # Service worker + context menu
│   ├── content.js              # Injects risk badge into pages
│   └── icons/
├── start.sh                    # One-command startup script
└── README.md
```

---

## 🚀 Quick Start

### 1. Get a Gemini API Key

Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and create a free API key.

### 2. Add your API Key

Open `backend/.env` and replace the placeholder:

```env
GEMINI_API_KEY=AIzaSy...your-actual-key-here
```

### 3. Run the Server

```bash
./start.sh
```

That's it. The script installs dependencies automatically on first run.

| URL | Description |
|-----|-------------|
| `http://localhost:8000` | Web UI |
| `http://localhost:8000/docs` | Interactive API docs (Swagger) |
| `http://localhost:8000/api/health` | Health check |

---

## 🔌 API Reference

### `POST /api/analyze`

Analyze a single message.

**Request:**
```json
{
  "text": "Congratulations! You've won $1,000,000. Click here to claim..."
}
```

**Response:**
```json
{
  "risk_level": "High",
  "confidence_score": 97,
  "category": "Lottery Scam",
  "explanation": "This message exhibits classic lottery scam patterns...",
  "red_flags": [
    "Unsolicited prize notification",
    "Urgency to claim winnings",
    "Request for processing fee"
  ],
  "suspicious_phrases": ["You've won", "Click here to claim"],
  "tone_analysis": {
    "urgent": true,
    "threatening": false,
    "too_good_to_be_true": true,
    "impersonating": false,
    "requesting_sensitive_info": false
  },
  "safe_to_interact": false
}
```

### `POST /api/analyze/chat`

Analyze a WhatsApp/SMS conversation.

**Request:**
```json
{
  "messages": [
    "Hi, I saw your profile and I think we could be friends",
    "I am a crypto investor based in Dubai",
    "I can help you make $5000 a week with my system"
  ]
}
```

**Response:** Same structure as above plus `overall_risk_level`, `overall_confidence_score`, and per-message breakdown.

### `GET /api/health`

```json
{ "status": "healthy", "service": "Fraud Detector API" }
```

---

## 🧩 Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder

**How to use:**
- Click the 🛡️ shield icon in your toolbar
- **"Scan This Page"** — analyzes all text on the current webpage
- **"Scan Selected Text"** — highlight any text, then click this
- **"Manual Input"** tab — paste any message directly
- Right-click selected text → **"Analyze with FraudShield"**

> **Settings:** Click ⚙️ in the extension popup to set your API URL (default: `http://localhost:8000`). Update this when deploying to production.

---

## 🧪 Sample Test Messages

Try these in the web UI under the **Sample Tests** tab:

| Type | Example |
|------|---------|
| 🔴 Phishing | Fake HDFC bank verification link |
| 🔴 OTP Fraud | "Share your OTP with our SBI officer" |
| ⚠️ Job Scam | "Earn ₹50,000/week liking YouTube videos" |
| 🔴 Lottery Scam | Microsoft Anniversary Lottery win |
| ✅ Safe | Real HDFC transaction SMS |
| ✅ Safe | Zomato order delivery update |

---

## ☁️ Deployment

### Backend — Render / Railway

1. Push your code to GitHub
2. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app)
3. Set the start command: `uvicorn backend.app:app --host 0.0.0.0 --port 8000`
4. Add environment variable: `GEMINI_API_KEY=your-key`

### Frontend — Vercel

The frontend is static HTML/JS — deploy the `frontend/` folder directly:

```bash
npx vercel frontend/
```

Or drag-and-drop to [Vercel](https://vercel.com). Update `API_BASE` in `frontend/app.js` to your backend URL.

### Chrome Extension

After deploying the backend, open `extension/popup.js` and update the default API URL, then reload the extension.

---

## 🔒 Security Notes

- Input is capped at **10,000 characters** to prevent abuse
- Basic **prompt injection** patterns are blocked at the schema level
- CORS is open (`*`) by default — restrict `allow_origins` in `backend/app.py` for production
- Never commit your `.env` file — it's in `.gitignore`

---

## 🛠️ Manual Setup (without start.sh)

```bash
# Install dependencies
pip3 install google-genai fastapi uvicorn python-dotenv pydantic httpx

# Set your key
export GEMINI_API_KEY=your-key-here

# Run from the project root
python3 -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📄 License

MIT — free to use, modify, and deploy.
