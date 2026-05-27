# OmniFlow AI — Implementation Plan
**Hackathon: SummerShip Challenge 2026 · Problem #05**
**Multi Channel Auto Reply, Calls & Business Automation Platform**

---

## Gap Summary

| Feature | Status |
|---|---|
| WhatsApp Automation | ✅ Done |
| Facebook Inbox Automation | ✅ Done |
| Website Chat Widget | ✅ Done |
| Unified Inbox | ✅ Done |
| AI Response Engine (RAG / Groq) | ✅ Done |
| Knowledge Base Training | ✅ Done |
| Lead Capture | ✅ Done |
| Booking Management | ✅ Done |
| Customer Data Collection | ✅ Done |
| Google Sheets Export | ✅ Done |
| Workflow Automation | ✅ Done |
| Analytics Dashboard | ✅ Done |
| **Instagram Auto Reply** | ❌ Missing |
| **AI Voice Call Automation** | ❌ Missing |
| **LinkedIn Messaging** | ❌ Missing |
| **Notifications** | ❌ Missing |
| **Team Assignment** | ❌ Missing |
| **CSV Export / CRM Integration** | ❌ Missing |
| **Real-time WebSocket Inbox** | ⚠️ Polling only |

---

## Phase 1 — Quick Wins
**Estimated Time: 1–2 hours | Impact: High | Effort: Low**
> These require no new APIs, no new dependencies — just wiring up existing data.

### 1.1 CSV Export (Leads + Bookings)
**Files:** `frontend/app/dashboard/page.tsx`, `backend/app/main.py`

**Backend — New Endpoints:**
```
GET /leads/export     → returns CSV file (text/csv)
GET /bookings/export  → returns CSV file (text/csv)
```
- Use Python's `csv` module + `StreamingResponse` with `text/csv` content-type
- Leads CSV headers: Name, Email, Phone, Interest, Channel, Captured At
- Bookings CSV headers: Name, Email, Slot, Channel, Booked At

**Frontend — UI Changes:**
- Add "Export CSV" button in the **Leads** tab toolbar (top-right)
- Add "Export CSV" button in the **Bookings** tab toolbar
- On click: `window.open(API_BASE + "/leads/export")` — triggers browser download
- No state changes needed

---

### 1.2 In-App Notifications
**Files:** `frontend/app/dashboard/page.tsx`

**What to notify:**
- 🔴 New **escalation** — conversation status flipped to `escalated`
- 🟢 New **lead** captured — conversation status flipped to `lead`
- 📅 New **booking** confirmed — conversation status flipped to `booked`

**Implementation (frontend-only, no backend changes):**
- Add `notifications: Notification[]` state in dashboard
- During each polling cycle (`fetchConversations` every 8s), diff previous vs new conversations
- If a conversation status changes → push a notification object `{ id, message, time, read }`
- Add a **bell icon** (🔔) in the dashboard top nav bar
- Show unread badge count (red dot) on bell
- On bell click → dropdown panel listing last 10 notifications with timestamp + "Mark all read" button
- Auto-mark read after 5 seconds if panel is open

**No backend changes needed** — all status data already exists in `/conversations`.

---

### 1.3 Team Assignment
**Files:** `backend/app/database.py`, `backend/app/main.py`, `frontend/app/dashboard/page.tsx`

**Backend Changes:**
- Add `assigned_to: str | None` column to `ConversationRow` (SQLAlchemy `Column(String, nullable=True)`)
- Add to `Conversation` Pydantic model: `assigned_to: str | None = None`
- Update `row_to_conversation()` converter to include `assigned_to`
- New endpoint: `PATCH /conversations/{id}/assign` body `{ "agent": "Priya" }`
- Hardcode agent roster: `["Priya", "Support Team", "Sales Team", "Unassigned"]`

**Frontend — Inbox UI:**
- In conversation detail panel: add "Assigned to" dropdown (agent roster list)
- Show assigned agent name as a small badge below the conversation name in the left list
- On dropdown change: call `PATCH /conversations/{id}/assign`
- Default: "Unassigned" for all conversations

---

## Phase 2 — Channel Expansion
**Estimated Time: 2–3 hours | Impact: High | Effort: Medium**

### 2.1 Instagram Auto Reply
**Files:** `backend/app/main.py`, `frontend/app/dashboard/page.tsx`

**Context:** `send_instagram_reply()` already exists in backend. Instagram uses the **same Meta webhook payload format** as Facebook. The only blocker is Meta requiring an Instagram Business Account with app review approval.

**Backend:**
- Add `GET /webhook/instagram` — verify token handshake (same pattern as `/webhook/facebook`)
- Add `POST /webhook/instagram` — handle incoming DMs:
  - Parse `entry[].messaging[]` from payload (identical to FB format)
  - Detect sender PSID, message text
  - Run through existing AI pipeline (`generate_ai_response`)
  - Save conversation with `channel="instagram"`
  - Call `send_instagram_reply(sender_id, reply)`
- Env vars required: `IG_PAGE_ACCESS_TOKEN`, `IG_VERIFY_TOKEN`
- Register webhook on Meta for Apps → Instagram → subscribe to `messages` field

**Frontend:**
- `instagram` already in `Channel` Literal type
- Add Instagram channel icon (Camera icon) and pink/purple badge color in inbox list
- Add `instagram` to channel filter dropdown in Inbox tab

**Disclaimer for Judges:** Meta requires Business Verification (7–14 day process) to receive live IG DMs. The full backend pipeline is implemented — demo via `curl POST /webhook/instagram` with a mock payload works end-to-end.

---

### 2.2 Real-Time Inbox via Server-Sent Events (SSE)
**Files:** `backend/app/main.py`, `frontend/app/dashboard/page.tsx`

**Why:** Problem statement explicitly lists "Unified Inbox WebSockets" as a key technology. Currently using `setInterval` polling (8s delay).

**Backend — SSE Endpoints:**
```python
GET /stream/conversations   → SSE stream, pushes updates on new message
GET /stream/messages/{id}   → SSE stream, pushes new messages for a conversation
```
- Use `asyncio.Queue` per connection
- When a new message is saved (in `POST /messages`), push to all active SSE queues
- `StreamingResponse` with `Content-Type: text/event-stream`
- Heartbeat ping every 30s to keep connection alive

**Frontend:**
- Replace `setInterval(fetchConversations, 8000)` with `new EventSource(API_BASE + "/stream/conversations")`
- On SSE event: parse JSON and update `conversations` state
- Replace message polling with `EventSource` on selected conversation
- Show "● LIVE" green indicator in inbox header when SSE is connected
- Fallback to polling if `EventSource` fails (browser compatibility)

**Alternative:** If SSE adds complexity, keep polling but reduce to 3s and add optimistic UI updates. Label it "near real-time" in the demo.

---

## Phase 3 — Voice & CRM
**Estimated Time: 3–5 hours | Impact: Very High | Effort: High**

### 3.1 AI Voice Call Automation (Twilio)
**Files:** `backend/app/main.py`, `backend/requirements.txt`

**New Dependencies:**
```
twilio>=9.0.0
```

**Call Flow:**
```
Incoming Call
   → Twilio routes to POST /voice/incoming
   → TwiML: <Say> greeting + <Gather> speech input
   → User speaks
   → Twilio sends speech transcript to POST /voice/transcribed
   → Backend: run transcript through generate_ai_response() (same RAG pipeline)
   → Return TwiML <Say> with AI response text
   → Caller hears the answer
   → Conversation + transcript logged in DB as channel="phone"
```

**New Endpoints:**

`POST /voice/incoming` — TwiML entry:
```xml
<Response>
  <Say voice="Polly.Joanna">
    Hi! You've reached OmniFlow AI. How can I help you today?
  </Say>
  <Gather input="speech" action="/voice/transcribed"
          timeout="5" speechTimeout="auto" language="en-US">
  </Gather>
  <Say>I didn't catch that. Please call again.</Say>
</Response>
```

`POST /voice/transcribed` — AI response:
- Receive `SpeechResult` (Twilio form field)
- Run through `generate_ai_response()` with `channel="phone"` conversation
- Return TwiML `<Say>` with the reply
- Loop back to `<Gather>` for multi-turn conversation support
- Save full transcript as messages in DB

**Environment Variables:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

**Twilio Setup Steps:**
1. Create Twilio account at twilio.com (free trial gives $15 credit)
2. Buy a phone number (~$1/mo, free with trial)
3. Set webhook URL: `POST https://omniflow-api.onrender.com/voice/incoming`
4. Set under Phone Numbers → Manage → A Call Comes In

**Frontend:**
- Add `phone` to `Channel` Literal type
- Show phone/call icon for voice-originated conversations in inbox
- Transcript appears as chat messages (AI side = AI responses, user side = speech transcripts)
- Add "📞 Phone" to channel filter

---

### 3.2 Enhanced CRM Integration
**Files:** `backend/app/main.py`, `frontend/app/dashboard/page.tsx`

**Layer 1 — CSV Export** (Phase 1.1 already covers this)

**Layer 2 — Improved Google Sheets Sync:**
- Currently only syncs leads on create; extend to sync bookings too
- Add `POST /integrations/sheets/sync` — manual full re-sync of ALL leads + bookings to Sheets
- Add "Sync to Sheets" button in Settings tab

**Layer 3 — HubSpot CRM Push (stretch goal):**
- On lead create, push to HubSpot: `POST https://api.hubapi.com/crm/v3/objects/contacts`
- Map fields: email → email, customer_name → firstname, phone → phone, interest → jobtitle
- Env var: `HUBSPOT_API_KEY`
- Falls back silently if key not set

**Frontend — Settings Tab Integration Panel:**
- Add "Integrations" section in Settings
- Google Sheets: show connection status + "Sync Now" button + last sync timestamp
- HubSpot: "Connect" button → input field for API key → save to backend env
- CSV: direct download buttons for Leads and Bookings

---

## Phase 4 — LinkedIn & Final Polish
**Estimated Time: 1–2 hours | Impact: Medium | Effort: Low**

### 4.1 LinkedIn Messaging
**Context:** LinkedIn's Messaging API requires an **official LinkedIn Partner** status (weeks-long approval). Real integration is not feasible for this hackathon.

**Strategy — Architecture-Ready Stub:**

**Backend:**
- Add `linkedin` to `Channel` Literal type
- Add placeholder `POST /webhook/linkedin` that accepts a message payload and stores it as a conversation with `channel="linkedin"`
- Add `GET /debug/linkedin` that returns API status info

**Frontend:**
- Add LinkedIn channel option in inbox filter (LinkedIn icon, blue badge)
- Add a LinkedIn seed conversation in the dashboard
- In Settings tab: add "Connect LinkedIn" card → clicking shows modal:
  > *"LinkedIn Partner API access is pending approval. The integration architecture is complete and ready to activate once approved. Expected: Q3 2026."*

**Demo Script:** Show the LinkedIn channel in the inbox filter, explain the architecture, and note the approval wall — judges understand API restrictions.

---

### 4.2 Final Polish & Demo Preparation

**UI Polish:**
- [ ] Replace spinners with skeleton loading screens in all tabs
- [ ] Add empty state screens with helpful CTAs:
  - No leads yet → "Start a conversation to capture your first lead"
  - No bookings → "Ask the AI to help book an appointment"
  - No workflows → "Create your first automation rule"
- [ ] Audit mobile responsiveness of dashboard
- [ ] Verify all channel color badges are consistent

**Demo Data:**
- [ ] Seed conversations for all 5 channels: website, whatsapp, facebook, instagram, phone (+ linkedin stub)
- [ ] Pre-upload NovaTech Solutions KB document on production DB
- [ ] Verify all 3 default workflows are active on production
- [ ] Clear any test junk data from production DB before recording

**Token Refresh Checklist (before video):**
- [ ] Refresh `WHATSAPP_ACCESS_TOKEN` in Render env vars
- [ ] Refresh `FB_PAGE_ACCESS_TOKEN` in Render env vars
- [ ] Call `POST /debug/facebook/subscribe` to re-subscribe FB webhook
- [ ] Verify `GET /debug/whatsapp` returns `status: ok`
- [ ] Verify `GET /debug/facebook` returns `status: ok` with subscriptions

**Video Recording (max 2 min):**
1. Show landing page + chat widget
2. Show unified inbox (all channels)
3. Demo WhatsApp live reply
4. Demo Facebook live reply
5. Show Knowledge Base (NovaTech KB loaded)
6. Show Lead auto-capture
7. Show Booking via chat
8. Show Workflows running
9. Show Analytics dashboard
10. Show Notifications + Team Assignment
11. Mention: Instagram (architecture ready), LinkedIn (approval pending), Voice (Twilio live)

---

## Implementation Order

```
Day 1 (Today)
├── Phase 1.1 — CSV Export           (~30 min)
├── Phase 1.2 — Notifications         (~45 min)
├── Phase 1.3 — Team Assignment       (~45 min)
└── Phase 4.1 — LinkedIn UI stub      (~30 min)
                                     Total: ~2.5 hrs

Day 2
├── Phase 2.1 — Instagram webhook     (~60 min)
├── Phase 2.2 — SSE Real-time inbox   (~90 min)
└── Phase 3.2 — CRM improvements     (~60 min)
                                     Total: ~3.5 hrs

Day 3
├── Phase 3.1 — Twilio Voice          (~3–4 hrs)
└── Phase 4.2 — Polish + Video        (~2 hrs)
                                     Total: ~5–6 hrs
```

---

## Projected Feature Completion After All Phases

| Feature | Before | After |
|---|---|---|
| WhatsApp Automation | ✅ | ✅ |
| Facebook Inbox Automation | ✅ | ✅ |
| Website Chat Widget | ✅ | ✅ |
| Instagram Auto Reply | ❌ | ✅ Phase 2.1 |
| LinkedIn Messaging | ❌ | ⚠️ Phase 4.1 (UI + stub) |
| AI Voice Call Automation | ❌ | ✅ Phase 3.1 |
| Unified Inbox | ✅ | ✅ |
| AI Response Engine (RAG) | ✅ | ✅ |
| Knowledge Base Training | ✅ | ✅ |
| Lead Capture | ✅ | ✅ |
| Booking Management | ✅ | ✅ |
| Customer Data Collection | ✅ | ✅ |
| Sheet Export / CRM | ✅ | ✅ Phase 3.2 |
| Analytics Dashboard | ✅ | ✅ |
| Notifications | ❌ | ✅ Phase 1.2 |
| Team Assignment | ❌ | ✅ Phase 1.3 |
| Workflow Automation | ✅ | ✅ |
| Real-Time WebSocket | ⚠️ | ✅ Phase 2.2 |

**Projected score: 17/18 features complete (94%)**
LinkedIn is the only feature blocked by an external API approval process.

---

## Environment Variables Checklist

| Variable | Used For | Status |
|---|---|---|
| `GROQ_API_KEY` | AI responses | ✅ Set |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp | ✅ Set (expires 24h) |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp | ✅ Set (expires 24h) |
| `FB_PAGE_ACCESS_TOKEN` | Facebook | ✅ Set (expires 24h) |
| `IG_PAGE_ACCESS_TOKEN` | Instagram | ❌ Needed |
| `IG_VERIFY_TOKEN` | Instagram | ❌ Needed |
| `TWILIO_ACCOUNT_SID` | Voice calls | ❌ Needed |
| `TWILIO_AUTH_TOKEN` | Voice calls | ❌ Needed |
| `TWILIO_PHONE_NUMBER` | Voice calls | ❌ Needed |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Sheets sync | ⚠️ Optional |
| `GOOGLE_SHEETS_ID` | Sheets sync | ⚠️ Optional |
| `HUBSPOT_API_KEY` | CRM push | ❌ Optional stretch |

---

*Last updated: 2026-05-27*
*Hackathon: SummerShip Challenge 2026 · Problem Code #05*
