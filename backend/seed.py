#!/usr/bin/env python3
"""
OmniFlow AI — Demo Seed Script
================================
Populates the database with a realistic, judge-ready demo dataset
covering all 6 channels: website, whatsapp, email, facebook, instagram, phone.

Usage
-----
    python seed.py           # insert only if conversations table is empty
    python seed.py --fresh   # wipe all demo data, then re-seed

Run from the backend/ directory with the virtualenv active:
    cd backend
    python seed.py --fresh
"""

import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text

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
    now = datetime.now(timezone.utc).replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )
    return (now - timedelta(days=days_ago)).isoformat()


def uid() -> str:
    return str(uuid.uuid4())


# ── Seed data ─────────────────────────────────────────────────────────────────

def build_seed():

    wf_pricing_id = uid()
    wf_refund_id  = uid()
    wf_demo_id    = uid()

    # Conversation IDs
    c_maya     = uid()   # WhatsApp   · booked     · 1 day ago
    c_rohan    = uid()   # Email      · escalated  · today
    c_aarav    = uid()   # Website    · lead       · 2 days ago
    c_karan    = uid()   # WhatsApp   · lead       · 3 days ago
    c_ananya   = uid()   # Email      · booked     · 4 days ago
    c_vikram   = uid()   # Website    · active     · today
    c_sneha    = uid()   # Website    · active     · 5 days ago
    c_preethi  = uid()   # Facebook   · lead       · 2 days ago
    c_aditya   = uid()   # Instagram  · lead       · 1 day ago
    c_lakshmi  = uid()   # Phone      · active     · today

    conversations = [
        # ── WhatsApp ────────────────────────────────────────────────────────
        ConversationRow(
            id=c_maya,
            customer_name="Maya Kapoor",
            channel="whatsapp",
            status="booked",
            sentiment="positive",
            last_message="Please cover the WhatsApp automation and lead capture features.",
            updated_at=ts(days_ago=1, hour=15, minute=35),
            unread_count=0,
        ),
        ConversationRow(
            id=c_karan,
            customer_name="Karan Verma",
            channel="whatsapp",
            status="lead",
            sentiment="positive",
            last_message="Great choice, Karan! A sales specialist will reach out shortly.",
            updated_at=ts(days_ago=3, hour=14, minute=25),
            unread_count=0,
        ),
        # ── Email ────────────────────────────────────────────────────────────
        ConversationRow(
            id=c_rohan,
            customer_name="Rohan Gupta",
            channel="email",
            status="escalated",
            sentiment="negative",
            last_message="Hi Rohan, I'm Priya from OmniFlow support. Escalating your duplicate charge to billing now.",
            updated_at=ts(days_ago=0, hour=9, minute=20),
            unread_count=1,
        ),
        ConversationRow(
            id=c_ananya,
            customer_name="Ananya Sharma",
            channel="email",
            status="booked",
            sentiment="positive",
            last_message="Your appointment is confirmed for May 20, 2026 at 2 PM ✅",
            updated_at=ts(days_ago=4, hour=16, minute=10),
            unread_count=0,
        ),
        # ── Website ──────────────────────────────────────────────────────────
        ConversationRow(
            id=c_aarav,
            customer_name="Aarav Mehta",
            channel="website",
            status="lead",
            sentiment="positive",
            last_message="Afternoons work best, around 3 PM IST.",
            updated_at=ts(days_ago=2, hour=11, minute=15),
            unread_count=0,
        ),
        ConversationRow(
            id=c_vikram,
            customer_name="Vikram Nair",
            channel="website",
            status="active",
            sentiment="neutral",
            last_message="Would you like to see a live demo of the platform?",
            updated_at=ts(days_ago=0, hour=10, minute=35),
            unread_count=1,
        ),
        ConversationRow(
            id=c_sneha,
            customer_name="Sneha Patel",
            channel="website",
            status="active",
            sentiment="positive",
            last_message="Absolutely! OmniFlow supports over 50 languages automatically.",
            updated_at=ts(days_ago=5, hour=13, minute=40),
            unread_count=0,
        ),
        # ── Facebook ─────────────────────────────────────────────────────────
        ConversationRow(
            id=c_preethi,
            customer_name="Preethi Rajan",
            channel="facebook",
            status="lead",
            sentiment="positive",
            last_message="I've noted your contact, Preethi! Our team will reach out with a tailored demo.",
            updated_at=ts(days_ago=2, hour=16, minute=45),
            unread_count=0,
        ),
        # ── Instagram ────────────────────────────────────────────────────────
        ConversationRow(
            id=c_aditya,
            customer_name="Aditya Sharma",
            channel="instagram",
            status="lead",
            sentiment="positive",
            last_message="You're all set, Aditya! We'll send the pricing details to your email shortly.",
            updated_at=ts(days_ago=1, hour=18, minute=10),
            unread_count=0,
        ),
        # ── Phone ────────────────────────────────────────────────────────────
        ConversationRow(
            id=c_lakshmi,
            customer_name="Lakshmi Nair",
            channel="phone",
            status="active",
            sentiment="neutral",
            last_message="Our AI voice agent handles inbound calls, qualifies leads, and books appointments — no human needed.",
            updated_at=ts(days_ago=0, hour=11, minute=5),
            unread_count=1,
        ),
    ]

    # ── Messages ──────────────────────────────────────────────────────────────

    def msgs(conv_id, turns):
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
        ("user", "Hi, I'm interested in your business automation plans. Can you tell me more?", 1, 15, 0),
        ("ai",   "Hello Maya! Welcome to OmniFlow AI 👋 We offer intelligent automation for WhatsApp, email, and website chat. Plans start from ₹2,999/month. Would you like to book a demo?", 1, 15, 1),
        ("user", "Yes! My email is maya.kapoor@techventures.in", 1, 15, 5),
        ("ai",   "Perfect! Email noted ✅ We have demo slots at 11 AM, 2 PM, and 4 PM tomorrow. Which works for you?", 1, 15, 6),
        ("user", "11 AM works great.", 1, 15, 10),
        ("ai",   "Demo confirmed for tomorrow at 11 AM 🎉 You'll receive a calendar invite at maya.kapoor@techventures.in. Anything specific to cover?", 1, 15, 11),
        ("user", "Please cover the WhatsApp automation and lead capture features.", 1, 15, 35),
        ("ai",   "Noted! We'll focus on WhatsApp automation and lead capture. Looking forward to speaking with you!", 1, 15, 36),
    ])

    # Rohan Gupta — Email — escalated
    messages += msgs(c_rohan, [
        ("user",  "I was charged twice this month and want a full refund immediately. This is completely unacceptable.", 0, 9, 0),
        ("ai",    "I sincerely apologize, Rohan. This billing issue needs immediate attention — connecting you with a human agent right away.", 0, 9, 1),
        ("human", "Hi Rohan, I'm Priya from OmniFlow support. I can see your account shows a duplicate charge — escalating to billing now. You'll receive confirmation within 2 hours.", 0, 9, 20),
    ])

    # Aarav Mehta — Website — lead
    messages += msgs(c_aarav, [
        ("user", "Does OmniFlow support enterprise-level API integrations?", 2, 10, 50),
        ("ai",   "Absolutely! OmniFlow supports REST APIs, webhooks, Zapier, and CRM integrations with Salesforce, HubSpot, and Zoho. We also provide custom integration support for enterprise clients.", 2, 10, 51),
        ("user", "That's exactly what we need. Can someone reach out? My email is aarav.mehta@nexgentec.com", 2, 11, 0),
        ("ai",   "I've captured your details, Aarav! An enterprise specialist will reach out to aarav.mehta@nexgentec.com within 24 hours. Preferred time for a call?", 2, 11, 1),
        ("user", "Afternoons work best, around 3 PM IST.", 2, 11, 15),
        ("ai",   "Noted — afternoons around 3 PM IST. Our team will be in touch shortly!", 2, 11, 16),
    ])

    # Karan Verma — WhatsApp — lead
    messages += msgs(c_karan, [
        ("user", "What are your pricing plans? I need something for a team of 15.", 3, 14, 0),
        ("ai",   "Our plans:\n\n🚀 Starter — ₹2,999/month (up to 3 agents, 500 conversations)\n💼 Growth — ₹7,499/month (up to 10 agents, 2,000 conversations)\n🏢 Enterprise — Custom (unlimited)\n\nFor 15 people, Growth or Enterprise would fit best. Want to discuss?", 3, 14, 1),
        ("user", "The Growth plan looks interesting. My email is karan.verma@startupboost.in", 3, 14, 15),
        ("ai",   "Great choice, Karan! Email noted: karan.verma@startupboost.in. A sales specialist will reach out with a custom quote for your team of 15.", 3, 14, 16),
    ])

    # Ananya Sharma — Email — booked
    messages += msgs(c_ananya, [
        ("user", "I'd like to schedule a product walkthrough with your team.", 4, 15, 50),
        ("ai",   "Happy to arrange that, Ananya! Available slots:\n\n📅 May 20, 2026 — 2 PM, 4 PM\n📅 May 21, 2026 — 11 AM, 3 PM\n\nWhich works best?", 4, 15, 51),
        ("user", "2 PM on May 20 works perfectly.", 4, 16, 0),
        ("ai",   "Your appointment is confirmed for May 20, 2026 at 2 PM ✅ A calendar invite is on its way. Looking forward to walking you through OmniFlow!", 4, 16, 1),
    ])

    # Vikram Nair — Website — active
    messages += msgs(c_vikram, [
        ("user", "Hello, what services does OmniFlow offer?", 0, 10, 30),
        ("ai",   "Hi Vikram! OmniFlow AI is a multi-channel automation platform:\n\n✅ AI chat for website, WhatsApp, email, Facebook & Instagram\n✅ Automatic lead capture & CRM sync\n✅ Appointment booking — zero human effort\n✅ RAG-powered knowledge base Q&A\n✅ Workflow automation with custom rules\n\nWould you like to see a live demo?", 0, 10, 31),
    ])

    # Sneha Patel — Website — active
    messages += msgs(c_sneha, [
        ("user", "Can the AI answer from our company documents and FAQs?", 5, 13, 20),
        ("ai",   "Yes! OmniFlow uses RAG (Retrieval-Augmented Generation) to answer questions directly from your uploaded PDFs, Word docs, or text files. Upload your FAQ or SOPs and the AI answers customer queries accurately.", 5, 13, 21),
        ("user", "Impressive! Does it work in multiple languages?", 5, 13, 35),
        ("ai",   "Absolutely! OmniFlow supports over 50 languages. Upload documents in any language and the AI responds in the customer's preferred language automatically.", 5, 13, 36),
    ])

    # Preethi Rajan — Facebook — lead
    messages += msgs(c_preethi, [
        ("user", "Hi! Saw your post about AI for businesses. How does OmniFlow help with customer support on Facebook?", 2, 16, 20),
        ("ai",   "Hi Preethi! OmniFlow connects directly to your Facebook Page via the Messenger API. Our AI handles all incoming messages 24/7 — answering FAQs, capturing leads, and booking appointments automatically. No more missed DMs!", 2, 16, 21),
        ("user", "That sounds perfect for my e-commerce store. Can I get a demo? Email is preethi.rajan@shopify-store.in", 2, 16, 35),
        ("ai",   "I've noted your email: preethi.rajan@shopify-store.in ✅ You're captured as a lead. Our team will send you a personalised demo invite — typically within 1 business day. Anything specific you'd like to see?", 2, 16, 36),
        ("user", "Yes — how it handles order tracking questions from customers.", 2, 16, 44),
        ("ai",   "I've noted your contact, Preethi! Our team will reach out with a tailored demo focused on order tracking automation.", 2, 16, 45),
    ])

    # Aditya Sharma — Instagram — lead
    messages += msgs(c_aditya, [
        ("user", "Your product looks amazing! Can you handle appointment scheduling automatically? 🙌", 1, 17, 45),
        ("ai",   "Thanks Aditya! 🎉 Yes — OmniFlow's AI books appointments end-to-end. A customer just types 'I want to book' and the AI shows available slots, confirms their choice, and logs the booking. Zero manual work. Want to try it?", 1, 17, 46),
        ("user", "Definitely! What are the pricing options? My email is aditya.sharma@designstudio.in", 1, 18, 0),
        ("ai",   "Email captured: aditya.sharma@designstudio.in ✅\n\nOur plans:\n🚀 Starter — ₹2,999/month\n💼 Growth — ₹7,499/month\n🏢 Enterprise — Custom\n\nMost studios find the Starter plan ideal to begin with.", 1, 18, 1),
        ("user", "Starter sounds good! Send me details.", 1, 18, 8),
        ("ai",   "You're all set, Aditya! We'll send the pricing details to your email shortly. 😊", 1, 18, 10),
    ])

    # Lakshmi Nair — Phone — active
    messages += msgs(c_lakshmi, [
        ("user", "Hi, I was told to call about your AI phone automation service.", 0, 11, 0),
        ("ai",   "Hello! Welcome to OmniFlow AI 👋 You've reached our AI voice assistant. Our phone channel uses AI to handle inbound calls, qualify leads, and schedule callbacks — 24/7, with no hold times. How can I help you today?", 0, 11, 1),
        ("user", "We get about 200 calls a day and can't handle them all. Can OmniFlow help?", 0, 11, 3),
        ("ai",   "Absolutely! OmniFlow's AI voice agent handles inbound calls, qualifies leads, and books appointments — no human needed. Clients typically see a 70% reduction in unanswered calls within the first week.", 0, 11, 4),
        ("user", "Impressive. What does setup look like?", 0, 11, 5),
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
            score=78,
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
            score=55,
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
            score=90,
            created_at=ts(days_ago=1, hour=15, minute=10),
        ),
        LeadRow(
            id=uid(),
            conversation_id=c_preethi,
            customer_name="Preethi Rajan",
            email="preethi.rajan@shopify-store.in",
            phone="",
            interest="Integration inquiry",
            channel="facebook",
            score=62,
            created_at=ts(days_ago=2, hour=16, minute=36),
        ),
        LeadRow(
            id=uid(),
            conversation_id=c_aditya,
            customer_name="Aditya Sharma",
            email="aditya.sharma@designstudio.in",
            phone="",
            interest="Pricing inquiry",
            channel="instagram",
            score=48,
            created_at=ts(days_ago=1, hour=18, minute=1),
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
        WorkflowLogRow(
            id=uid(),
            workflow_id=wf_pricing_id,
            workflow_name="Pricing Auto-Reply",
            conversation_id=c_aditya,
            triggered_by="Definitely! What are the pricing options?",
            action_taken="Sent custom reply",
            created_at=ts(days_ago=1, hour=18, minute=1),
        ),
    ]

    return conversations, messages, leads, bookings, workflows, logs


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    fresh = "--fresh" in sys.argv

    if fresh:
        print("[...] Dropping and recreating all tables (--fresh)...")
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.execute(text("SELECT COUNT(*) FROM conversations")).scalar()
        if existing > 0 and not fresh:
            print(
                f"[INFO] Database already has {existing} conversation(s). "
                "Pass --fresh to wipe and re-seed."
            )
            return

        print("\n[...] Seeding demo data...")
        conversations, messages, leads, bookings, workflows, logs = build_seed()

        for row in conversations:
            db.add(row)
        db.commit()
        print(f"   [ok] {len(conversations)} conversations  (website, whatsapp, email, facebook, instagram, phone)")

        for row in messages:
            db.add(row)
        db.commit()
        print(f"   [ok] {len(messages)} messages")

        for row in leads:
            db.add(row)
        db.commit()
        print(f"   [ok] {len(leads)} leads  (with AI scores: Hot/Warm/Cold)")

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

        print("\n[DONE] Seed complete! Start the backend and open the dashboard.")
        print("\n  Demo highlights for presentation:")
        print("  * WhatsApp  (Maya Kapoor)   Hot lead, demo booked for 11 AM")
        print("  * Email     (Rohan Gupta)   Escalated by Refund workflow")
        print("  * Website   (Aarav Mehta)   Enterprise integration lead, score 78")
        print("  * Facebook  (Preethi Rajan) E-commerce lead from FB Messenger")
        print("  * Instagram (Aditya Sharma) Design studio lead from IG DM")
        print("  * Phone     (Lakshmi Nair)  Active AI voice call transcript")

    finally:
        db.close()


if __name__ == "__main__":
    main()
