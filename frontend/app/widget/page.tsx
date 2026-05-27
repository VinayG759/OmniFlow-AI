"use client";

import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";

import { type Message, sendMessage } from "@/lib/api";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/* ── Persisted conversation ID (session-scoped so history survives page nav) */
function getOrCreateConvId(): string {
  const KEY = "omniflow_widget_conv_id";
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) return stored;
    const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    return `widget-${Date.now()}`;
  }
}

function WidgetChat() {
  const params = useSearchParams();
  const greeting =
    params.get("greeting") ?? "Hi! 👋 I'm OmniFlow AI. How can I help you today?";
  const accentColor = params.get("color") ?? "#22d3ee";

  const [isOpen, setIsOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft]       = useState("");
  const [isSending, setIsSending] = useState(false);
  const [convId]  = useState<string>(getOrCreateConvId);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* Seed the greeting bubble on mount */
  useEffect(() => {
    setMessages([
      {
        id: "__greeting__",
        conversation_id: convId,
        sender: "ai",
        body: greeting,
        created_at: new Date().toISOString(),
      },
    ]);
  }, [greeting, convId]);

  /* Auto-scroll on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    /* Optimistic user message */
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      conversation_id: convId,
      sender: "user",
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setIsSending(true);

    try {
      /* Backend returns full conversation thread */
      const thread = await sendMessage(convId, text);
      /* Prepend our local greeting so it's always visible */
      setMessages([
        {
          id: "__greeting__",
          conversation_id: convId,
          sender: "ai",
          body: greeting,
          created_at: new Date(0).toISOString(),
        },
        ...thread,
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          conversation_id: convId,
          sender: "ai",
          body: "Sorry, I couldn't reach the server. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    /* Transparent full-screen layer so the iframe background is invisible */
    <div className="fixed inset-0 flex items-end justify-end p-5">
      {/* ── Chat panel ── */}
      {isOpen && (
        <div className="mb-20 flex h-[520px] w-80 flex-col overflow-hidden rounded-2xl border border-neutral-200 shadow-2xl">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between bg-[#101313] px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: accentColor }}
              >
                <Bot className="h-5 w-5 text-neutral-950" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">OmniFlow AI</p>
                <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online · AI-powered
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isUser
                        ? "rounded-br-sm bg-neutral-950 text-white"
                        : "rounded-bl-sm border border-neutral-200 bg-white text-neutral-900"
                    }`}
                  >
                    {!isUser && (
                      <p className="mb-0.5 text-xs font-semibold text-cyan-600">
                        OmniFlow AI
                      </p>
                    )}
                    <p className="max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {msg.body}
                    </p>
                    <p className="mt-1 text-right text-[10px] text-neutral-400">
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-500 shadow-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>AI is typing…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="shrink-0 border-t border-neutral-200 bg-white p-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-cyan-100"
              style={{ borderColor: undefined }}
            >
              <input
                className="flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                placeholder="Ask a question…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={isSending}
                autoFocus
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-950 transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: accentColor }}
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-neutral-400">
              Powered by OmniFlow AI
            </p>
          </form>
        </div>
      )}

      {/* ── Floating bubble ── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{ backgroundColor: isOpen ? "#1a1a1a" : accentColor }}
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-105"
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-neutral-950" />
        )}
      </button>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense>
      <WidgetChat />
    </Suspense>
  );
}
