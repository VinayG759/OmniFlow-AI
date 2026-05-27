import csv
import io
import json
import os
import re
import time
import requests as http_requests
from contextlib import asynccontextmanager
from io import BytesIO
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response, StreamingResponse
from sqlalchemy import text as sa_text
from groq import Groq
from openai import OpenAI
from pypdf import PdfReader
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# Load .env BEFORE importing database (which creates the SQLAlchemy engine at
# module level and reads DATABASE_URL from the environment).
_env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

from app.database import (  # noqa: E402
    Base,
    BookingRow,
    ConversationRow,
    DocumentRow,
    KnowledgeChunkRow,
    LeadRow,
    MessageRow,
    SessionLocal,
    WorkflowLogRow,
    WorkflowRow,
    engine,
    get_db,
)

# ── AI client setup ───────────────────────────────────────────────────────────

ai_provider    = os.getenv("AI_PROVIDER", "mock").lower()
openai_model   = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
openai_api_key = os.getenv("OPENAI_API_KEY")
openai_client  = OpenAI(api_key=openai_api_key) if openai_api_key else None
groq_model     = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
groq_api_key   = os.getenv("GROQ_API_KEY")
groq_client    = Groq(api_key=groq_api_key) if groq_api_key else None

# ── WhatsApp Cloud API config ─────────────────────────────────────────────────

wa_phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
wa_access_token    = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
wa_verify_token    = os.getenv("WHATSAPP_VERIFY_TOKEN", "omniflow-webhook-secret")

# ── Facebook Messenger config ─────────────────────────────────────────────────

fb_page_access_token = os.getenv("FB_PAGE_ACCESS_TOKEN", "")
fb_verify_token      = os.getenv("FB_VERIFY_TOKEN", "omniflow-fb-secret")

# ── Instagram Messaging config ────────────────────────────────────────────────

ig_page_access_token = os.getenv("IG_PAGE_ACCESS_TOKEN", "")
ig_verify_token      = os.getenv("IG_VERIFY_TOKEN", "omniflow-ig-secret")

# ── Google Sheets config ──────────────────────────────────────────────────────

gs_credentials_path = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
gs_sheet_id         = os.getenv("GOOGLE_SHEETS_ID", "")


def send_whatsapp_reply(to: str, body: str) -> None:
    """Send a WhatsApp text message back to the customer via the Cloud API."""
    if not wa_phone_number_id or not wa_access_token:
        return  # credentials not configured — skip silently
    try:
        http_requests.post(
            f"https://graph.facebook.com/v18.0/{wa_phone_number_id}/messages",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {wa_access_token}",
            },
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": body},
            },
            timeout=10,
        )
    except Exception:
        pass  # never crash the webhook handler if the outbound call fails


def send_facebook_reply(recipient_psid: str, body: str) -> None:
    """Send a Facebook Messenger reply via the Graph API."""
    if not fb_page_access_token:
        return
    try:
        http_requests.post(
            "https://graph.facebook.com/v18.0/me/messages",
            params={"access_token": fb_page_access_token},
            json={
                "recipient": {"id": recipient_psid},
                "message": {"text": body},
            },
            timeout=10,
        )
    except Exception:
        pass


def send_instagram_reply(recipient_id: str, body: str) -> None:
    """Send an Instagram DM reply via the Graph API."""
    if not ig_page_access_token:
        return
    try:
        http_requests.post(
            "https://graph.facebook.com/v18.0/me/messages",
            params={"access_token": ig_page_access_token},
            json={
                "recipient": {"id": recipient_id},
                "message": {"text": body},
            },
            timeout=10,
        )
    except Exception:
        pass


def sync_lead_to_sheets(lead_row) -> None:
    """Auto-append a newly captured lead to Google Sheets (if configured)."""
    if not gs_credentials_path or not gs_sheet_id:
        return
    try:
        import gspread
        from google.oauth2.service_account import Credentials as GCredentials
        creds = GCredentials.from_service_account_file(
            gs_credentials_path,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        gc = gspread.authorize(creds)
        ws = gc.open_by_key(gs_sheet_id).sheet1
        # Add header row if the sheet is empty
        if not ws.get_all_values():
            ws.append_row(["Name", "Email", "Phone", "Interest", "Channel", "Captured At"])
        ws.append_row([
            lead_row.customer_name or "",
            lead_row.email or "",
            lead_row.phone or "",
            lead_row.interest or "",
            lead_row.channel or "",
            lead_row.created_at or "",
        ])
    except Exception:
        pass  # Sheets sync is optional — never crash the main flow


# ── Pydantic response schemas ─────────────────────────────────────────────────

Sender             = Literal["user", "ai", "human"]
Channel            = Literal["website", "whatsapp", "email", "facebook", "instagram"]
ConversationStatus = Literal["active", "lead", "booked", "escalated"]


class Conversation(BaseModel):
    id: str
    customer_name: str
    channel: Channel
    status: ConversationStatus
    last_message: str
    updated_at: str
    unread_count: int = 0
    assigned_to: str | None = None


class Message(BaseModel):
    id: str
    conversation_id: str
    sender: Sender
    body: str
    created_at: str


class MessageCreate(BaseModel):
    conversation_id: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1, max_length=2000)


class Document(BaseModel):
    id: str
    name: str
    kind: str
    chunk_count: int
    created_at: str


class KnowledgeChunk(BaseModel):
    id: str
    document_id: str
    document_name: str
    text: str


class Lead(BaseModel):
    id: str
    conversation_id: str
    customer_name: str
    email: str
    phone: str
    interest: str
    channel: Channel
    created_at: str


class LeadCreate(BaseModel):
    conversation_id: str = Field(..., min_length=1)
    customer_name:   str = Field(..., min_length=1, max_length=120)
    email:           str = Field(..., min_length=5, max_length=254)
    phone:           str = Field(default="", max_length=30)
    interest:        str = Field(default="General inquiry", max_length=120)


class Booking(BaseModel):
    id: str
    conversation_id: str
    customer_name: str
    email: str
    slot: str
    channel: Channel
    created_at: str


WorkflowCondition = Literal["contains", "equals", "starts_with"]
WorkflowAction    = Literal["escalate", "send_reply", "tag_lead"]


class Workflow(BaseModel):
    id:           str
    name:         str
    trigger:      str
    condition:    WorkflowCondition
    action:       WorkflowAction
    action_value: str
    enabled:      bool
    created_at:   str


class WorkflowCreate(BaseModel):
    name:         str = Field(..., min_length=1, max_length=120)
    trigger:      str = Field(..., min_length=1, max_length=120)
    condition:    WorkflowCondition = "contains"
    action:       WorkflowAction
    action_value: str = Field(default="", max_length=500)


class WorkflowLog(BaseModel):
    id:              str
    workflow_id:     str
    workflow_name:   str
    conversation_id: str
    triggered_by:    str
    action_taken:    str
    created_at:      str


class DailyCount(BaseModel):
    date:  str
    count: int


class NameValue(BaseModel):
    name:  str
    value: int


class AnalyticsSummary(BaseModel):
    total_conversations: int
    ai_replies:          int
    leads:               int
    bookings:            int
    escalations:         int
    daily_conversations: list[DailyCount]
    lead_growth:         list[DailyCount]
    channel_breakdown:   list[NameValue]
    status_breakdown:    list[NameValue]


# ── ORM row → Pydantic converters ─────────────────────────────────────────────

def row_to_conversation(r: ConversationRow) -> Conversation:
    return Conversation(
        id=r.id, customer_name=r.customer_name, channel=r.channel,
        status=r.status, last_message=r.last_message or "",
        updated_at=r.updated_at, unread_count=r.unread_count or 0,
        assigned_to=r.assigned_to or None,
    )

def row_to_message(r: MessageRow) -> Message:
    return Message(
        id=r.id, conversation_id=r.conversation_id,
        sender=r.sender, body=r.body, created_at=r.created_at,
    )

def row_to_document(r: DocumentRow) -> Document:
    return Document(
        id=r.id, name=r.name, kind=r.kind,
        chunk_count=r.chunk_count or 0, created_at=r.created_at,
    )

def row_to_chunk(r: KnowledgeChunkRow) -> KnowledgeChunk:
    return KnowledgeChunk(
        id=r.id, document_id=r.document_id,
        document_name=r.document_name, text=r.text,
    )

def row_to_lead(r: LeadRow) -> Lead:
    return Lead(
        id=r.id, conversation_id=r.conversation_id,
        customer_name=r.customer_name, email=r.email,
        phone=r.phone or "", interest=r.interest or "General inquiry",
        channel=r.channel, created_at=r.created_at,
    )

def row_to_booking(r: BookingRow) -> Booking:
    return Booking(
        id=r.id, conversation_id=r.conversation_id,
        customer_name=r.customer_name, email=r.email or "",
        slot=r.slot, channel=r.channel, created_at=r.created_at,
    )

def row_to_workflow(r: WorkflowRow) -> Workflow:
    return Workflow(
        id=r.id, name=r.name, trigger=r.trigger,
        condition=r.condition, action=r.action,
        action_value=r.action_value or "",
        enabled=bool(r.enabled), created_at=r.created_at,
    )

def row_to_workflow_log(r: WorkflowLogRow) -> WorkflowLog:
    return WorkflowLog(
        id=r.id, workflow_id=r.workflow_id,
        workflow_name=r.workflow_name,
        conversation_id=r.conversation_id,
        triggered_by=r.triggered_by,
        action_taken=r.action_taken,
        created_at=r.created_at,
    )


# ── Utilities ─────────────────────────────────────────────────────────────────

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Document / Knowledge Base helpers ─────────────────────────────────────────

def chunk_text(text: str, max_words: int = 90) -> list[str]:
    """Split text into sentence-aware chunks without breaking mid-sentence."""
    clean = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=[.!?])\s+", clean)
    chunks: list[str] = []
    current: list[str] = []
    for sentence in sentences:
        words = sentence.split()
        if current and len(current) + len(words) > max_words:
            chunks.append(" ".join(current))
            current = words
        else:
            current.extend(words)
    if current:
        chunks.append(" ".join(current))
    return chunks


def score_chunk(query: str, chunk: KnowledgeChunk) -> int:
    query_terms = {t for t in re.findall(r"[a-z0-9]+", query.lower()) if len(t) > 2}
    chunk_terms = set(re.findall(r"[a-z0-9]+", chunk.text.lower()))
    return len(query_terms & chunk_terms)


def retrieve_knowledge(query: str, db: Session, limit: int = 3) -> list[KnowledgeChunk]:
    rows = db.query(KnowledgeChunkRow).all()
    chunks = [row_to_chunk(r) for r in rows]
    scored = [(score_chunk(query, c), c) for c in chunks]
    return [
        c for score, c in sorted(scored, key=lambda x: x[0], reverse=True)
        if score > 0
    ][:limit]


def build_context(chunks: list[KnowledgeChunk]) -> str:
    if not chunks:
        return ""
    return "\n\n".join(f"Source: {c.document_name}\n{c.text}" for c in chunks)


def ingest_document(name: str, kind: str, text: str, db: Session) -> Document:
    """Chunk and persist a document; returns the Pydantic Document."""
    document_id = str(uuid4())
    chunks = chunk_text(text)
    doc_row = DocumentRow(
        id=document_id, name=name, kind=kind,
        chunk_count=len(chunks), created_at=utc_now(),
    )
    db.add(doc_row)
    for i, chunk in enumerate(chunks):
        db.add(KnowledgeChunkRow(
            id=f"{document_id}_{i}",
            document_id=document_id,
            document_name=name,
            text=chunk,
        ))
    db.commit()
    return row_to_document(doc_row)


def answer_from_context(user_message: str, chunks: list[KnowledgeChunk]) -> str | None:
    if not chunks:
        return None
    context = chunks[0].text.strip()
    lower = user_message.lower()
    sentences = [s.strip() for s in re.split(r"\.\s+|\n", context) if s.strip()]
    matching: list[str] = []
    if any(t in lower for t in ["price", "pricing", "cost", "plan", "subscription"]):
        matching = [s for s in sentences if any(t in s.lower() for t in ["price", "pricing", "plan", "cost", "starter", "growth", "business"])]
    elif any(t in lower for t in ["hour", "open", "support", "time", "timezone", "ist", "schedule"]):
        matching = [s for s in sentences if any(t in s.lower() for t in ["hour", "open", "support", "monday", "friday", "time", "ist"])]
    elif any(t in lower for t in ["service", "offer", "feature", "do you", "whatsapp", "inbox", "escalation"]):
        matching = [s for s in sentences if any(t in s.lower() for t in ["service", "offer", "feature", "whatsapp", "inbox", "escalation", "platform", "lead"])]
    if not matching:
        q_terms = [t for t in re.findall(r"[a-z0-9]+", lower) if len(t) > 3]
        matching = [s for s in sentences if any(t in s.lower() for t in q_terms)]
    if matching:
        body = ". ".join(matching)
        return f"Based on our knowledge base: {body}{'.' if not body.endswith('.') else ''}"
    fallback = ". ".join(sentences[:2])
    return f"Based on our knowledge base: {fallback}{'.' if not fallback.endswith('.') else ''}"


# ── Lead extraction helpers ───────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"(?:\+?[\d][\d\s\-\(\)]{6,14}[\d])")
_NAME_PATTERNS = [
    re.compile(r"(?:my name is|i am|i'm|this is|name\s*[:\-]?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", re.IGNORECASE),
    re.compile(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$", re.IGNORECASE | re.MULTILINE),
]


def extract_email(text: str) -> str | None:
    m = _EMAIL_RE.search(text)
    return m.group(0).lower() if m else None


def extract_phone(text: str) -> str:
    m = _PHONE_RE.search(text)
    if not m:
        return ""
    digits = re.sub(r"[^\d+]", "", m.group(0))
    return digits if len(digits) >= 7 else ""


def extract_name_from_text(text: str) -> str | None:
    for pattern in _NAME_PATTERNS:
        m = pattern.search(text)
        if m:
            raw = m.group(1).strip()
            name_words: list[str] = []
            for word in raw.split():
                if word[0].isupper():
                    name_words.append(word)
                else:
                    break
            name = " ".join(name_words)
            if 2 <= len(name) <= 80:
                return name
    return None


def detect_interest(user_texts: str) -> str:
    lower = user_texts.lower()
    if any(t in lower for t in ["demo", "walk", "walkthrough", "show me"]):
        return "Demo request"
    if any(t in lower for t in ["book", "appointment", "schedule", "meeting", "slot"]):
        return "Appointment booking"
    if any(t in lower for t in ["price", "pricing", "cost", "plan", "subscription"]):
        return "Pricing inquiry"
    if any(t in lower for t in ["refund", "billing", "invoice", "charge"]):
        return "Billing / refund"
    if any(t in lower for t in ["integrat", "api", "webhook", "connect"]):
        return "Integration inquiry"
    return "General inquiry"


def try_capture_lead(
    conv_row: ConversationRow,
    user_message: str,
    history: list[Message],
    db: Session,
) -> LeadRow | None:
    """Stage a new lead row (caller must db.commit()).
    Returns None if no email found or duplicate detected."""
    email = extract_email(user_message)
    if not email:
        for msg in reversed(history[-8:]):
            if msg.sender == "user":
                found = extract_email(msg.body)
                if found:
                    email = found
                    break
    if not email:
        return None
    if "@" not in email or "." not in email.split("@", 1)[-1]:
        return None
    # Duplicate guard — check committed state
    if db.query(LeadRow).filter(LeadRow.email == email).first():
        return None

    name = extract_name_from_text(user_message)
    if not name:
        for msg in reversed(history[-10:]):
            if msg.sender == "user":
                name = extract_name_from_text(msg.body)
                if name:
                    break
    name = name or conv_row.customer_name

    phone = extract_phone(user_message)
    if not phone:
        for msg in reversed(history[-10:]):
            if msg.sender == "user":
                phone = extract_phone(msg.body)
                if phone:
                    break

    all_user_text = " ".join(m.body for m in history if m.sender == "user") + " " + user_message
    lead_row = LeadRow(
        id=str(uuid4()),
        conversation_id=conv_row.id,
        customer_name=name,
        email=email,
        phone=phone,
        interest=detect_interest(all_user_text),
        channel=conv_row.channel,
        created_at=utc_now(),
    )
    db.add(lead_row)
    conv_row.status = "lead"
    return lead_row


# ── Escalation helpers ───────────────────────────────────────────────────────

_ESCALATION_TRIGGERS: frozenset[str] = frozenset([
    "refund", "billing", "invoice", "charge", "fraud", "scam",
    "urgent", "asap", "emergency", "angry", "furious", "terrible",
    "worst", "lawsuit", "legal", "hate", "disgusting",
])


def should_auto_escalate(user_message: str, ai_body: str) -> bool:
    """Return True if this exchange should be escalated to a human agent."""
    lower = user_message.lower()
    if any(t in lower for t in _ESCALATION_TRIGGERS):
        return True
    ai_lower = ai_body.lower()
    if "escalating" in ai_lower or "human teammate" in ai_lower or "human agent" in ai_lower:
        return True
    return False


def run_workflows(
    user_message: str,
    conv_row: ConversationRow,
    db: Session,
) -> dict:
    """
    Run all enabled workflow rules against user_message in order.
    Mutates conv_row.status when tag_lead or escalate fires.
    Stages WorkflowLogRow objects (caller must db.commit()).

    Returns:
        {"escalated": bool, "custom_reply": str | None}
    """
    result: dict = {"escalated": False, "custom_reply": None}
    workflows = (
        db.query(WorkflowRow)
        .filter(WorkflowRow.enabled == True)  # noqa: E712
        .order_by(WorkflowRow.created_at)
        .all()
    )

    for wf in workflows:
        msg_lower     = user_message.lower()
        trigger_lower = wf.trigger.lower()

        if wf.condition == "contains":
            matched = trigger_lower in msg_lower
        elif wf.condition == "equals":
            matched = msg_lower.strip() == trigger_lower
        elif wf.condition == "starts_with":
            matched = msg_lower.startswith(trigger_lower)
        else:
            matched = False

        if not matched:
            continue

        if wf.action == "escalate":
            conv_row.status  = "escalated"
            result["escalated"] = True
            action_desc = "Escalated to human agent"
        elif wf.action == "send_reply":
            result["custom_reply"] = wf.action_value
            action_desc = "Sent custom reply"
        elif wf.action == "tag_lead":
            if conv_row.status not in {"booked", "escalated"}:
                conv_row.status = "lead"
            action_desc = "Tagged as lead"
        else:
            action_desc = "Unknown action skipped"

        db.add(WorkflowLogRow(
            id=str(uuid4()),
            workflow_id=wf.id,
            workflow_name=wf.name,
            conversation_id=conv_row.id,
            triggered_by=user_message[:200],
            action_taken=action_desc,
            created_at=utc_now(),
        ))

        if result["escalated"]:
            break  # escalation is terminal — stop processing further rules

    return result


# ── Booking helpers ───────────────────────────────────────────────────────────

_SLOT_TIMES = ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"]

_BOOKING_INTENT_TERMS = frozenset([
    "book", "appointment", "schedule", "meeting", "slot", "available",
    "when can", "what time", "calendar", "reserve", "demo",
])

_TIME_MATCH_RE = re.compile(
    r"\b(1[0-2]|[1-9])(?::[0-5]\d)?\s*([ap]m)\b",
    re.IGNORECASE,
)


def generate_slots_for_days(days: int = 3) -> list[str]:
    today = datetime.now(timezone.utc)
    slots: list[str] = []
    for offset in range(days):
        day = today + timedelta(days=offset)
        day_label = "Today" if offset == 0 else "Tomorrow" if offset == 1 else day.strftime("%A")
        date_str = day.strftime("%b %d")
        for t in _SLOT_TIMES:
            slots.append(f"{day_label} ({date_str}) at {t}")
    return slots


def get_available_slots(db: Session) -> list[str]:
    booked = {r.slot for r in db.query(BookingRow).all()}
    return [s for s in generate_slots_for_days(3) if s not in booked]


def has_booking_intent(message: str) -> bool:
    lower = message.lower()
    return any(t in lower for t in _BOOKING_INTENT_TERMS)


def detect_slot_from_message(message: str, available_slots: list[str]) -> str | None:
    """Match a user-stated time to the earliest matching available slot."""
    m = _TIME_MATCH_RE.search(message)
    if not m:
        return None
    hour = int(m.group(1))
    period = m.group(2).upper()
    time_str = f"{hour}:00 {period}"
    lower = message.lower()
    day_filter = "Tomorrow" if "tomorrow" in lower else "Today" if "today" in lower else None
    if day_filter:
        for slot in available_slots:
            if slot.startswith(day_filter) and time_str in slot:
                return slot
    for slot in available_slots:
        if time_str in slot:
            return slot
    return None


# ── AI response helpers ───────────────────────────────────────────────────────

_FACTUAL_QUERY_TERMS: frozenset[str] = frozenset([
    "price", "pricing", "cost", "plan", "starter", "growth", "business",
    "hour", "open", "support", "time", "timezone", "ist",
    "service", "offer", "feature", "do you", "can you", "integrate", "integration",
    "refund", "return", "policy", "address", "location", "contact",
    "trial", "free trial", "discount", "enterprise", "warranty",
])

_NO_CONTEXT_REPLY = (
    "I do not have enough information in my knowledge base to answer that. "
    "Please upload or seed relevant documents containing this information."
)


def is_factual_business_query(message: str) -> bool:
    lower = message.lower()
    return any(t in lower for t in _FACTUAL_QUERY_TERMS)


def build_conversation_transcript(history: list[Message], latest_message: str) -> str:
    lines = [f"{m.sender.upper()}: {m.body}" for m in history[-8:]]
    lines.append(f"USER: {latest_message}")
    return "\n".join(lines)


_GREETINGS: frozenset[str] = frozenset([
    "hi", "hello", "hey", "howdy", "sup", "yo",
    "good morning", "good afternoon", "good evening", "good day",
    "hi there", "hello there", "hey there",
    "thanks", "thank you", "thank you so much", "thx", "ty",
    "how are you", "how are you doing", "how's it going",
    "nice", "great", "ok", "okay", "cool", "awesome", "got it",
])


def mock_ai_response(
    user_message: str,
    history: list[Message] | None = None,
    context_chunks: list[KnowledgeChunk] | None = None,
    available_slots: list[str] | None = None,
) -> str:
    message = user_message.lower().strip().rstrip("!?.")
    user_history = [m.body for m in (history or []) if m.sender == "user"]
    context_answer = answer_from_context(user_message, context_chunks or [])

    # ── Greetings and small talk — respond naturally, no booking push ──
    if message in _GREETINGS or len(message.split()) <= 3 and not any(
        t in message for t in ["book", "price", "demo", "refund", "slot", "schedule"]
    ):
        greet_responses = [
            "Hi there! 👋 How can I help you today?",
            "Hello! How can I assist you today?",
            "Hey! What can I help you with?",
        ]
        import hashlib
        idx = int(hashlib.md5(user_message.encode()).hexdigest(), 16) % len(greet_responses)
        return greet_responses[idx]

    if "previous question" in message or "last question" in message:
        if user_history:
            return f'Your previous question was: "{user_history[-1]}"'
        return "I do not see an earlier question in this conversation yet."

    if context_answer:
        return context_answer

    is_factual = any(t in message for t in [
        "price", "pricing", "cost", "plan", "starter", "growth", "business",
        "hour", "open", "support", "time", "timezone", "ist",
        "service", "offer", "feature", "do you", "can you", "integrate", "integration",
        "refund", "return", "policy", "address", "location", "contact",
    ])
    if is_factual:
        return _NO_CONTEXT_REPLY

    if any(t in message for t in ["demo", "appointment", "book", "schedule", "slot", "available", "calendar"]):
        if available_slots:
            slot_list = "\n".join(f"• {s}" for s in available_slots[:6])
            return f"Here are the available appointment slots:\n{slot_list}\n\nWhich time works best for you?"
        return "Absolutely. I can help schedule a demo. Could you share your name, email, and preferred time?"

    if "refund" in message or "urgent" in message or "angry" in message:
        return "I understand this needs attention. I am escalating this conversation to a human teammate now."

    return (
        "Thanks for reaching out! How can I help you today? "
        "I can assist with product questions, pricing, booking a demo, or escalating to a human."
    )


def generate_ai_response(
    user_message: str,
    history: list[Message],
    context_chunks: list[KnowledgeChunk],
    available_slots: list[str] | None = None,
) -> tuple[str, str]:
    """Generate an AI reply. Returns (reply_text, provider_name)."""
    knowledge_context = build_context(context_chunks)

    # Hard code-level guard: no KB context + factual question → avoid hallucination
    if not context_chunks and is_factual_business_query(user_message):
        return _NO_CONTEXT_REPLY, "mock"

    instructions = (
        "You are OmniFlow AI, a helpful business assistant inside a unified inbox. "
        "Keep replies under 90 words and match the tone of the user's message. "

        # ── Greeting / small-talk rule (highest priority) ──
        "IMPORTANT: If the user's latest message is a greeting or casual small talk "
        "(e.g. 'hi', 'hello', 'hey', 'how are you', 'good morning', 'thanks', etc.), "
        "respond warmly and ask how you can help — do NOT mention bookings, time slots, "
        "demos, or any business topic unless the user brought it up first. "

        # ── Booking rule ──
        "ONLY present booking slots when AVAILABLE BOOKING SLOTS are listed in the "
        "conversation AND the user's latest message explicitly asks to book, schedule, "
        "or check availability. Never offer or mention slots for greetings or unrelated messages. "

        # ── Knowledge base rule ──
        "When a KNOWLEDGE BASE CONTEXT section is present, answer ONLY from that "
        "context. Do not add facts from training data. If the context is insufficient, "
        "say exactly: 'I do not have enough information in my knowledge base to answer "
        "that. Please upload or seed relevant documents.' "

        # ── Escalation rule ──
        "If the user sounds angry or asks for a refund, acknowledge the issue and say "
        "you are escalating to a human agent. "

        "Never invent pricing, trial periods, policies, or any business details not "
        "explicitly stated in the provided context."
    )

    transcript = build_conversation_transcript(history, user_message)

    if available_slots:
        slots_text = "\n".join(f"- {s}" for s in available_slots[:8])
        transcript = f"AVAILABLE BOOKING SLOTS:\n{slots_text}\n\n{transcript}"

    if knowledge_context:
        transcript = f"KNOWLEDGE BASE CONTEXT:\n{knowledge_context}\n\nCONVERSATION:\n{transcript}"

    if ai_provider == "groq" and groq_client is not None:
        try:
            completion = groq_client.chat.completions.create(
                model=groq_model,
                messages=[
                    {"role": "system", "content": instructions},
                    {"role": "user", "content": transcript},
                ],
                max_tokens=180,
                temperature=0.4,
            )
            text = completion.choices[0].message.content or ""
            return (
                text.strip() or mock_ai_response(user_message, history, context_chunks, available_slots),
                "groq",
            )
        except Exception:
            return mock_ai_response(user_message, history, context_chunks, available_slots), "mock"

    if ai_provider != "openai" or openai_client is None:
        return mock_ai_response(user_message, history, context_chunks, available_slots), "mock"

    try:
        response = openai_client.responses.create(
            model=openai_model,
            instructions=instructions,
            input=transcript,
            max_output_tokens=180,
        )
        text = response.output_text.strip()
        return (
            text or mock_ai_response(user_message, history, context_chunks, available_slots),
            "openai",
        )
    except Exception:
        return mock_ai_response(user_message, history, context_chunks, available_slots), "mock"


# ── Seed data ─────────────────────────────────────────────────────────────────

_FAQ_TEXT = """
    OmniFlow AI is a multi-channel business automation platform for website chat,
    WhatsApp-style conversations, shared inbox workflows, lead capture, appointment
    booking, and human escalation. Pricing plans include Starter at $49 per month,
    Growth at $149 per month, and Business at $399 per month. The Starter plan
    includes AI chat, unified inbox, and basic lead capture. Growth adds knowledge
    base RAG, appointment booking, workflow automation, and analytics. Business adds
    priority support, advanced integrations, and custom automation. Business hours
    are Monday to Friday, 9 AM to 6 PM IST. Refund or urgent billing requests should
    be escalated to a human support teammate.
"""


def _seed_database(db: Session) -> None:
    """Idempotent: inserts seed rows only when the table is empty / row is absent."""

    # 1. FAQ document (only if not already present — avoids duplicate chunks)
    if not db.query(DocumentRow).filter(DocumentRow.name == "OmniFlow Demo FAQ").first():
        ingest_document("OmniFlow Demo FAQ", "seed", _FAQ_TEXT, db)

    # 2. Seed conversations (insert only, do NOT overwrite live status changes)
    seed_convs = [
        ConversationRow(
            id="conv_website_1", customer_name="Aarav Mehta", channel="website",
            status="active", last_message="Can OmniFlow answer pricing questions?",
            updated_at=utc_now(), unread_count=2,
        ),
        ConversationRow(
            id="conv_whatsapp_1", customer_name="Maya Kapoor", channel="whatsapp",
            status="lead", last_message="I want to book a demo this week.",
            updated_at=utc_now(), unread_count=1,
        ),
        ConversationRow(
            id="conv_email_1", customer_name="Rohan Gupta", channel="email",
            status="escalated", last_message="I need help with a refund immediately.",
            updated_at=utc_now(), unread_count=0,
        ),
    ]
    for conv in seed_convs:
        if not db.query(ConversationRow).filter(ConversationRow.id == conv.id).first():
            db.add(conv)
    db.commit()

    # 3. Seed messages (only if none exist for a given conversation)
    seed_messages: dict[str, list[tuple[str, str]]] = {
        "conv_website_1": [
            ("user", "Can OmniFlow answer pricing questions?"),
            ("ai", "Yes. OmniFlow can answer pricing questions from your knowledge base and tag the conversation for sales."),
        ],
        "conv_whatsapp_1": [
            ("user", "I want to book a demo this week."),
            ("ai", "Great. Please share your name, email, and preferred time, and I will reserve a slot."),
        ],
        "conv_email_1": [
            ("user", "I need help with a refund immediately."),
            ("ai", "I am escalating this to a human teammate so it can be handled carefully."),
        ],
    }
    for conv_id, pairs in seed_messages.items():
        if not db.query(MessageRow).filter(MessageRow.conversation_id == conv_id).first():
            for sender, body in pairs:
                db.add(MessageRow(
                    id=str(uuid4()), conversation_id=conv_id,
                    sender=sender, body=body, created_at=utc_now(),
                ))
    db.commit()

    # 4. Seed leads (only if table is empty)
    if db.query(LeadRow).count() == 0:
        db.add(LeadRow(
            id=str(uuid4()), conversation_id="conv_whatsapp_1",
            customer_name="Maya Kapoor", email="maya.kapoor@example.com",
            phone="+91 98100 11223", interest="Demo request",
            channel="whatsapp", created_at=utc_now(),
        ))
        db.add(LeadRow(
            id=str(uuid4()), conversation_id="conv_email_1",
            customer_name="Rohan Gupta", email="rohan.gupta@acmecorp.in",
            phone="+91 77009 44567", interest="Pricing inquiry",
            channel="email", created_at=utc_now(),
        ))
        db.commit()

    # 5. Seed workflows (only if table is empty)
    if db.query(WorkflowRow).count() == 0:
        db.add(WorkflowRow(
            id=str(uuid4()), name="Escalate refund requests",
            trigger="refund", condition="contains", action="escalate",
            action_value="", enabled=True, created_at=utc_now(),
        ))
        db.add(WorkflowRow(
            id=str(uuid4()), name="Pricing auto-reply",
            trigger="pricing", condition="contains", action="send_reply",
            action_value=(
                "Our plans: Starter $49/mo, Growth $149/mo, Business $399/mo. "
                "Which plan interests you most?"
            ),
            enabled=True, created_at=utc_now(),
        ))
        db.add(WorkflowRow(
            id=str(uuid4()), name="Demo request — tag as lead",
            trigger="demo", condition="contains", action="tag_lead",
            action_value="", enabled=True, created_at=utc_now(),
        ))
        db.commit()

    # 6. Seed bookings (only if table is empty)
    if db.query(BookingRow).count() == 0:
        initial_slots = generate_slots_for_days(3)
        if len(initial_slots) >= 7:
            db.add(BookingRow(
                id=str(uuid4()), conversation_id="conv_whatsapp_1",
                customer_name="Maya Kapoor", email="maya.kapoor@example.com",
                slot=initial_slots[5], channel="whatsapp", created_at=utc_now(),
            ))
            db.add(BookingRow(
                id=str(uuid4()), conversation_id="conv_email_1",
                customer_name="Rohan Gupta", email="rohan.gupta@acmecorp.in",
                slot=initial_slots[6], channel="email", created_at=utc_now(),
            ))
            db.commit()


# ── FastAPI app + lifespan ────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    # Create all tables (no-op if they already exist) then seed
    Base.metadata.create_all(bind=engine)

    # Incremental schema migrations (safe to re-run; IF NOT EXISTS guards each)
    with engine.connect() as conn:
        try:
            conn.execute(sa_text(
                "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to VARCHAR"
            ))
            conn.commit()
        except Exception:
            conn.rollback()

    db: Session = SessionLocal()
    try:
        _seed_database(db)
    finally:
        db.close()
    yield   # server runs here
    # (nothing to clean up on shutdown)


app = FastAPI(title=os.getenv("APP_NAME", "OmniFlow AI API"), lifespan=lifespan)

_frontend_origins = [
    o.strip()
    for o in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000,http://localhost:3001").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ai/status")
def ai_status() -> dict[str, str]:
    provider, model = "mock", "mock-responder"
    if ai_provider == "openai" and openai_client:
        provider, model = "openai", openai_model
    elif ai_provider == "groq" and groq_client:
        provider, model = "groq", groq_model
    return {"provider": provider, "model": model}


@app.get("/debug/whatsapp")
def debug_whatsapp():
    """Test WhatsApp token validity without sending a real message."""
    if not wa_phone_number_id or not wa_access_token:
        return {"status": "error", "reason": "WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set in env"}
    try:
        resp = http_requests.get(
            f"https://graph.facebook.com/v18.0/{wa_phone_number_id}",
            headers={"Authorization": f"Bearer {wa_access_token}"},
            timeout=10,
        )
        data = resp.json()
        if resp.status_code == 200:
            return {"status": "ok", "phone_number_id": wa_phone_number_id, "meta_response": data}
        else:
            return {"status": "error", "http_status": resp.status_code, "meta_response": data}
    except Exception as e:
        return {"status": "error", "reason": str(e)}


@app.get("/debug/facebook")
def debug_facebook():
    """Test Facebook page token validity and webhook subscription."""
    if not fb_page_access_token:
        return {"status": "error", "reason": "FB_PAGE_ACCESS_TOKEN not set in env"}
    try:
        # Check token validity
        resp = http_requests.get(
            "https://graph.facebook.com/v18.0/me",
            params={"access_token": fb_page_access_token, "fields": "id,name"},
            timeout=10,
        )
        data = resp.json()
        if resp.status_code == 200:
            # Also check webhook subscriptions
            subs_resp = http_requests.get(
                f"https://graph.facebook.com/v18.0/{data.get('id')}/subscribed_apps",
                params={"access_token": fb_page_access_token},
                timeout=10,
            )
            return {
                "status": "ok",
                "page": data,
                "subscriptions": subs_resp.json() if subs_resp.status_code == 200 else {"error": subs_resp.text},
            }
        else:
            return {"status": "error", "http_status": resp.status_code, "meta_response": data}
    except Exception as e:
        return {"status": "error", "reason": str(e)}


@app.post("/debug/facebook/subscribe")
def debug_facebook_subscribe():
    """Re-subscribe the page to the app webhook so Meta forwards messages."""
    if not fb_page_access_token:
        return {"status": "error", "reason": "FB_PAGE_ACCESS_TOKEN not set in env"}
    try:
        # Get page ID first
        me_resp = http_requests.get(
            "https://graph.facebook.com/v18.0/me",
            params={"access_token": fb_page_access_token, "fields": "id,name"},
            timeout=10,
        )
        page_data = me_resp.json()
        page_id = page_data.get("id")
        if not page_id:
            return {"status": "error", "reason": "Could not get page ID", "meta_response": page_data}

        # Subscribe the page to the app for messages
        sub_resp = http_requests.post(
            f"https://graph.facebook.com/v18.0/{page_id}/subscribed_apps",
            params={
                "access_token": fb_page_access_token,
                "subscribed_fields": "messages,messaging_postbacks",
            },
            timeout=10,
        )
        sub_data = sub_resp.json()
        if sub_resp.status_code == 200 and sub_data.get("success"):
            return {"status": "ok", "page_id": page_id, "page_name": page_data.get("name"), "subscribed": True}
        else:
            return {"status": "error", "http_status": sub_resp.status_code, "meta_response": sub_data}
    except Exception as e:
        return {"status": "error", "reason": str(e)}


@app.get("/conversations", response_model=list[Conversation])
def list_conversations(db: Session = Depends(get_db)) -> list[Conversation]:
    rows = db.query(ConversationRow).order_by(ConversationRow.updated_at.desc()).all()
    return [row_to_conversation(r) for r in rows]


@app.get("/messages/{conversation_id}", response_model=list[Message])
def list_messages(conversation_id: str, db: Session = Depends(get_db)) -> list[Message]:
    rows = (
        db.query(MessageRow)
        .filter(MessageRow.conversation_id == conversation_id)
        .order_by(MessageRow.created_at)
        .all()
    )
    return [row_to_message(r) for r in rows]


@app.get("/documents", response_model=list[Document])
def list_documents(db: Session = Depends(get_db)) -> list[Document]:
    rows = db.query(DocumentRow).order_by(DocumentRow.created_at.desc()).all()
    return [row_to_document(r) for r in rows]


@app.post("/upload", response_model=Document)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Document:
    filename = file.filename or "uploaded-document"
    suffix = Path(filename).suffix.lower()
    if suffix not in {".txt", ".md", ".pdf"}:
        raise HTTPException(status_code=400, detail="Only TXT, Markdown, and PDF files are supported.")
    raw = await file.read()
    if suffix == ".pdf":
        reader = PdfReader(BytesIO(raw))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        kind = "pdf"
    else:
        text = raw.decode("utf-8", errors="ignore")
        kind = "text"
    if not text.strip():
        raise HTTPException(status_code=400, detail="Document has no readable text.")
    return ingest_document(filename, kind, text, db)


@app.get("/leads", response_model=list[Lead])
def list_leads(db: Session = Depends(get_db)) -> list[Lead]:
    rows = db.query(LeadRow).order_by(LeadRow.created_at.desc()).all()
    return [row_to_lead(r) for r in rows]


@app.post("/leads", response_model=Lead, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)) -> Lead:
    email = payload.email.strip().lower()
    if not _EMAIL_RE.fullmatch(email):
        raise HTTPException(status_code=422, detail="Invalid email address.")
    if db.query(LeadRow).filter(LeadRow.email == email).first():
        raise HTTPException(status_code=409, detail="A lead with this email already exists.")
    conv_row = db.query(ConversationRow).filter(ConversationRow.id == payload.conversation_id).first()
    channel: Channel = conv_row.channel if conv_row else "website"
    lead_row = LeadRow(
        id=str(uuid4()),
        conversation_id=payload.conversation_id,
        customer_name=payload.customer_name.strip(),
        email=email,
        phone=payload.phone.strip(),
        interest=payload.interest.strip() or "General inquiry",
        channel=channel,
        created_at=utc_now(),
    )
    db.add(lead_row)
    if conv_row:
        conv_row.status = "lead"
    db.commit()
    return row_to_lead(lead_row)


@app.post("/leads/sync-sheets")
def sync_all_leads_to_sheets(db: Session = Depends(get_db)) -> dict:
    """Push all leads to the configured Google Sheet.
    Returns {"synced": N} — 0 if Sheets is not configured.
    """
    if not gs_credentials_path or not gs_sheet_id:
        return {"synced": 0, "note": "Google Sheets not configured"}
    leads = db.query(LeadRow).order_by(LeadRow.created_at).all()
    try:
        import gspread
        from google.oauth2.service_account import Credentials as GCredentials
        creds = GCredentials.from_service_account_file(
            gs_credentials_path,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        gc = gspread.authorize(creds)
        ws = gc.open_by_key(gs_sheet_id).sheet1
        ws.clear()
        ws.append_row(["Name", "Email", "Phone", "Interest", "Channel", "Captured At"])
        for lead in leads:
            ws.append_row([
                lead.customer_name or "",
                lead.email or "",
                lead.phone or "",
                lead.interest or "",
                lead.channel or "",
                lead.created_at or "",
            ])
        return {"synced": len(leads)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sheets sync failed: {e}")


@app.get("/slots")
def list_slots(db: Session = Depends(get_db)) -> dict[str, list[str]]:
    return {"available": get_available_slots(db)}


@app.get("/bookings", response_model=list[Booking])
def list_bookings(db: Session = Depends(get_db)) -> list[Booking]:
    rows = db.query(BookingRow).order_by(BookingRow.created_at.desc()).all()
    return [row_to_booking(r) for r in rows]


@app.post("/bookings", response_model=Booking, status_code=201)
def create_booking_manual(
    conversation_id: str,
    slot: str,
    customer_name: str,
    email: str = "",
    channel: Channel = "website",
    db: Session = Depends(get_db),
) -> Booking:
    """Manual / admin booking endpoint."""
    if slot not in get_available_slots(db):
        raise HTTPException(status_code=409, detail="Slot is already booked or does not exist.")
    booking_row = BookingRow(
        id=str(uuid4()), conversation_id=conversation_id,
        customer_name=customer_name, email=email,
        slot=slot, channel=channel, created_at=utc_now(),
    )
    db.add(booking_row)
    db.commit()
    return row_to_booking(booking_row)


@app.get("/workflows", response_model=list[Workflow])
def list_workflows(db: Session = Depends(get_db)) -> list[Workflow]:
    rows = db.query(WorkflowRow).order_by(WorkflowRow.created_at).all()
    return [row_to_workflow(r) for r in rows]


@app.post("/workflows", response_model=Workflow, status_code=201)
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db)) -> Workflow:
    wf = WorkflowRow(
        id=str(uuid4()),
        name=payload.name.strip(),
        trigger=payload.trigger.strip().lower(),
        condition=payload.condition,
        action=payload.action,
        action_value=payload.action_value.strip(),
        enabled=True,
        created_at=utc_now(),
    )
    db.add(wf)
    db.commit()
    return row_to_workflow(wf)


@app.delete("/workflows/{workflow_id}", response_model=Workflow)
def delete_workflow(workflow_id: str, db: Session = Depends(get_db)) -> Workflow:
    wf = db.query(WorkflowRow).filter(WorkflowRow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found.")
    wf_data = row_to_workflow(wf)
    db.delete(wf)
    db.commit()
    return wf_data


@app.patch("/workflows/{workflow_id}/toggle", response_model=Workflow)
def toggle_workflow(workflow_id: str, db: Session = Depends(get_db)) -> Workflow:
    wf = db.query(WorkflowRow).filter(WorkflowRow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found.")
    wf.enabled = not wf.enabled
    db.commit()
    return row_to_workflow(wf)


@app.get("/workflow-logs", response_model=list[WorkflowLog])
def list_workflow_logs(
    limit: int = 50, db: Session = Depends(get_db)
) -> list[WorkflowLog]:
    rows = (
        db.query(WorkflowLogRow)
        .order_by(WorkflowLogRow.created_at.desc())
        .limit(limit)
        .all()
    )
    return [row_to_workflow_log(r) for r in rows]


@app.get("/analytics", response_model=AnalyticsSummary)
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsSummary:
    """Aggregate stats for the Analytics Overview dashboard."""
    total_conversations = db.query(ConversationRow).count()
    ai_replies          = db.query(MessageRow).filter(MessageRow.sender == "ai").count()
    leads_count         = db.query(LeadRow).count()
    bookings_count      = db.query(BookingRow).count()
    escalations         = db.query(ConversationRow).filter(ConversationRow.status == "escalated").count()

    # Build the last 7 calendar days (oldest → newest)
    today = date.today()
    days  = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]

    # Daily conversations — bucket by updated_at date
    conv_by_day: dict[str, int] = {}
    for (upd,) in db.query(ConversationRow.updated_at).all():
        if upd:
            d = upd[:10]
            if d in days:
                conv_by_day[d] = conv_by_day.get(d, 0) + 1

    # Lead growth — bucket by created_at date
    lead_by_day: dict[str, int] = {}
    for (crt,) in db.query(LeadRow.created_at).all():
        if crt:
            d = crt[:10]
            if d in days:
                lead_by_day[d] = lead_by_day.get(d, 0) + 1

    # Channel breakdown
    channel_counts: dict[str, int] = {}
    for (ch,) in db.query(ConversationRow.channel).all():
        channel_counts[ch] = channel_counts.get(ch, 0) + 1

    # Status breakdown
    status_counts: dict[str, int] = {}
    for (st,) in db.query(ConversationRow.status).all():
        status_counts[st] = status_counts.get(st, 0) + 1

    return AnalyticsSummary(
        total_conversations=total_conversations,
        ai_replies=ai_replies,
        leads=leads_count,
        bookings=bookings_count,
        escalations=escalations,
        daily_conversations=[DailyCount(date=d, count=conv_by_day.get(d, 0)) for d in days],
        lead_growth=[DailyCount(date=d, count=lead_by_day.get(d, 0)) for d in days],
        channel_breakdown=[NameValue(name=k.capitalize(), value=v) for k, v in channel_counts.items()],
        status_breakdown=[NameValue(name=k.capitalize(), value=v) for k, v in status_counts.items()],
    )


@app.post("/escalate/{conversation_id}", response_model=Conversation)
def escalate_conversation(
    conversation_id: str, db: Session = Depends(get_db)
) -> Conversation:
    """Manually escalate a conversation to a human agent."""
    conv = db.query(ConversationRow).filter(ConversationRow.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    conv.status = "escalated"
    now = utc_now()
    conv.updated_at = now

    # Auto-send a customer-facing handoff message
    handoff_text = (
        "Thank you for reaching out! 🙏 I'm connecting you with a human agent "
        "who will assist you shortly. Please hold on."
    )
    handoff_msg = MessageRow(
        id=str(uuid4()),
        conversation_id=conversation_id,
        sender="human",
        body=handoff_text,
        created_at=now,
    )
    db.add(handoff_msg)
    conv.last_message = handoff_text
    db.commit()
    return row_to_conversation(conv)


class AgentMessageCreate(BaseModel):
    conversation_id: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1, max_length=2000)


@app.post("/messages/agent", response_model=list[Message])
def send_agent_message(payload: AgentMessageCreate, db: Session = Depends(get_db)) -> list[Message]:
    """Send a message from a human agent — no AI reply is triggered."""
    conv_row = db.query(ConversationRow).filter(ConversationRow.id == payload.conversation_id).first()
    if conv_row is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    now = utc_now()
    msg_row = MessageRow(
        id=str(uuid4()),
        conversation_id=payload.conversation_id,
        sender="human",
        body=payload.body,
        created_at=now,
    )
    db.add(msg_row)
    conv_row.last_message = payload.body
    conv_row.updated_at = now
    db.commit()

    rows = (
        db.query(MessageRow)
        .filter(MessageRow.conversation_id == payload.conversation_id)
        .order_by(MessageRow.created_at)
        .all()
    )
    return [row_to_message(r) for r in rows]


class StatusUpdate(BaseModel):
    status: str


@app.patch("/conversations/{conversation_id}/status", response_model=Conversation)
def update_conversation_status(
    conversation_id: str, payload: StatusUpdate, db: Session = Depends(get_db)
) -> Conversation:
    """Manually set the status of a conversation (active / lead / booked / escalated / resolved)."""
    valid = {"active", "lead", "booked", "escalated", "resolved"}
    if payload.status not in valid:
        raise HTTPException(status_code=422, detail=f"Status must be one of: {', '.join(sorted(valid))}")
    conv = db.query(ConversationRow).filter(ConversationRow.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    conv.status = payload.status
    conv.updated_at = utc_now()
    db.commit()
    return row_to_conversation(conv)


_AGENT_ROSTER = ["Priya", "Support Team", "Sales Team", "Unassigned"]


class AssignPayload(BaseModel):
    agent: str = Field(..., min_length=1, max_length=80)


@app.patch("/conversations/{conversation_id}/assign", response_model=Conversation)
def assign_conversation(
    conversation_id: str, payload: AssignPayload, db: Session = Depends(get_db)
) -> Conversation:
    """Assign a conversation to a human agent (or 'Unassigned')."""
    conv = db.query(ConversationRow).filter(ConversationRow.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    conv.assigned_to = None if payload.agent == "Unassigned" else payload.agent
    conv.updated_at = utc_now()
    db.commit()
    return row_to_conversation(conv)


@app.get("/agents")
def list_agents() -> dict:
    """Return the hardcoded agent roster."""
    return {"agents": _AGENT_ROSTER}


@app.get("/leads/export")
def export_leads_csv(db: Session = Depends(get_db)) -> Response:
    """Download all leads as a CSV file."""
    rows = db.query(LeadRow).order_by(LeadRow.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Interest", "Channel", "Captured At"])
    for r in rows:
        writer.writerow([
            r.customer_name or "",
            r.email or "",
            r.phone or "",
            r.interest or "",
            r.channel or "",
            r.created_at or "",
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=omniflow-leads.csv"},
    )


@app.get("/bookings/export")
def export_bookings_csv(db: Session = Depends(get_db)) -> Response:
    """Download all bookings as a CSV file."""
    rows = db.query(BookingRow).order_by(BookingRow.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Slot", "Channel", "Booked At"])
    for r in rows:
        writer.writerow([
            r.customer_name or "",
            r.email or "",
            r.slot or "",
            r.channel or "",
            r.created_at or "",
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=omniflow-bookings.csv"},
    )


@app.post("/messages", response_model=list[Message])
def send_message(payload: MessageCreate, db: Session = Depends(get_db)) -> list[Message]:
    # Get or create conversation
    conv_row = db.query(ConversationRow).filter(ConversationRow.id == payload.conversation_id).first()
    if conv_row is None:
        conv_row = ConversationRow(
            id=payload.conversation_id,
            customer_name="Website Visitor",
            channel="website",
            status="active",
            last_message="",
            updated_at=utc_now(),
        )
        db.add(conv_row)
        db.commit()
        db.refresh(conv_row)

    # Snapshot previous history BEFORE adding the new user message
    # (so build_conversation_transcript doesn't see the current message twice)
    prev_history = [
        row_to_message(r)
        for r in (
            db.query(MessageRow)
            .filter(MessageRow.conversation_id == payload.conversation_id)
            .order_by(MessageRow.created_at)
            .all()
        )
    ]

    # Stage user message (not committed yet)
    user_msg_row = MessageRow(
        id=str(uuid4()),
        conversation_id=payload.conversation_id,
        sender="user",
        body=payload.body,
        created_at=utc_now(),
    )
    db.add(user_msg_row)

    # Full history (prev + current) used for lead extraction
    full_history = prev_history + [row_to_message(user_msg_row)]

    # ── Phase 8: already-escalated conversations → AI is paused ─────────────
    # Human agents handle these; just save the user message and return.
    if conv_row.status == "escalated":
        conv_row.last_message = payload.body
        conv_row.updated_at = user_msg_row.created_at
        db.commit()
        rows = (
            db.query(MessageRow)
            .filter(MessageRow.conversation_id == payload.conversation_id)
            .order_by(MessageRow.created_at)
            .all()
        )
        return [row_to_message(r) for r in rows]

    # ── Phase 9: Run workflow rules before slot detection / LLM ──────────────
    wf_result = run_workflows(payload.body, conv_row, db)

    if wf_result["escalated"]:
        ai_body = (
            wf_result["custom_reply"]
            or "I'm connecting you with a human agent who will assist you further."
        )
        ai_source = "workflow"

    elif wf_result["custom_reply"]:
        # Workflow custom reply — skip slot detection and LLM entirely
        ai_body   = wf_result["custom_reply"]
        ai_source = "workflow"

    else:
        # ── Phase 7: detect slot selection before calling the LLM ────────────
        available   = get_available_slots(db)
        chosen_slot = detect_slot_from_message(payload.body, available)

        if chosen_slot:
            booking_email = extract_email(payload.body) or ""
            if not booking_email:
                for msg in reversed(prev_history[-10:]):
                    if msg.sender == "user":
                        found = extract_email(msg.body)
                        if found:
                            booking_email = found
                            break
            db.add(BookingRow(
                id=str(uuid4()),
                conversation_id=payload.conversation_id,
                customer_name=conv_row.customer_name,
                email=booking_email,
                slot=chosen_slot,
                channel=conv_row.channel,
                created_at=utc_now(),
            ))
            conv_row.status = "booked"
            ai_body = (
                f"✅ Your appointment is confirmed for **{chosen_slot}**. "
                "We look forward to speaking with you! You will receive a confirmation shortly."
            )
            ai_source = "system"
        else:
            # Normal AI path — inject available slots if booking intent detected
            context_chunks = retrieve_knowledge(payload.body, db)
            slots_for_ai   = available if has_booking_intent(payload.body) else None
            ai_body, ai_source = generate_ai_response(
                payload.body, prev_history, context_chunks, slots_for_ai
            )

    # Stage AI message
    ai_msg_row = MessageRow(
        id=str(uuid4()),
        conversation_id=payload.conversation_id,
        sender="ai",
        body=ai_body,
        created_at=utc_now(),
    )
    db.add(ai_msg_row)

    # Update conversation metadata
    conv_row.last_message = ai_body
    conv_row.updated_at   = ai_msg_row.created_at
    conv_row.unread_count = 0

    # Phase 8 — auto-escalate if not already handled by a workflow
    if (
        not wf_result["escalated"]
        and conv_row.status not in {"booked", "escalated"}
        and should_auto_escalate(payload.body, ai_body)
    ):
        conv_row.status = "escalated"
    elif conv_row.status not in {"booked", "escalated", "lead"} and any(
        k in payload.body.lower() for k in ["demo", "appointment", "book"]
    ):
        conv_row.status = "lead"

    # Phase 6 — auto-capture lead (staged, committed below)
    new_lead = try_capture_lead(conv_row, payload.body, full_history, db)

    if ai_source == "mock" and ai_provider == "openai":
        conv_row.last_message = f"{conv_row.last_message} (mock fallback)"

    # Single commit for everything in this request
    db.commit()

    # Sync newly captured lead to Google Sheets (no-op if not configured)
    if new_lead:
        sync_lead_to_sheets(new_lead)

    # Return the full conversation thread
    rows = (
        db.query(MessageRow)
        .filter(MessageRow.conversation_id == payload.conversation_id)
        .order_by(MessageRow.created_at)
        .all()
    )
    return [row_to_message(r) for r in rows]


# ── WhatsApp Webhooks ─────────────────────────────────────────────────────────

@app.get("/webhooks/whatsapp")
def whatsapp_verify(request: Request):
    """Meta webhook verification handshake (GET).
    Meta sends hub.mode, hub.challenge, hub.verify_token as query params.
    We must echo back hub.challenge as plain text to confirm the webhook URL.
    """
    params    = request.query_params
    mode      = params.get("hub.mode", "")
    challenge = params.get("hub.challenge", "")
    token     = params.get("hub.verify_token", "")
    if mode == "subscribe" and token == wa_verify_token:
        return PlainTextResponse(challenge)
    raise HTTPException(status_code=403, detail="Webhook verification failed.")


@app.post("/webhooks/whatsapp", status_code=200)
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """Receive inbound WhatsApp messages (POST).
    Parses the Meta payload, runs each text message through the AI pipeline,
    and sends the AI reply back to the customer via WhatsApp Cloud API.
    Always returns 200 — returning anything else causes Meta to retry endlessly.
    """
    try:
        payload = await request.json()
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value    = change.get("value", {})
                messages = value.get("messages", [])
                contacts = value.get("contacts", [])

                for msg in messages:
                    if msg.get("type") != "text":
                        continue  # ignore image/audio/etc. for now

                    from_number = msg["from"]           # e.g. "919876543210"
                    text_body   = msg["text"]["body"]

                    # Resolve display name from contacts array
                    customer_name = from_number
                    for contact in contacts:
                        if contact.get("wa_id") == from_number:
                            customer_name = contact.get("profile", {}).get("name", from_number)
                            break

                    # Stable conversation ID keyed by phone number
                    conv_id  = f"wa_{from_number}"
                    conv_row = db.query(ConversationRow).filter(ConversationRow.id == conv_id).first()
                    if conv_row is None:
                        conv_row = ConversationRow(
                            id=conv_id,
                            customer_name=customer_name,
                            channel="whatsapp",
                            status="active",
                            last_message="",
                            updated_at=utc_now(),
                            unread_count=0,
                        )
                        db.add(conv_row)
                        db.commit()
                        db.refresh(conv_row)

                    # Run through the full OmniFlow AI pipeline
                    thread = send_message(
                        MessageCreate(conversation_id=conv_id, body=text_body),
                        db,
                    )

                    # Send AI reply back on WhatsApp
                    ai_msgs = [m for m in thread if m.sender in ("ai", "human")]
                    if ai_msgs:
                        send_whatsapp_reply(from_number, ai_msgs[-1].body)

    except Exception:
        pass  # swallow all errors — always return 200 to Meta

    return {"status": "ok"}


# ── Facebook Messenger Webhooks ───────────────────────────────────────────────

@app.get("/webhooks/facebook")
def facebook_verify(request: Request):
    """Meta webhook verification handshake for Facebook Messenger."""
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == fb_verify_token
    ):
        return PlainTextResponse(params.get("hub.challenge", ""))
    raise HTTPException(status_code=403, detail="Webhook verification failed.")


@app.post("/webhooks/facebook", status_code=200)
async def facebook_webhook(request: Request, db: Session = Depends(get_db)):
    """Receive inbound Facebook Messenger messages.
    Parses the Messenger payload, runs AI, sends reply back via Graph API.
    Always returns 200 — non-200 causes Meta to retry endlessly.
    """
    try:
        payload = await request.json()
        if payload.get("object") != "page":
            return {"status": "ok"}
        for entry in payload.get("entry", []):
            for messaging in entry.get("messaging", []):
                message = messaging.get("message", {})
                if message.get("is_echo"):
                    continue  # skip our own outbound messages echoed back
                text = message.get("text", "")
                if not text:
                    continue
                sender_psid = messaging["sender"]["id"]
                conv_id     = f"fb_{sender_psid}"
                conv_row    = db.query(ConversationRow).filter(ConversationRow.id == conv_id).first()
                if conv_row is None:
                    conv_row = ConversationRow(
                        id=conv_id,
                        customer_name=f"FB User …{sender_psid[-4:]}",
                        channel="facebook",
                        status="active",
                        last_message="",
                        updated_at=utc_now(),
                        unread_count=0,
                    )
                    db.add(conv_row)
                    db.commit()
                    db.refresh(conv_row)
                thread  = send_message(MessageCreate(conversation_id=conv_id, body=text), db)
                ai_msgs = [m for m in thread if m.sender in ("ai", "human")]
                if ai_msgs:
                    send_facebook_reply(sender_psid, ai_msgs[-1].body)
    except Exception:
        pass
    return {"status": "ok"}


# ── Instagram Messaging Webhooks ──────────────────────────────────────────────

@app.get("/webhooks/instagram")
def instagram_verify(request: Request):
    """Meta webhook verification handshake for Instagram Messaging."""
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == ig_verify_token
    ):
        return PlainTextResponse(params.get("hub.challenge", ""))
    raise HTTPException(status_code=403, detail="Webhook verification failed.")


@app.post("/webhooks/instagram", status_code=200)
async def instagram_webhook(request: Request, db: Session = Depends(get_db)):
    """Receive inbound Instagram DMs.
    Instagram messaging uses the same Messenger-style payload structure.
    Always returns 200.
    """
    try:
        payload = await request.json()
        # Instagram webhooks send object = "instagram"
        if payload.get("object") not in ("instagram", "page"):
            return {"status": "ok"}
        for entry in payload.get("entry", []):
            for messaging in entry.get("messaging", []):
                message = messaging.get("message", {})
                if message.get("is_echo"):
                    continue
                text = message.get("text", "")
                if not text:
                    continue
                sender_id = messaging["sender"]["id"]
                conv_id   = f"ig_{sender_id}"
                conv_row  = db.query(ConversationRow).filter(ConversationRow.id == conv_id).first()
                if conv_row is None:
                    conv_row = ConversationRow(
                        id=conv_id,
                        customer_name=f"Instagram User …{sender_id[-4:]}",
                        channel="instagram",
                        status="active",
                        last_message="",
                        updated_at=utc_now(),
                        unread_count=0,
                    )
                    db.add(conv_row)
                    db.commit()
                    db.refresh(conv_row)
                thread  = send_message(MessageCreate(conversation_id=conv_id, body=text), db)
                ai_msgs = [m for m in thread if m.sender in ("ai", "human")]
                if ai_msgs:
                    send_instagram_reply(sender_id, ai_msgs[-1].body)
    except Exception:
        pass
    return {"status": "ok"}


@app.post("/messages/stream")
def send_message_stream(payload: MessageCreate, db: Session = Depends(get_db)):
    """Same as POST /messages but streams the AI reply token-by-token via SSE.

    Event format:
      data: {"type": "token", "token": "<text>"}   — one or more tokens
      data: {"type": "done",  "messages": [...]}    — full thread, stream finished
    """
    # Reuse existing logic — saves user + AI message, runs workflows/RAG/slots
    thread = send_message(payload, db)

    # Extract the last AI message to stream
    ai_msgs = [m for m in thread if m.sender in ("ai", "human")]
    ai_body  = ai_msgs[-1].body if ai_msgs else ""
    thread_json = [m.model_dump() for m in thread]

    def _stream():
        if ai_body:
            words = ai_body.split(" ")
            for i, word in enumerate(words):
                token = word if i == 0 else f" {word}"
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
                time.sleep(0.04)          # ~25 words/sec — natural typing speed
        # Final event carries the authoritative thread so the frontend can
        # replace optimistic messages with real DB IDs / timestamps.
        yield f"data: {json.dumps({'type': 'done', 'messages': thread_json})}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )
