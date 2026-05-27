"use client";

import {
  Bot,
  Loader2,
  LogOut,
  MessageCircle,
  Send,
  X,
  Zap,
  ShieldCheck,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  CalendarCheck,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { clearMockUser, getMockUserSnapshot, type MockUser } from "@/lib/auth";

/* ── Local chat types (no backend) ─────────────────────────────────────── */
type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  body: string;
  created_at: string;
};

const GREETING: ChatMessage = {
  id: "__greeting__",
  sender: "ai",
  body: "Hi! 👋 I'm the OmniFlow AI assistant. Ask me anything about our product — features, pricing, integrations, or how to get started!",
  created_at: new Date().toISOString(),
};

/* ── OmniFlow product Q&A ───────────────────────────────────────────────── */
const FAQ: { patterns: string[]; response: string }[] = [
  {
    patterns: ["what is omniflow", "what does omniflow", "about omniflow", "tell me about", "what is this", "how does omniflow work", "explain omniflow"],
    response:
      "OmniFlow AI is a business automation platform that unifies all your customer conversations — website chat, WhatsApp, and email — in one smart inbox.\n\nThe AI auto-replies using your own knowledge base, captures leads, books appointments, runs workflow rules, and escalates complex issues to your team. 🚀",
  },
  {
    patterns: ["feature", "what can it do", "what can you do", "capabilities", "what do you offer", "what does it include"],
    response:
      "Here's what OmniFlow includes:\n\n• 🤖 Unified AI inbox (website, WhatsApp, email)\n• 📋 Automatic lead capture from conversations\n• 📅 Appointment booking via chat\n• 📚 RAG knowledge base — upload your own docs & FAQs\n• ⚡ Workflow automation rules (if-then triggers)\n• 📊 Real-time analytics dashboard\n• 🚨 Human escalation with one click",
  },
  {
    patterns: ["price", "pricing", "cost", "how much", "plan", "subscription", "tier", "paid", "free"],
    response:
      "We offer three plans:\n\n• Starter — $49/mo: AI chat, unified inbox, lead capture\n• Growth — $149/mo ⭐: Everything in Starter + RAG knowledge base, appointment booking, workflow automation\n• Business — $399/mo: Everything in Growth + priority support, advanced integrations & custom automation\n\nScroll to the Pricing section above to compare plans in detail!",
  },
  {
    patterns: ["channel", "whatsapp", "email", "website", "facebook", "instagram", "integration", "connect", "platform", "which platform"],
    response:
      "OmniFlow currently supports four channels:\n\n• 💬 Website chat widget — embed with a single <script> tag\n• 📱 WhatsApp Business — connect your number via the Cloud API\n• 📘 Facebook Messenger — connect your page via webhook\n• ✉️ Email — forward your support inbox to OmniFlow\n\nAll channels land in the same unified inbox, so your team never misses a message.",
  },
  {
    patterns: ["rag", "knowledge base", "document", "upload", "faq", "pdf", "file", "train"],
    response:
      "OmniFlow uses Retrieval-Augmented Generation (RAG). You upload your own docs — FAQs, product guides, pricing sheets, SOPs — and the AI answers customer questions directly from that content.\n\nSupported formats: TXT, Markdown, and PDF. Once uploaded, chunks are indexed instantly and used in every conversation.",
  },
  {
    patterns: ["lead", "capture lead", "lead capture", "email capture", "contact info"],
    response:
      "OmniFlow automatically extracts leads from conversations. When a customer mentions their name, email, or phone number in chat, it's saved as a lead in the Leads dashboard — no forms needed.\n\nLeads are tagged with the channel they came from and the topic they enquired about.",
  },
  {
    patterns: ["book", "appointment", "schedule", "meeting", "slot", "booking", "calendar"],
    response:
      "Customers can book appointments directly inside the chat. When someone asks to book, the AI presents available time slots. Once they confirm a slot, the booking is logged instantly in the Bookings dashboard with their contact details.",
  },
  {
    patterns: ["workflow", "automation", "rule", "trigger", "automate", "if then"],
    response:
      "Workflows let you create if-then automation rules that run on every incoming message. For example:\n\n• If message contains \"refund\" → escalate to human\n• If message contains \"pricing\" → send a custom reply\n• If message contains \"demo\" → tag as lead\n\nYou can toggle rules on/off and see a live activity log.",
  },
  {
    patterns: ["escalat", "human", "agent", "transfer", "handoff", "support team"],
    response:
      "When a conversation needs a human touch, OmniFlow can escalate it — either via a workflow rule or manually with one click from the inbox. Once escalated, AI replies pause and your team takes over.",
  },
  {
    patterns: ["analytic", "report", "stat", "metric", "dashboard", "insight", "chart"],
    response:
      "The Analytics dashboard shows:\n\n• Total conversations, AI replies, leads captured\n• Appointments booked & escalations\n• Daily conversation chart (last 7 days)\n• Lead growth chart (last 7 days)\n\nAll stats update in real time as conversations come in.",
  },
  {
    patterns: ["get started", "sign up", "register", "create account", "start", "try", "onboard"],
    response:
      "Getting started is easy:\n\n1. Click **Get Started Free** in the top nav\n2. Create your account\n3. Connect a channel (or use the demo inbox)\n4. Upload a knowledge doc\n5. Your AI is live! 🎉\n\nNo credit card required to explore the demo.",
  },
  {
    patterns: ["demo", "show me", "example", "how does it look", "preview"],
    response:
      "You're already in the demo! 😄 This very widget is powered by the OmniFlow product assistant.\n\nTo see the full business inbox in action, click **View Dashboard** → sign in → you'll see the Inbox, Knowledge Base, Leads, Bookings, Workflows, and Analytics — all live.",
  },
  {
    patterns: ["hello", "hi ", "hey", "hi!", "good morning", "good afternoon", "howdy"],
    response: "Hey there! 👋 I'm the OmniFlow product assistant. Ask me about our features, pricing, integrations, or anything else about the platform!",
  },
  {
    patterns: ["thank", "thanks", "great", "awesome", "perfect", "helpful"],
    response: "Happy to help! 😊 Is there anything else you'd like to know about OmniFlow? You can also click **Get Started Free** to create your account.",
  },
];

function getOmniFlowResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const { patterns, response } of FAQ) {
    if (patterns.some((p) => lower.includes(p))) return response;
  }
  return "That's a great question! I'm focused on answering questions about OmniFlow AI — features, pricing, channels, knowledge base, and more.\n\nCould you rephrase, or ask something like:\n• \"What features does OmniFlow have?\"\n• \"How much does it cost?\"\n• \"How does the knowledge base work?\"";
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const FEATURES = [
  {
    Icon: Zap,
    title: "AI-Powered Inbox",
    desc: "Unify website, WhatsApp, Facebook Messenger, and email conversations in one smart workspace.",
  },
  {
    Icon: BookOpen,
    title: "RAG Knowledge Base",
    desc: "Upload your own PDFs, FAQs, and docs — the AI answers from your content accurately.",
  },
  {
    Icon: Users,
    title: "Lead Capture",
    desc: "Automatically extract names, emails, and intent from conversations — no forms needed.",
  },
  {
    Icon: CalendarCheck,
    title: "Appointment Booking",
    desc: "Customers book slots directly in chat. Confirmations saved instantly to the Bookings dashboard.",
  },
  {
    Icon: GitBranch,
    title: "Workflow Automation",
    desc: "Create if-then rules to auto-reply, tag leads, or escalate — triggered by keywords in any message.",
  },
  {
    Icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Track conversations, AI replies, leads, bookings, and escalations at a glance.",
  },
];

const PLANS = [
  { name: "Starter", price: "$49", features: ["AI chat", "Unified inbox", "Lead capture"] },
  { name: "Growth", price: "$149", features: ["Everything in Starter", "RAG knowledge base", "Appointment booking", "Workflow automation"], highlight: true },
  { name: "Business", price: "$399", features: ["Everything in Growth", "Priority support", "Advanced integrations", "Custom automation"] },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function LandingPage() {
  const router = useRouter();

  /* ── Auth state ─────────────────────────────────────────────────── */
  const [user, setUser] = useState<MockUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getMockUserSnapshot());
  }, []);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  function handleLogout() {
    clearMockUser();
    setUser(null);
    setShowUserMenu(false);
  }

  /* ── Chat widget state ──────────────────────────────────────────── */
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      body: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setIsSending(true);

    /* Simulate a short typing delay then respond locally */
    await new Promise((r) => setTimeout(r, 700));

    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      sender: "ai",
      body: getOmniFlowResponse(text),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    if (!isOpen) setUnreadCount((n) => n + 1);
    setIsSending(false);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-neutral-900">

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-10 border-b border-white/10 bg-[#101313]/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-300 text-neutral-950">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white">OmniFlow AI</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-neutral-300 sm:flex">
            <button type="button" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-white">Features</button>
            <button type="button" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-white">Pricing</button>
            <button type="button" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-white">How it Works</button>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              /* ── Logged-in avatar + dropdown ── */
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300 text-xs font-bold text-neutral-950 transition hover:bg-cyan-200"
                  aria-label="User menu"
                >
                  {getInitials(user.name)}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-52 rounded-lg border border-white/10 bg-[#1a2020] p-3 shadow-xl">
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-xs text-neutral-400">{user.email}</p>
                    <div className="my-2 border-t border-white/10" />
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard")}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-300 transition hover:bg-white/10 hover:text-white"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Go to Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-300 transition hover:bg-white/10 hover:text-white"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Signed-out CTA ── */
              <Link
                href="/login"
                className="rounded-md bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-neutral-950 transition hover:bg-cyan-200"
              >
                Get Started Free
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="bg-linear-to-br from-[#101313] via-[#0d1f1f] to-[#101313] px-6 py-24 text-center text-white">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-sm text-cyan-300">
            <Zap className="h-3.5 w-3.5" />
            AI-Powered Business Automation
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Automate Every<br />
            <span className="text-cyan-300">Customer Touchpoint</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-300">
            Unified inbox, AI auto-replies, lead capture, appointment booking, and
            workflow automation — all powered by RAG and your own knowledge base.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-cyan-300 px-6 py-3 font-semibold text-neutral-950 transition hover:bg-cyan-200"
            >
              <MessageCircle className="h-5 w-5" />
              Chat with our AI
            </button>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              View Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            👆 Click &ldquo;Chat with our AI&rdquo; to see the live widget in action
          </p>
        </div>
      </section>

      {/* ── Features grid ──────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-16 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-neutral-800">
            Everything you need to automate customer conversations
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-cyan-300 hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-lg bg-cyan-50 p-2.5">
                  <Icon className="h-5 w-5 text-cyan-600" />
                </div>
                <h3 className="font-semibold text-neutral-800">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-16 bg-white px-6 py-20 text-neutral-900">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">How it Works</p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              Up and running in three steps
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-500">
              No complex setup. Connect your channels, add your knowledge, and let OmniFlow handle the rest.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect your channels",
                desc: "Link your website chat widget, WhatsApp Business, and Facebook Messenger in minutes — no code required.",
                accent: "bg-cyan-300 text-neutral-950",
              },
              {
                step: "02",
                title: "Upload your knowledge",
                desc: "Add your FAQs, product docs, and SOPs. The AI uses RAG to answer customer questions accurately from your own content.",
                accent: "bg-cyan-300 text-neutral-950",
              },
              {
                step: "03",
                title: "Automate and grow",
                desc: "The AI captures leads, books appointments, runs workflows, and escalates to your team only when truly needed.",
                accent: "bg-cyan-300 text-neutral-950",
              },
            ].map(({ step, title, desc, accent }) => (
              <div key={step} className="relative flex flex-col gap-4">
                {/* Connector line between steps (hidden on last) */}
                <div className="flex items-center gap-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${accent}`}>
                    {step}
                  </span>
                  <div className="h-px flex-1 bg-white/10 sm:hidden" />
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500">{desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-16 bg-neutral-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-neutral-800">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-500">
            Ask the AI below about our plans — it answers from our knowledge base.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 ${
                  plan.highlight
                    ? "border-cyan-300 bg-[#101313] text-white shadow-xl"
                    : "border-neutral-200 bg-white"
                }`}
              >
                {plan.highlight && (
                  <span className="mb-3 inline-block rounded-full bg-cyan-300 px-3 py-0.5 text-xs font-bold text-neutral-950">
                    Most Popular
                  </span>
                )}
                <p className={`text-sm font-semibold ${plan.highlight ? "text-neutral-400" : "text-neutral-500"}`}>
                  {plan.name}
                </p>
                <p className={`mt-1 text-3xl font-bold ${plan.highlight ? "text-white" : "text-neutral-900"}`}>
                  {plan.price}
                  <span className={`text-sm font-normal ${plan.highlight ? "text-neutral-400" : "text-neutral-500"}`}>
                    /mo
                  </span>
                </p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-cyan-300" : "text-emerald-500"}`} />
                      <span className={plan.highlight ? "text-neutral-300" : "text-neutral-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setIsOpen(true)}
                  className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-cyan-300 text-neutral-950 hover:bg-cyan-200"
                      : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Get started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200 bg-white px-6 py-8 text-center text-sm text-neutral-400">
        <p>© 2026 OmniFlow AI · Built for the SummerShip Challenge ·{" "}
          <Link href="/login" className="text-cyan-600 hover:underline">
            Sign in
          </Link>
        </p>
      </footer>

      {/* ══════════════════════════════════════════════════════════════════
          CHAT WIDGET — floating bubble + panel
      ══════════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div className="fixed bottom-24 right-5 z-50 flex h-135 w-90 flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/10 sm:right-6">
          <div className="flex shrink-0 items-center justify-between bg-[#101313] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300 text-neutral-950">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">OmniFlow AI</p>
                <p className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online · AI-powered
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isUser
                        ? "rounded-br-sm bg-neutral-950 text-white"
                        : "rounded-bl-sm border border-neutral-200 bg-white text-neutral-900"
                    }`}
                  >
                    {!isUser && (
                      <p className="mb-1 text-xs font-semibold text-cyan-600">OmniFlow AI</p>
                    )}
                    <p className="leading-relaxed">{msg.body}</p>
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

          <form onSubmit={handleSend} className="shrink-0 border-t border-neutral-200 bg-white p-3">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 transition focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300 text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-neutral-400">
              OmniFlow product assistant ·{" "}
              <Link href="/login" className="text-cyan-500 hover:underline">
                Get started free →
              </Link>
            </p>
          </form>
        </div>
      )}

      {/* Floating chat bubble */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`fixed bottom-6 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-105 sm:right-6 ${
          isOpen ? "bg-neutral-800 text-white" : "bg-[#101313] text-white"
        }`}
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-xs font-bold text-neutral-950">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
