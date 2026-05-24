# OmniFlow AI

3-day hackathon MVP for a multi-channel AI auto-reply and business automation platform.

## Phase 1 Run Commands

### Frontend

```bash
cd frontend
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend runs at:

```text
http://localhost:8010
```

Health check:

```text
GET http://localhost:8010/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## Phase 2 Routes

```text
http://localhost:3000/login
http://localhost:3000/dashboard
```

The login screen uses mock localStorage authentication. Use the pre-filled demo credentials and click **Enter Dashboard**.

## Phase 3 API Endpoints

```text
GET  http://localhost:8010/conversations
GET  http://localhost:8010/messages/{conversation_id}
POST http://localhost:8010/messages
```

Example message body:

```json
{
  "conversation_id": "conv_website_1",
  "body": "What is the pricing?"
}
```

The dashboard now includes a unified inbox with seeded conversations, message history, AI/Human labels, and mock AI replies.

## Phase 4 AI Configuration

The backend supports Groq and OpenAI, then falls back to the mock responder if the selected provider is not configured or errors.

### Groq

```text
AI_PROVIDER="groq"
GROQ_API_KEY="your_key_here"
GROQ_MODEL="llama-3.3-70b-versatile"
```

### OpenAI

```text
AI_PROVIDER="openai"
OPENAI_API_KEY="your_key_here"
OPENAI_MODEL="gpt-4o-mini"
```

Status endpoint:

```text
GET http://localhost:8010/ai/status
```

Without a working provider key, the app uses mock fallback responses so the demo still works.

## Phase 5 Knowledge Base + RAG

The backend includes a seeded OmniFlow FAQ and supports TXT, Markdown, and PDF uploads.

```text
GET  http://localhost:8010/documents
POST http://localhost:8010/upload
```

Uploaded documents are chunked and used as context for chat answers. The dashboard includes a Knowledge Base panel above the unified inbox.
