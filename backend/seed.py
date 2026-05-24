#!/usr/bin/env python3
"""
OmniFlow AI — Demo Seed Script
================================
Populates the database with a realistic, judge-ready demo dataset.

Usage
-----
    python seed.py           # insert data only if conversations table is empty
    python seed.py --fresh   # wipe conversations / messages / leads /
                               bookings / workflows / workflow_logs, then re-seed

Run from the backend/ directory with the virtualenv active:
    cd backend
    python seed.py --fresh
"""

import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Make sure "from app.database import ..." resolves correctly
sys.path.insert(0, str(Path(__file__).parent))

from app.database import (
    Base,
    BookingRow,
    ConversationRow,
    LeadRow,
    MessageRow,
    SessionLocal,
    WorkflowLogRow,
    WorkflowRow,
    engine,
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def ts(days_ago: int = 0, hour: int = 10, minute: int = 0) -> str:
    """Return an ISO-8601 UTC timestamp relative to today."""
    now = datetime.now(timezone.utc).replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )
    return (now - timedelta(days=days_ago)).isoformat()


def uid() -> str:
    return str(uuid.uuid4())


# ── Seed data ─────────────────────────────────────────────────────────────────

def build_seed():
    """Return (conversations, messages, leads, bookings, workflows, logs)."""

    # ── Workflow IDs (need them before building logs) ─────────────────────────
    wf_pricing_id = uid()
    wf_refund_id  = uid()
    wf_demo_id    = uid()

    # ── Conversation IDs ──────────────────────────────────────────────────────
    c_maya   = uid()   # WhatsApp  · booked     · yesterday
    c_rohan  = uid()   # Email     · escalated  · today
    c_aarav  = uid()   # Website   · lead       · 2 days ago
    c_karan  = uid()   # WhatsApp  · lead       · 3 days ago
    c_ananya = uid()   # Email     · booked     · 4 days ago
    c_vikram = uid()   # Website   · active     · today
    c_sneha  = uid()   # Website   · active     · 5 days ago

    conversations = [
        ConversationRow(
            id=c_maya,
            customer_name="Maya Kapoor",
            channel="whatsapp",
            status="booked",
            last_message="Please cover the WhatsApp automation and lead capture features.",
            updated_at=ts(days_ago=1, hour=15, minute=35),
            unread_count=0,
        ),
        ConversationRow(
            id=c_rohan,
            customer_name="Rohan Gupta",
            channel="email",
            status="escalated",
            last_message="Hi Rohan, I'm Priya from the OmniFlow support team. I can see your account shows a duplicate charge — escalating to billing now.",
            updated_at=ts(days_ago=0, hour=9, minute=20),
            unread_count=1,
        ),
        ConversationRow(
            id=c_aarav,
            customer_name="Aarav Mehta",
            channel="website",
            status="lead",
            last_message="Afternoons work best, around 3 PM IST.",
            updated_at=ts(days_ago=2, hour=11, minute=15),
            unread_count=0,
        ),
        ConversationRow(
            id=c_karan,
            customer_name="Karan Verma",
            channel="whatsapp",
            status="lead",
            last_message="Great choice, Karan! A sales specialist will reach out shortly.",
            updated_at=ts(days_ago=3, hour=14, minute=25),
            unread_count=0,
        ),
        ConversationRow(
            id=c_ananya,
            customer_name="Ananya Sharma",
            channel="email",
            status="booked",
            last_message="Your appointment is confirmed for May 20, 2026 at 2 PM ✅",
            updated_at=ts(days_ago=4, hour=16, minute=10),
            unread_count=0,
        ),
        ConversationRow(
            id=c_vikram,
            customer_name="Vikram Nair",
            channel="website",
            status="active",
            last_message="Would you like to see a live demo of the platform?",
            updated_at=ts(days_ago=0, hour=10, minute=35),
            unread_count=1,
        ),
        ConversationRow(
            id=c_sneha,
            customer_name="Sneha Patel",
            channel="website",
            status="active",
            last_message="Absolutely! OmniFlow supports over 50 languages automatically.",
            updated_at=ts(days_ago=5, hour=13, minute=40),
            unread_count=0,
        ),
    ]

    # ── Messages ──────────────────────────────────────────────────────────────

    def msgs(conv_id: str, turns: list[tuple[str, str, int, int, int]]):
        """turns = [(sender, body, days_ago, hour, minute), ...]"""
        return [
            MessageRow(
                id=uid(),
                conversation_id=conv_id,
                sender=sender,
                body=body,
                created_at=ts(days_ago=d, hour=h, minute=m),
            )
            for sender, body, d, h, m in turns
        ]

    messages = []

    # Maya Kapoor — WhatsApp — booked
    messages += msgs(c_maya, [
        ("user", "Hi, I'm interested in your business automation plans. Can you tell me more?",      1, 15,  0),
        ("ai",   "Hello Maya! Welcome to OmniFlow AI 👋 We offer intelligent automation for WhatsApp, email, and website chat. Our plans start from ₹2,999/month for startups. Would you like to book a demo to see it in action?", 1, 15,  1),
        ("user", "Yes, I'd love a demo! My email is maya.kapoor@techventures.in",                   1, 15,  5),
        ("ai",   "Perfect! I've noted your email: maya.kapoor@techventures.in ✅ You're all set as a lead. Would you like to schedule a time? We have slots at 11 AM, 2 PM, and 4 PM tomorrow.", 1, 15,  6),
        ("user", "11 AM works great for me.",                                                       1, 15, 10),
        ("ai",   "Your demo is confirmed for tomorrow at 11 AM 🎉 You'll receive a calendar invite at maya.kapoor@techventures.in. Is there anything specific you'd like us to cover?", 1, 15, 11),
        ("user", "Please cover the WhatsApp automation and lead capture features.",                 1, 15, 35),
        ("ai",   "Noted! We'll focus the demo on WhatsApp automation and lead capture workflows. Looking forward to speaking with you at 11 AM!",  1, 15, 36),
    ])

    # Rohan Gupta — Email — escalated
    messages += msgs(c_rohan, [
        ("user",  "I was charged twice this month and I want a full refund immediately. This is completely unacceptable.",  0,  9,  0),
        ("ai",    "I completely understand your frustration, Rohan, and I sincerely apologize for this inconvenience. This billing issue needs immediate attention — let me connect you with a human agent right away.", 0,  9,  1),
        ("human", "Hi Rohan, I'm Priya from the OmniFlow support team. I can see your account shows a duplicate charge — escalating to billing now. You'll receive an email confirmation within 2 hours.", 0,  9, 20),
    ])

    # Aarav Mehta — Website — lead
    messages += msgs(c_aarav, [
        ("user", "Does OmniFlow support enterprise-level API integrations?",                                                         2, 10, 50),
        ("ai",   "Absolutely! OmniFlow supports REST APIs, webhooks, Zapier, and direct CRM integrations with Salesforce, HubSpot, and Zoho. We also provide custom integration support for enterprise clients.",  2, 10, 51),
        ("user", "That's exactly what we need. Can someone reach out? My email is aarav.mehta@nexgentec.com",                        2, 11,  0),
        ("ai",   "I've captured your details, Aarav! An OmniFlow enterprise specialist will reach out to aarav.mehta@nexgentec.com within 24 hours. Is there a preferred time for the call?",  2, 11,  1),
        ("user", "Afternoons work best, around 3 PM IST.",                                                                         2, 11, 15),
        ("ai",   "Noted — afternoons around 3 PM IST. Our team will be in touch. Meanwhile, feel free to explore our docs at docs.omniflow.ai",  2, 11, 16),
    ])

    # Karan Verma — WhatsApp — lead
    messages += msgs(c_karan, [
        ("user", "What are your pricing plans? I need something for a team of 15.",                                                  3, 14,  0),
        ("ai",   "Our pricing plans are:\n\n🚀 Starter — ₹2,999/month (up to 3 agents, 500 conversations)\n💼 Growth — ₹7,499/month (up to 10 agents, 2,000 conversations)\n🏢 Enterprise — Custom pricing (unlimited agents & conversations)\n\nFor a team of 15, the Growth or Enterprise plan would be the best fit. Want to discuss further?",  3, 14,  1),
        ("user", "The Growth plan looks interesting. My email is karan.verma@startupboost.in",                                       3, 14, 15),
        ("ai",   "Great choice, Karan! I've tagged you as a lead and your email karan.verma@startupboost.in has been noted. A sales specialist will reach out shortly with a custom quote for your team of 15.",  3, 14, 16),
    ])

    # Ananya Sharma — Email — booked
    messages += msgs(c_ananya, [
        ("user", "I'd like to schedule a product walkthrough with your team.",                                                       4, 15, 50),
        ("ai",   "I'd be happy to arrange that, Ananya! We have the following slots available:\n\n📅 May 20, 2026 — 2 PM, 4 PM\n📅 May 21, 2026 — 11 AM, 3 PM\n\nWhich works best for you?",  4, 15, 51),
        ("user", "2 PM on May 20 works perfectly.",                                                                                 4, 16,  0),
        ("ai",   "Your appointment is confirmed for May 20, 2026 at 2 PM ✅ You'll receive a calendar invite at your email. Looking forward to walking you through OmniFlow!",  4, 16,  1),
    ])

    # Vikram Nair — Website — active
    messages += msgs(c_vikram, [
        ("user", "Hello, what services does OmniFlow offer?",                                                                       0, 10, 30),
        ("ai",   "Hi Vikram! OmniFlow AI is a multi-channel business automation platform. Here's what we offer:\n\n✅ AI-powered chat for website, WhatsApp & email\n✅ Automatic lead capture & CRM sync\n✅ Appointment booking without human intervention\n✅ Knowledge base with RAG-powered Q&A\n✅ Workflow automation with custom rules\n\nWould you like to see a live demo of the platform?",  0, 10, 31),
    ])

    # Sneha Patel — Website — active
    messages += msgs(c_sneha, [
        ("user", "Can the AI answer from our company documents and FAQs?",                                                          5, 13, 20),
        ("ai",   "Yes! OmniFlow uses RAG (Retrieval-Augmented Generation) to answer questions directly from your uploaded documents — PDFs, Word docs, and text files. Simply upload your FAQ, product docs, or SOPs and the AI will use them to answer customer queries accurately.",  5, 13, 21),
        ("user", "Impressive! Does it work in multiple languages?",                                                                5, 13, 35),
        ("ai",   "Absolutely! OmniFlow supports over 50 languages. You can upload documents in any language and the AI will respond in the customer's preferred language automatically.",  5, 13, 36),
    ])

    # ── Leads ─────────────────────────────────────────────────────────────────

    leads = [
        LeadRow(
            id=uid(),
            conversation_id=c_aarav,
            customer_name="Aarav Mehta",
            email="aarav.mehta@nexgentec.com",
            phone="+91 98765 43210",
            interest="Integration inquiry",
            channel="website",
            created_at=ts(days_ago=2, hour=11, minute=5),
        ),
        LeadRow(
            id=uid(),
            conversation_id=c_karan,
            customer_name="Karan Verma",
            email="karan.verma@startupboost.in",
            phone="+91 77654 32109",
            interest="Pricing inquiry",
            channel="whatsapp",
            created_at=ts(days_ago=3, hour=14, minute=20),
        ),
        LeadRow(
            id=uid(),
            conversation_id=c_maya,
            customer_name="Maya Kapoor",
            email="maya.kapoor@techventures.in",
            phone="+91 98123 45678",
            interest="Demo request",
            channel="whatsapp",
            created_at=ts(days_ago=1, hour=15, minute=10),
        ),
    ]

    # ── Bookings ──────────────────────────────────────────────────────────────

    bookings = [
        BookingRow(
            id=uid(),
            conversation_id=c_maya,
            customer_name="Maya Kapoor",
            email="maya.kapoor@techventures.in",
            slot="May 25, 2026 at 11:00 AM",
            channel="whatsapp",
            created_at=ts(days_ago=1, hour=15, minute=15),
        ),
        BookingRow(
            id=uid(),
            conversation_id=c_ananya,
            customer_name="Ananya Sharma",
            email="ananya.sharma@cloudworks.io",
            slot="May 20, 2026 at 2:00 PM",
            channel="email",
            created_at=ts(days_ago=4, hour=16, minute=5),
        ),
    ]

    # ── Workflows ─────────────────────────────────────────────────────────────

    workflows = [
        WorkflowRow(
            id=wf_pricing_id,
            name="Pricing Auto-Reply",
            trigger="pricing",
            condition="contains",
            action="send_reply",
            action_value="Our plans: 🚀 Starter ₹2,999/mo · 💼 Growth ₹7,499/mo · 🏢 Enterprise custom. Reply 'demo' to schedule a walkthrough!",
            enabled=True,
            created_at=ts(days_ago=6, hour=9, minute=0),
        ),
        WorkflowRow(
            id=wf_refund_id,
            name="Refund Escalation",
            trigger="refund",
            condition="contains",
            action="escalate",
            action_value="",
            enabled=True,
            created_at=ts(days_ago=6, hour=9, minute=5),
        ),
        WorkflowRow(
            id=wf_demo_id,
            name="Demo Lead Tagger",
            trigger="demo",
            condition="contains",
            action="tag_lead",
            action_value="",
            enabled=True,
            created_at=ts(days_ago=6, hour=9, minute=10),
        ),
    ]

    # ── Workflow logs ─────────────────────────────────────────────────────────

    logs = [
        WorkflowLogRow(
            id=uid(),
            workflow_id=wf_pricing_id,
            workflow_name="Pricing Auto-Reply",
            conversation_id=c_karan,
            triggered_by="What are your pricing plans? I need something for a team of 15.",
            action_taken="Sent custom reply",
            created_at=ts(days_ago=3, hour=14, minute=1),
        ),
        WorkflowLogRow(
            id=uid(),
            workflow_id=wf_refund_id,
            workflow_name="Refund Escalation",
            conversation_id=c_rohan,
            triggered_by="I was charged twice this month and I want a full refund immediately.",
            action_taken="Escalated to human",
            created_at=ts(days_ago=0, hour=9, minute=1),
        ),
        WorkflowLogRow(
            id=uid(),
            workflow_id=wf_demo_id,
            workflow_name="Demo Lead Tagger",
            conversation_id=c_maya,
            triggered_by="Yes, I'd love a demo! My email is maya.kapoor@techventures.in",
            action_taken="Tagged as lead",
            created_at=ts(days_ago=1, hour=15, minute=6),
        ),
    ]

    return conversations, messages, leads, bookings, workflows, logs


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    fresh = "--fresh" in sys.argv

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(ConversationRow).count()
        if existing > 0 and not fresh:
            print(
                f"[INFO] Database already has {existing} conversation(s). "
                "Pass --fresh to wipe and re-seed."
            )
            return

        if fresh:
            print("[...] Wiping existing data...")
            for model in (WorkflowLogRow, WorkflowRow, BookingRow, LeadRow, MessageRow, ConversationRow):
                deleted = db.query(model).delete()
                print(f"      deleted {deleted:>3} rows from {model.__tablename__}")
            db.commit()

        print("\n[...] Seeding demo data...")
        conversations, messages, leads, bookings, workflows, logs = build_seed()

        for row in conversations:
            db.add(row)
        db.commit()
        print(f"   [ok] {len(conversations)} conversations")

        for row in messages:
            db.add(row)
        db.commit()
        print(f"   [ok] {len(messages)} messages")

        for row in leads:
            db.add(row)
        db.commit()
        print(f"   [ok] {len(leads)} leads")

        for row in bookings:
            db.add(row)
        db.commit()
        print(f"   [ok] {len(bookings)} bookings")

        for row in workflows:
            db.add(row)
        db.commit()
        print(f"   [ok] {len(workflows)} workflows")

        for row in logs:
            db.add(row)
        db.commit()
        print(f"   [ok] {len(logs)} workflow logs")

        print("\n[DONE] Seed complete! Start the backend and refresh the dashboard.")
        print("  Demo highlights:")
        print("  - WhatsApp convo (Maya Kapoor)  : lead captured + demo booked")
        print("  - Email convo   (Rohan Gupta)   : escalated by refund workflow")
        print("  - Website convo (Aarav Mehta)   : enterprise integration lead")
        print("  - Analytics chart spans last 7 days with an upward trend")

    finally:
        db.close()


if __name__ == "__main__":
    main()
