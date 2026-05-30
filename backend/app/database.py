"""
SQLAlchemy engine, ORM models, and session factory for OmniFlow AI.

Why load_dotenv here?
  database.py creates the engine at *import time* (module-level code).
  Loading .env here ensures DATABASE_URL is always available regardless
  of which module is imported first.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import Boolean, Column, Index, Integer, String, UniqueConstraint, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

_env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=_env_path)

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/omniflow",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ── ORM Models ────────────────────────────────────────────────────────────────

class ConversationRow(Base):
    __tablename__ = "conversations"

    id            = Column(String, primary_key=True)
    customer_name = Column(String, nullable=False)
    channel       = Column(String, nullable=False)
    status        = Column(String, nullable=False, default="active")
    last_message  = Column(String, default="")
    updated_at    = Column(String, nullable=False)
    unread_count  = Column(Integer, default=0)
    assigned_to   = Column(String, nullable=True, default=None)


class MessageRow(Base):
    __tablename__ = "messages"

    id              = Column(String, primary_key=True)
    conversation_id = Column(String, nullable=False)
    sender          = Column(String, nullable=False)
    body            = Column(String, nullable=False)
    created_at      = Column(String, nullable=False)

    __table_args__ = (
        Index("ix_messages_conversation_id", "conversation_id"),
    )


class DocumentRow(Base):
    __tablename__ = "documents"

    id          = Column(String, primary_key=True)
    name        = Column(String, nullable=False)
    kind        = Column(String, nullable=False)
    chunk_count = Column(Integer, default=0)
    created_at  = Column(String, nullable=False)


class KnowledgeChunkRow(Base):
    __tablename__ = "knowledge_chunks"

    id            = Column(String, primary_key=True)
    document_id   = Column(String, nullable=False)
    document_name = Column(String, nullable=False)
    text          = Column(String, nullable=False)

    __table_args__ = (
        Index("ix_knowledge_chunks_document_id", "document_id"),
    )


class LeadRow(Base):
    __tablename__ = "leads"

    id              = Column(String, primary_key=True)
    conversation_id = Column(String, nullable=False)
    customer_name   = Column(String, nullable=False)
    email           = Column(String, nullable=False)
    phone           = Column(String, default="")
    interest        = Column(String, default="General inquiry")
    channel         = Column(String, nullable=False)
    created_at      = Column(String, nullable=False)
    score           = Column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("email", name="uq_leads_email"),
        Index("ix_leads_email", "email"),
    )


class BookingRow(Base):
    __tablename__ = "bookings"

    id              = Column(String, primary_key=True)
    conversation_id = Column(String, nullable=False)
    customer_name   = Column(String, nullable=False)
    email           = Column(String, default="")
    slot            = Column(String, nullable=False)
    channel         = Column(String, nullable=False)
    created_at      = Column(String, nullable=False)


class WorkflowRow(Base):
    __tablename__ = "workflows"

    id           = Column(String, primary_key=True)
    name         = Column(String, nullable=False)
    trigger      = Column(String, nullable=False)   # keyword to match
    condition    = Column(String, nullable=False, default="contains")  # contains/equals/starts_with
    action       = Column(String, nullable=False)   # escalate/send_reply/tag_lead
    action_value = Column(String, default="")       # reply text for send_reply
    enabled      = Column(Boolean, nullable=False, default=True)
    created_at   = Column(String, nullable=False)


class WorkflowLogRow(Base):
    __tablename__ = "workflow_logs"

    id              = Column(String, primary_key=True)
    workflow_id     = Column(String, nullable=False)
    workflow_name   = Column(String, nullable=False)
    conversation_id = Column(String, nullable=False)
    triggered_by    = Column(String, nullable=False)   # truncated user message
    action_taken    = Column(String, nullable=False)
    created_at      = Column(String, nullable=False)

    __table_args__ = (
        Index("ix_workflow_logs_workflow_id", "workflow_id"),
        Index("ix_workflow_logs_conversation_id", "conversation_id"),
    )


# ── Session dependency ─────────────────────────────────────────────────────────

def get_db():
    """FastAPI dependency that yields a DB session and closes it when done."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
