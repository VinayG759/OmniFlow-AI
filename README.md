# OmniFlow AI 🤖

> **Multi-Channel AI Business Automation Platform**  
> Unified inbox · AI auto-reply · WhatsApp · Facebook · Instagram · Lead capture · Appointment booking · Workflow automation · Analytics

---

## 🚀 Live Demo

| | URL |
|---|---|
| **Frontend** | _coming soon (Vercel)_ |
| **Backend API** | _coming soon (Render)_ |

---

## 📌 Problem Statement

Businesses receive customer enquiries across WhatsApp, Instagram, Facebook, websites, and more. Managing these manually causes **delayed responses, missed leads, and poor customer experience**.

OmniFlow AI solves this with a single intelligent platform that handles every channel automatically — AI replies instantly, captures leads, books appointments, and escalates to humans only when needed.

---

## ✨ Features

### 🌐 Multi-Channel Inbox
| Channel | Status |
|---|---|
| 🌍 Website Chat Widget | ✅ Live |
| 📱 WhatsApp (Meta Cloud API) | ✅ Live — real messages in & out |
| 📘 Facebook Messenger | ✅ Live — real messages in & out |
| 📸 Instagram DMs | ✅ Live — real messages in & out |
| 📧 Email (simulated) | ✅ Simulated in demo |

### 🤖 AI Response Engine
- **LLM**: Groq `llama-3.3-70b-versatile` (fast, free tier)
- **RAG**: Retrieval-Augmented Generation from uploaded documents
- **Streaming**: Tokens stream word-by-word like ChatGPT
- **Context memory**: Full conversation history in every request
- **Hallucination guard**: Refuses to answer factual questions without KB context

### 📚 Knowledge Base
- Upload **PDF, TXT, or Markdown** files
- Auto-chunked and indexed for semantic search
- Seeded FAQ included out-of-the-box
- AI answers only from uploaded context

### 🎯 Lead Capture
- AI **auto-extracts** name, email, phone, and interest from chat
- Leads stored in PostgreSQL
- CSV export (one click)
- **Google Sheets auto-sync** — configure once, leads appear instantly in your sheet

### 📅 Appointment Booking
- Slot-based booking system (3-day rolling window)
- AI detects booking intent and shows available slots
- Confirmed bookings block the slot for others
- Visible in the Bookings dashboard tab

### ⚙️ Workflow Automation
- Rule engine: `IF message contains X → escalate / send reply / tag lead`
- Pre-seeded rules: escalate refunds, pricing auto-reply, demo → lead tag
- Create, delete, and toggle rules from the UI
- Workflow activity log with timestamps

### 📊 Analytics Dashboard
- Total conversations, AI replies, leads, bookings, escalations
- **Charts**: Daily conversations (area), lead growth (bar), channel breakdown (pie), status breakdown
- Powered by Recharts, responsive, live data

### 🧑‍💻 Human Escalation
- Auto-escalation on refund/angry/urgent keywords
- Manual "Escalate to Human" button in chat header
- Status dropdown: active → lead → booked → escalated → resolved
- AI pauses on escalated conversations

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, TailwindCSS, shadcn/ui, Recharts |
| **Backend** | FastAPI (Python), SQLAlchemy ORM |
| **Database** | PostgreSQL |
| **AI / LLM** | Groq API (llama-3.3-70b), OpenAI-compatible |
| **WhatsApp** | Meta WhatsApp Cloud API (Graph API v18.0) |
| **Facebook** | Meta Messenger Platform (Graph API v18.0) |
| **Instagram** | Meta Instagram Messaging API (Graph API v18.0) |
| **Google Sheets** | gspread + Google Service Account |
| **Deployment** | Vercel (frontend) · Render (backend) |

---

## 📁 Project Structure

```
OmniFlow-AI/
├── backend/
│   ├── app/
│   │   ├── main.py          # All API endpoints + AI logic
│   │   └── database.py      # SQLAlchemy models
│   ├── .env                 # API keys (not committed)
│   └── requirements.txt
└── frontend/                # (master branch)
    ├── app/
    │   ├── dashboard/       # Main dashboard (inbox, leads, analytics...)
    │   ├── chat/            # Website chat widget page
    │   ├── widget/          # Embeddable chat widget
    │   └── login/           # Mock auth
    └── lib/
        ├── api.ts           # All backend API calls
        └── auth.ts          # Mock auth helper
```

---

## ⚡ Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally

### 1. Clone the repo
```bash
git clone https://github.com/VinayG759/OmniFlow-AI.git
cd OmniFlow-AI
```

### 2. Backend setup
```bash
cd backend

# Windows
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Mac/Linux
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
APP_NAME="OmniFlow AI API"
APP_ENV="development"
FRONTEND_ORIGIN="http://localhost:3000"

# AI Provider (groq recommended — free tier)
AI_PROVIDER="groq"
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL="llama-3.3-70b-versatile"

# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/omniflow

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_VERIFY_TOKEN=omniflow-webhook-secret

# Facebook Messenger
FB_PAGE_ACCESS_TOKEN=your_fb_page_token
FB_VERIFY_TOKEN=omniflow-fb-secret

# Instagram Messaging
IG_PAGE_ACCESS_TOKEN=your_ig_page_token
IG_VERIFY_TOKEN=omniflow-ig-secret

# Google Sheets (optional)
# GOOGLE_SERVICE_ACCOUNT_JSON=backend/google_credentials.json
# GOOGLE_SHEETS_ID=your_google_sheet_id
```

Start the backend:
```bash
uvicorn app.main:app --reload
# API runs at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### 3. Frontend setup
```bash
cd frontend       # switch to master branch if needed: git checkout master
npm install
npm run dev
# App runs at http://localhost:3000
```

---

## 🔗 API Reference

```
GET  /health                        Health check
GET  /ai/status                     AI provider info

GET  /conversations                 List all conversations
GET  /messages/{conversation_id}    Get messages in a conversation
POST /messages                      Send message + get AI reply
POST /messages/stream               Streaming SSE response (word-by-word)
PATCH /conversations/{id}/status    Update conversation status
POST /escalate/{id}                 Escalate to human

POST /upload                        Upload KB document (PDF/TXT/MD)
GET  /documents                     List uploaded documents

GET  /leads                         List captured leads
POST /leads/sync-sheets             Push all leads to Google Sheets

GET  /bookings                      List appointments
GET  /slots                         Available booking slots

GET  /workflows                     List automation rules
POST /workflows                     Create a rule
PATCH /workflows/{id}/toggle        Enable/disable a rule
DELETE /workflows/{id}              Delete a rule
GET  /workflow-logs                 Automation activity log

GET  /analytics                     Dashboard analytics summary

GET  /webhooks/whatsapp             WhatsApp webhook verify (GET)
POST /webhooks/whatsapp             Receive WhatsApp messages
GET  /webhooks/facebook             Facebook webhook verify (GET)
POST /webhooks/facebook             Receive Facebook Messenger messages
GET  /webhooks/instagram            Instagram webhook verify (GET)
POST /webhooks/instagram            Receive Instagram DMs
```

---

## 📱 WhatsApp / Facebook / Instagram Setup

All three channels use Meta's Graph API. To enable real messaging:

1. Create a [Meta Developer App](https://developers.facebook.com/apps/) (Business type)
2. Add **WhatsApp**, **Messenger**, and **Instagram** products
3. For each channel:
   - Get the **Page Access Token** / **Phone Number ID**
   - Add it to `backend/.env`
   - Set webhook URL to `https://your-backend.com/webhooks/{channel}`
   - Use verify token matching `.env`
4. For local testing, expose the backend with [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 8000
   ```

---

## 📊 Google Sheets Integration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Google Sheets API**
3. Create a **Service Account** → Download JSON credentials key
4. Save the key as `backend/google_credentials.json`
5. Share your Google Sheet with the service account email (Editor access)
6. Set env vars:
   ```env
   GOOGLE_SERVICE_ACCOUNT_JSON=backend/google_credentials.json
   GOOGLE_SHEETS_ID=your_sheet_id_from_url
   ```
7. New leads now auto-appear in the sheet in real-time, and the "Sync to Sheets" button in the Leads tab does a full refresh

---

## 🏆 Hackathon

Built for **SummerShip Challenge 2026** — Problem Statement #05:  
*Multi Channel Auto Reply, Calls & Business Automation Platform*

**Key differentiators:**
- ✅ Real WhatsApp / Facebook / Instagram integration (not mocked)
- ✅ Full RAG pipeline with PDF/TXT/MD document upload
- ✅ End-to-end business flow: chat → lead → booking → escalation → analytics
- ✅ Streaming AI responses (word-by-word like ChatGPT)
- ✅ Google Sheets auto-sync for CRM-style lead management
- ✅ Workflow automation rules engine

---

## 👤 Author

**Vinay G**  
GitHub: [@VinayG759](https://github.com/VinayG759)
