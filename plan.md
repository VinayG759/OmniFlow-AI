# 3 Day Hackathon Execution Plan
## Multi-Channel Auto Reply, Calls & Business Automation Platform

---

# 1. Goal of the 3-Day Build

You do NOT have time to build:
- Full SaaS
- Complete CRM
- Production-grade voice AI
- Full LinkedIn automation
- Enterprise workflow systems
- Production authentication and billing

Your objective is to build a:

# Convincing MVP Prototype

The MVP should demonstrate:

- Unified Inbox
- AI Auto Reply
- WhatsApp-like Chat Simulation
- Website Chat Widget
- Knowledge Base + RAG
- Lead Capture
- Appointment Booking
- Human Escalation
- Dashboard Analytics
- Workflow Automation Demo

This is enough to:
- Win hackathons
- Impress judges
- Show system design skills
- Demonstrate AI engineering
- Demonstrate real-world business value

---

# 2. Strategic Scope Reduction

## Do Not Build

- Real LinkedIn messaging
- Real Instagram DM automation
- Real Facebook inbox
- Real Twilio voice AI
- Complex OAuth systems
- Full workflow engine
- Multi-tenancy
- Kubernetes
- Microservices
- Billing or subscriptions

These consume too much time and do not improve the hackathon demo enough.

## Build Instead

Focus on one polished business automation flow:

```text
Website Chat
+ AI RAG Answer
+ Lead Capture
+ Appointment Booking
+ Unified Inbox
+ Workflow Trigger
+ Human Escalation
+ Analytics
```

---

# 3. Final MVP Architecture

```text
Frontend (Next.js)
    |
    v
FastAPI Backend
    |
    +--> Chat + Conversations API
    |
    +--> RAG Engine
    |       |
    |       v
    |    ChromaDB
    |
    +--> Workflow Logic
    |
    +--> Analytics + Demo Data
    |
    v
OpenAI/Gemini API
```

## Realtime Strategy

Use the simplest approach that works:

- Preferred for speed: frontend optimistic updates + backend persistence
- Optional if time remains: WebSockets or Socket.IO
- Acceptable for demo: polling every few seconds

---

# 4. Final Feature Set

# Must-Have Features

## 1. Website Chat Widget
- Live chat UI
- AI responses
- Typing indicator
- Lead capture prompts

## 2. Unified Inbox Dashboard
- Multiple conversations
- Message history
- AI/Human labels
- Conversation status: active, lead captured, escalated, booked

## 3. Knowledge Base RAG

Upload or seed:
- FAQs
- TXT docs
- PDFs if time allows

AI answers based on company data.

Recommended priority:
1. Seeded FAQ/text knowledge base
2. TXT upload
3. PDF upload

## 4. Lead Capture

AI asks for:
- Name
- Email
- Phone
- Interest

Stores lead data.

## 5. Appointment Booking

Mock booking system:
- Available slots
- Date
- Time
- Confirmation
- Slot becomes unavailable after booking

## 6. Workflow Automation

Simple rule-based demo:

```text
IF pricing query
-> Send pricing response
-> Mark as sales opportunity
```

```text
IF refund or angry query
-> Escalate to human
```

## 7. Analytics Dashboard

Show:
- Total chats
- Leads captured
- AI response count
- Bookings
- Escalations
- Daily conversations chart

## 8. Human Escalation

```text
Transfer to Human
```

Show escalation state in the inbox.

---

# Optional Bonus Features

Only add these after the core demo works:

- WhatsApp webhook demo
- Voice assistant demo
- Google Sheets export
- Sentiment analysis
- Email notifications
- PDF upload if not already completed
- WebSocket realtime updates

---

# 5. Recommended Tech Stack

## Frontend

| Area | Tech |
|---|---|
| Framework | Next.js 15 |
| Styling | TailwindCSS |
| Components | shadcn/ui |
| State | Zustand or React state |
| Charts | Recharts |
| Realtime | Polling first, Socket.IO optional |

## Backend

| Area | Tech |
|---|---|
| API | FastAPI |
| AI | Direct SDK calls or LangChain |
| Vector DB | ChromaDB |
| DB | SQLite for hackathon speed |
| Realtime | Polling or WebSockets |
| Background Tasks | FastAPI BackgroundTasks |

## AI

| Area | Tech |
|---|---|
| LLM | Gemini API or OpenAI |
| Embeddings | Gemini/OpenAI |
| RAG | Simple retriever first, LangChain optional |
| Chunking | Recursive splitter |

## Recommendation

For a 3-day hackathon, prefer:

```text
SQLite + ChromaDB + FastAPI + Next.js
```

Avoid PostgreSQL unless the project already has it configured.

---

# 6. Folder Structure

## Frontend

```text
frontend/
+-- app/
+-- components/
|   +-- chat/
|   +-- dashboard/
|   +-- analytics/
|   +-- ui/
+-- store/
+-- hooks/
+-- services/
+-- lib/
```

## Backend

```text
backend/
+-- app/
|   +-- api/
|   +-- ai/
|   +-- rag/
|   +-- workflows/
|   +-- services/
|   +-- models/
|   +-- db/
|   +-- utils/
```

---

# 7. 3-Day Timeline

# Day 1 - Core Chat + App Shell

## Phase 1 - Project Setup (1 Hour)

### Tasks
- Setup frontend
- Setup backend
- Configure Tailwind
- Setup FastAPI
- Setup CORS
- Create environment configs
- Add health route

### Deliverables

#### Frontend Running
```bash
npm run dev
```

#### Backend Running
```bash
uvicorn app.main:app --reload
```

### Review Checklist

#### Frontend
- [ ] Tailwind working
- [ ] Routing working
- [ ] Components rendering

#### Backend
- [ ] API working
- [ ] Health route working
- [ ] CORS working

### Testing

#### Backend Test
```bash
GET /health
```

Expected:

```json
{
  "status": "ok"
}
```

---

## Phase 2 - Mock Auth + Dashboard Layout (1.5 Hours)

### Build
- Login page
- Dashboard layout
- Sidebar
- Header
- Mock authenticated state

No real auth needed.

### Review Checklist
- [ ] Login screen routes to dashboard
- [ ] Sidebar navigation works
- [ ] Dashboard layout is responsive
- [ ] Dark mode optional

---

## Phase 3 - Unified Inbox UI (3 Hours)

### Build
- Conversation list
- Chat window
- Message bubbles
- Typing indicator
- AI/Human badges
- Conversation status labels

### Backend
Create:

```text
GET /conversations
GET /messages/{conversation_id}
POST /messages
```

### Review Checklist
- [ ] Multiple chats visible
- [ ] Messages persist
- [ ] Sending message updates UI
- [ ] AI/Human labels visible

### Testing
- Send message
- Receive mock AI response
- Refresh and confirm persistence

---

## Phase 4 - AI Chat Integration (3 Hours)

### Build
Integrate:
- Gemini API or OpenAI

### AI Flow

```text
User Message
    |
    v
Prompt Builder
    |
    v
LLM
    |
    v
AI Response
```

### Add
- Conversation history
- Basic context memory
- Fallback error response

### Review Checklist
- [ ] AI responds correctly
- [ ] Context retained
- [ ] Errors handled gracefully

### Testing

```text
Hello
What services do you offer?
What was my previous question?
```

---

# End of Day 1 Target

You should have:

- Functional dashboard
- Unified inbox
- Working chat UI
- AI responses
- Message persistence
- Demo-ready app shell

---

# Day 2 - RAG + Business Flows

## Phase 5 - Knowledge Base RAG (4 Hours)

### Build

Start with:
- Seeded FAQ/company text
- TXT upload

Add if time allows:
- PDF upload

### Pipeline

```text
Document
   |
   v
Chunking
   |
   v
Embeddings
   |
   v
ChromaDB
   |
   v
Retriever
```

### AI Flow

```text
Question
   |
   v
Retrieve Chunks
   |
   v
Add Context
   |
   v
Generate Answer
```

### Review Checklist
- [ ] Knowledge base can be seeded or uploaded
- [ ] Retrieval works
- [ ] AI answers from company data
- [ ] AI says it does not know when context is missing

### Testing

```text
What pricing plans are available?
What are your business hours?
```

Ensure:
- AI uses uploaded or seeded docs
- AI avoids hallucinations

---

## Phase 6 - Lead Capture System (2.5 Hours)

### Build
AI extracts:
- Name
- Email
- Phone
- Interest

Store in DB.

### Example

```text
User: I want a demo.
AI: Sure, may I know your name and email?
```

### Review Checklist
- [ ] Lead stored
- [ ] Lead appears in dashboard
- [ ] Validation working
- [ ] Duplicate handling is basic but safe

---

## Phase 7 - Appointment Booking (2.5 Hours)

### Build
Simple booking logic:
- Available slots
- Confirmation
- Calendar storage
- Slot unavailable after booking

### Example

```text
AI:
Available times:
- 11 AM
- 2 PM
```

### Review Checklist
- [ ] Booking saved
- [ ] Bookings visible in dashboard
- [ ] Slot unavailable after booking
- [ ] Confirmation message appears in chat

---

## Phase 8 - Human Escalation (1 Hour)

### Build
- Manual "Transfer to Human" button
- Automatic escalation for urgent/refund/angry messages
- Escalated status in inbox

### Review Checklist
- [ ] Manual escalation works
- [ ] Rule-based escalation works
- [ ] Inbox clearly shows escalation state

---

# End of Day 2 Target

You should have:

- RAG-powered AI answers
- Lead capture
- Appointment booking
- Escalation flow
- Strong end-to-end business demo

---

# Day 3 - Automation + Analytics + Polish

## Phase 9 - Workflow Automation (3 Hours)

### Build
Simple rules engine.

### Rules Example

```text
IF contains "pricing"
-> Send pricing response
-> Mark as sales opportunity
```

```text
IF contains "refund"
-> Escalate to human
```

```text
IF contains "demo"
-> Start lead capture
```

### Architecture

```text
Trigger
   |
   v
Condition
   |
   v
Action
```

### Review Checklist
- [ ] Rules execute
- [ ] Escalation works
- [ ] Lead capture trigger works
- [ ] Workflow activity appears in UI

---

## Phase 10 - Analytics Dashboard (2.5 Hours)

### Build Cards
- Total chats
- AI replies
- Leads
- Bookings
- Escalations

### Add Charts
- Daily conversations
- Lead growth

### Review Checklist
- [ ] Cards render
- [ ] Charts render
- [ ] Counts are accurate enough for demo
- [ ] Demo data looks realistic

---

## Phase 11 - WhatsApp-like Simulation (1.5 Hours)

### Build
- Channel label: Website, WhatsApp, Email
- Mock WhatsApp conversation
- Same backend conversation model

### Review Checklist
- [ ] Channel labels visible
- [ ] WhatsApp demo feels believable
- [ ] No real webhook required

---

## Phase 12 - Final Polish and Demo Prep (3 Hours)

### Add
- Loading states
- Toast notifications
- Empty states
- Error states
- Smooth but simple animations
- Seed demo data
- Clean final UI spacing

### Demo Data
Populate:
- Conversations
- Leads
- Bookings
- Workflow events
- Escalations

### Final Demo Script
Prepare a repeatable script:
1. Show dashboard overview.
2. Open website chat.
3. Ask a knowledge-base question.
4. Ask for a demo.
5. Capture lead details.
6. Book appointment.
7. Show unified inbox.
8. Trigger refund escalation.
9. Show analytics updates.

---

# End of Day 3 Target

You should have:

- Polished demo flow
- Clean dashboard
- RAG working
- Lead and booking flows working
- Workflow automation demo
- Analytics dashboard
- Human escalation
- Optional channel simulation

---

# 8. Final Demo Flow

## Step 1
Upload or select company knowledge base.

## Step 2
Open website chat.

## Step 3

```text
What pricing plans do you offer?
```

AI answers from KB.

## Step 4

```text
I want a demo.
```

AI captures lead.

## Step 5
Book appointment.

## Step 6
Show unified inbox.

## Step 7
Show analytics dashboard.

## Step 8

```text
I want a refund immediately.
```

AI escalates to human.

---

# 9. Database Tables

```text
users
conversations
messages
documents
leads
appointments
workflow_events
analytics
```

## Minimum SQLite Tables

If time is tight, only create:

```text
conversations
messages
documents
leads
appointments
workflow_events
```

Analytics can be calculated from these tables.

---

# 10. APIs to Build

```text
GET  /health
POST /chat
POST /upload
GET  /conversations
GET  /messages/{conversation_id}
POST /messages
POST /lead
GET  /leads
POST /appointment
GET  /appointments
POST /escalate
GET  /analytics
GET  /workflow-events
```

---

# 11. High Priority UI Components

```text
Sidebar
ChatWindow
ConversationList
MessageBubble
TypingIndicator
AnalyticsCards
LeadTable
BookingTable
UploadPanel
WorkflowEventList
EscalationBadge
ChannelBadge
```

---

# 12. Biggest Risk Areas

## 1. RAG Bugs

Fix:
- Start with seeded text before PDF upload
- Use small chunks
- Keep prompts simple
- Show fallback answer when context is missing

Prompt:

```text
Answer only from the provided context. If the answer is not in the context, say you do not have enough information.
```

## 2. WebSocket Failures

Fix:
- Use polling or optimistic UI first
- Add WebSockets only if core demo is already stable

## 3. AI Hallucinations

Fix:
- Force KB-only answers for company-specific questions
- Separate general chat from KB-grounded answers
- Display source snippets if possible

## 4. Too Many Features

Fix:
- Preserve the main demo path first
- Mock integrations instead of building real channels
- Cut optional features early if needed

---

# 13. Hackathon Winning Strategy

Judges care about:
- Working demo
- Real business value
- AI integration
- Smooth UX
- Real-world applicability
- Clear story

Judges do NOT care much about:
- Perfect backend architecture
- Enterprise scalability
- Real social platform integrations
- Production authentication

---

# 14. Final Success Criteria

## Minimum Success

- AI chat works
- KB/RAG answers work
- Inbox works
- Lead capture works
- Dashboard works

## Strong Submission

- Workflow automation
- Appointment booking
- Real-time or simulated real-time messaging
- Human escalation
- Clean UI
- Good demo data

## Exceptional Submission

- WhatsApp simulation or webhook demo
- Voice AI demo
- Google Sheets export
- CRM sync
- Source citations for RAG answers

---

# 15. Final Recommendation

Your best strategy is:

# Build depth, not breadth.

Meaning:
- Few channels
- Polished experience
- One complete business workflow

instead of:
- 10 broken integrations
- Half-working automation
- Complex architecture with no demo story

The strongest 3-day demo is:

```text
Website Chat
+ Unified Inbox
+ AI RAG
+ Lead Capture
+ Booking
+ Workflow Automation
+ Analytics
+ Human Escalation
```

That is enough to look like a real AI SaaS platform while staying achievable in 3 days.

---

# Day 4–5 — Polish, Real Integrations & Business Pitch Ready

---

## Phase 13 — Streaming AI Responses (2 Hours)

### Goal
Instead of waiting for the full AI reply, tokens stream word-by-word like ChatGPT. Biggest single "wow" factor in a live demo.

### Backend Changes
- Switch Groq/OpenAI calls to streaming mode (`stream=True`)
- Add `GET /messages/stream/{conversation_id}` endpoint using FastAPI `StreamingResponse`
- Emit Server-Sent Events (SSE) — one token per event, `data: <token>\n\n`

### Frontend Changes
- Replace `sendMessage` with a streaming fetch using `EventSource` or `ReadableStream`
- Append tokens to a live message bubble as they arrive
- Show blinking cursor `▌` at the end while streaming
- Replace static "AI is typing…" spinner with the live streaming bubble

### Architecture
```text
User sends message
       |
       v
POST /messages  (saves user msg, triggers AI)
       |
       v
GET /messages/stream/{conv_id}  (SSE stream)
       |
       v
Frontend appends tokens in real-time
       |
       v
Stream ends → bubble finalised → saved to DB
```

### Review Checklist
- [ ] Tokens appear word by word
- [ ] Blinking cursor visible while streaming
- [ ] Full message saved to DB after stream ends
- [ ] Falls back gracefully if streaming fails

---

## Phase 14 — Analytics Charts (2.5 Hours)

### Goal
Replace the static number cards with real visual charts using Recharts. Turns the Analytics tab from "data dump" to "executive dashboard".

### Install
```bash
npm install recharts
```

### Charts to Build

| Chart | Type | Data Source |
|---|---|---|
| Daily Conversations (last 7 days) | Area chart | `GET /analytics` daily_counts |
| Messages by Channel | Pie / Donut chart | Count conversations by channel |
| Lead Growth (last 7 days) | Bar chart | Leads created per day |
| Conversation Status Breakdown | Horizontal bar | active / lead / booked / escalated counts |

### Frontend Changes
- Import `AreaChart`, `BarChart`, `PieChart` from `recharts`
- Use cyan/emerald color palette to match existing theme
- Add `ResponsiveContainer` so charts resize properly
- Show tooltips on hover with exact numbers
- Keep existing stat cards above the charts

### Review Checklist
- [ ] All 4 charts render with real data
- [ ] Charts are responsive (resize on window change)
- [ ] Tooltips show on hover
- [ ] Colors match app theme
- [ ] No chart breaks when data is empty

---

## Phase 15 — Conversation Status Control + Escalate to Human (2 Hours)

### Goal
Let agents manually change conversation status from the inbox. Close the full workflow loop — AI sets status automatically, human can override.

### Status Options
```text
active  →  lead  →  booked  →  escalated  →  resolved
```

### Backend Changes
- Add `PATCH /conversations/{id}/status` endpoint
  - Accepts `{ "status": "escalated" }` (or any valid status)
  - Updates DB, returns updated conversation

### Frontend Changes

#### Status Dropdown in Chat Header
- Dropdown next to conversation name showing current status
- Click to change — calls `PATCH /conversations/{id}/status`
- Status badge colour updates instantly (optimistic UI)

#### Escalate to Human Button
- Red "Escalate to Human" button in chat header
- One click → sets status to `escalated` + fires matching workflow if one exists
- Inbox badge turns red for escalated conversations
- Toast: "Conversation escalated — human agent notified"

#### Status Badge Colours
```text
active     → blue
lead       → amber
booked     → emerald
escalated  → red
resolved   → neutral/grey
```

### Review Checklist
- [ ] Status dropdown works and persists
- [ ] Escalate button sets status to escalated instantly
- [ ] Badge colour matches status
- [ ] Workflow fires on escalation if rule exists
- [ ] Toast confirms the action

---

## Phase 16 — Polish: Skeletons, Empty States, Keyboard Nav (2 Hours)

### Goal
Production-grade feel — no blank flashes, no empty lists, keyboard-friendly.

### 16a — Loading Skeletons
Replace blank content during data fetch with animated skeleton loaders.

Components to add skeletons to:
- Conversation list (left sidebar)
- Analytics stat cards
- Leads table
- Bookings table

Skeleton style:
```tsx
<div className="animate-pulse rounded-md bg-neutral-200 h-4 w-3/4" />
```

### 16b — Empty States
When a list has no data, show a friendly message + action instead of nothing.

| Section | Empty State |
|---|---|
| Conversations | "No conversations yet. Share your widget to get started." + copy snippet button |
| Leads | "No leads captured yet. The AI will collect them automatically." |
| Bookings | "No bookings yet." |
| Knowledge Base | "No documents uploaded. Add your FAQs to make the AI smarter." + upload button |
| Workflow Logs | "No automations triggered yet." |

### 16c — Keyboard Navigation
- `↑` / `↓` arrow keys navigate conversations in the inbox list
- `Enter` opens the selected conversation
- `Escape` deselects / closes chat panel on mobile

### Review Checklist
- [ ] Skeletons appear on initial load, not blank
- [ ] All empty states have helpful copy + action
- [ ] Arrow key navigation works in conversation list
- [ ] No layout shift when data loads in

---

## Phase 17 — CSV Export for Leads (1 Hour)

### Goal
One-click download of all leads as a CSV file. Makes the Leads tab feel like a real CRM and is a common ask from any sales team.

### Frontend Changes
- Add "Export CSV" button in the Leads tab header
- On click, convert leads array to CSV string and trigger download

### CSV Columns
```text
Name, Email, Phone, Interest, Source Conversation, Captured At
```

### Implementation
```ts
function exportLeadsCSV(leads: Lead[]) {
  const header = "Name,Email,Phone,Interest,Conversation,Captured At";
  const rows = leads.map(l =>
    [l.customer_name, l.email, l.phone, l.interest, l.conversation_id, l.created_at]
      .map(v => `"${(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `omniflow-leads-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Review Checklist
- [ ] Button visible in Leads tab
- [ ] CSV downloads on click
- [ ] All columns present and correctly escaped
- [ ] Works with 0 leads (empty file with just header)

---

## Phase 18 — WhatsApp Integration (3 Hours)

### Goal
Real WhatsApp messages flow into the OmniFlow inbox and the AI replies back through WhatsApp — the #1 channel for Indian businesses.

### How It Works
```text
Customer sends WhatsApp message
          |
          v
Meta Webhooks  →  POST /webhooks/whatsapp  (your backend)
          |
          v
Normalise to OmniFlow message format
          |
          v
AI generates reply  (same pipeline as web chat)
          |
          v
POST to WhatsApp Cloud API  →  message delivered to customer
          |
          v
Conversation appears in Unified Inbox with 📱 WhatsApp badge
```

### Requirements
- Meta Developer Account (free)
- WhatsApp Business App
- WhatsApp Cloud API (free up to 1,000 conversations/month)
- Public URL for webhook (use `ngrok` for local dev)

### Backend Changes

#### New Webhook Endpoint
```python
POST /webhooks/whatsapp
```
- Verify webhook token (GET request from Meta during setup)
- Parse incoming message payload
- Create/find conversation by WhatsApp sender phone number
- Store message in DB with `channel = "whatsapp"`
- Trigger AI response
- Send reply via WhatsApp Cloud API `POST /messages`

#### New env vars
```text
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=omniflow_verify_2024
```

### Frontend Changes
- Conversation list shows 📱 WhatsApp channel badge
- No other changes needed — inbox works the same

### Review Checklist
- [ ] Webhook verification handshake works
- [ ] Incoming WhatsApp message appears in inbox
- [ ] AI reply is sent back via WhatsApp Cloud API
- [ ] Channel badge shows WhatsApp correctly
- [ ] Conversation persists across messages from same number

---

## Updated API Surface (Phase 13–18)

```text
PATCH  /conversations/{id}/status     ← Phase 15
GET    /messages/stream/{conv_id}     ← Phase 13 (SSE)
POST   /webhooks/whatsapp             ← Phase 18
GET    /webhooks/whatsapp             ← Phase 18 (verify)
```

---

## Priority Order for Day 4–5

### Day 4 (Core wow + data)
1. Phase 13 — Streaming AI responses
2. Phase 14 — Analytics charts
3. Phase 15 — Conversation status + Escalate button
4. Phase 17 — CSV export (quick win, 1 hour)

### Day 5 (Integrations + polish)
5. Phase 18 — WhatsApp integration
6. Phase 16 — Skeletons, empty states, keyboard nav

---

## Pitch-Ready Checklist

- [ ] Streaming AI responses live in demo
- [ ] Analytics charts showing real data
- [ ] Agent can manually escalate a conversation
- [ ] Leads exportable as CSV
- [ ] WhatsApp message flows into inbox
- [ ] All channel badges display correctly
- [ ] No blank loading states
- [ ] Empty states have helpful CTAs
- [ ] Demo script rehearsed end-to-end
