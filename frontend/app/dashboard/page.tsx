"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  FileText,
  Home,
  Info,
  Inbox,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  Plus,
  Send,
  Settings,
  Smartphone,
  Trash2,
  UserRound,
  UsersRound,
  Workflow as WorkflowIcon,
  X,
  Zap,
  AtSign,
  ExternalLink,
  Phone,
  Tag,
  Globe,
  Camera,
  Share2,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  API_BASE_URL,
  AiStatus,
  AnalyticsSummary,
  Booking,
  Channel,
  Conversation,
  ConversationStatus,
  assignConversation,
  createWorkflow,
  deleteWorkflow,
  escalateConversation,
  sendAgentMessage,
  updateConversationStatus,
  fetchAnalytics,
  fetchAiStatus,
  fetchBookings,
  fetchConversations,
  fetchDocuments,
  fetchLeads,
  fetchMessages,
  fetchWorkflowLogs,
  fetchWorkflows,
  KnowledgeDocument,
  Lead,
  Message,
  NameValue,
  streamMessage,
  syncLeadsToSheets,
  toggleWorkflow,
  uploadDocument,
  Workflow,
  WorkflowAction,
  WorkflowCondition,
  WorkflowCreate,
  WorkflowLog,
} from "@/lib/api";
import { clearMockUser, getMockUserSnapshot } from "@/lib/auth";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type NavSection = "Overview" | "Inbox" | "Knowledge Base" | "Leads" | "Bookings" | "Workflows" | "Settings";

const navItems: { label: NavSection; icon: typeof BarChart3 }[] = [
  { label: "Overview", icon: BarChart3 },
  { label: "Inbox", icon: Inbox },
  { label: "Knowledge Base", icon: FileText },
  { label: "Leads", icon: UsersRound },
  { label: "Bookings", icon: CalendarDays },
  { label: "Workflows", icon: WorkflowIcon },
  { label: "Settings", icon: Settings },
];

const channelMeta: Record<Channel, { label: string; icon: typeof MessageSquareText }> = {
  website:   { label: "Website",   icon: MessageSquareText },
  whatsapp:  { label: "WhatsApp",  icon: Smartphone },
  email:     { label: "Email",     icon: Mail },
  facebook:  { label: "Facebook",  icon: Share2 },
  instagram: { label: "Instagram", icon: Camera },
};

type ChannelTheme = {
  avatarBg:   string;
  badgeBg:    string;
  chatBg:     string;
  userBubble: string;
  userBadge:  string;
  userTime:   string;
  sendBtn:    string;
  focusRing:  string;
  headerBar:  string | null;
};

const channelTheme: Record<Channel, ChannelTheme> = {
  website: {
    avatarBg:   "bg-indigo-600",
    badgeBg:    "bg-indigo-50 text-indigo-700 ring-indigo-200",
    chatBg:     "bg-neutral-50",
    userBubble: "bg-neutral-950 text-white",
    userBadge:  "bg-white/15 text-white",
    userTime:   "text-neutral-300",
    sendBtn:    "bg-cyan-300 hover:bg-cyan-200 text-neutral-950",
    focusRing:  "focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100",
    headerBar:  null,
  },
  whatsapp: {
    avatarBg:   "bg-[#25D366]",
    badgeBg:    "bg-green-50 text-green-700 ring-green-200",
    chatBg:     "bg-[#efeae2]",
    userBubble: "bg-[#dcf8c6] text-neutral-900",
    userBadge:  "bg-green-200 text-green-800",
    userTime:   "text-neutral-500",
    sendBtn:    "bg-[#25D366] hover:bg-green-500 text-white",
    focusRing:  "focus:border-green-400 focus:ring-2 focus:ring-green-100",
    headerBar:  "bg-[#075E54]",
  },
  email: {
    avatarBg:   "bg-amber-500",
    badgeBg:    "bg-amber-50 text-amber-700 ring-amber-200",
    chatBg:     "bg-neutral-50",
    userBubble: "bg-amber-600 text-white",
    userBadge:  "bg-white/20 text-white",
    userTime:   "text-amber-100",
    sendBtn:    "bg-amber-400 hover:bg-amber-300 text-neutral-950",
    focusRing:  "focus:border-amber-400 focus:ring-2 focus:ring-amber-100",
    headerBar:  "bg-amber-500",
  },
  facebook: {
    avatarBg:   "bg-[#1877F2]",
    badgeBg:    "bg-blue-50 text-blue-700 ring-blue-200",
    chatBg:     "bg-neutral-50",
    userBubble: "bg-[#1877F2] text-white",
    userBadge:  "bg-white/20 text-white",
    userTime:   "text-blue-100",
    sendBtn:    "bg-[#1877F2] hover:bg-blue-500 text-white",
    focusRing:  "focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
    headerBar:  "bg-[#1877F2]",
  },
  instagram: {
    avatarBg:   "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
    badgeBg:    "bg-pink-50 text-pink-700 ring-pink-200",
    chatBg:     "bg-neutral-50",
    userBubble: "bg-gradient-to-r from-purple-600 to-pink-500 text-white",
    userBadge:  "bg-white/20 text-white",
    userTime:   "text-pink-100",
    sendBtn:    "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white",
    focusRing:  "focus:border-pink-400 focus:ring-2 focus:ring-pink-100",
    headerBar:  "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400",
  },
};

const statusClass: Record<ConversationStatus | "resolved", string> = {
  active:    "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lead:      "bg-cyan-50 text-cyan-700 ring-cyan-200",
  booked:    "bg-indigo-50 text-indigo-700 ring-indigo-200",
  escalated: "bg-rose-50 text-rose-700 ring-rose-200",
  resolved:  "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

const interestColors: Record<string, string> = {
  "Demo request": "bg-violet-50 text-violet-700 ring-violet-200",
  "Appointment booking": "bg-indigo-50 text-indigo-700 ring-indigo-200",
  "Pricing inquiry": "bg-amber-50 text-amber-700 ring-amber-200",
  "Billing / refund": "bg-rose-50 text-rose-700 ring-rose-200",
  "Integration inquiry": "bg-sky-50 text-sky-700 ring-sky-200",
  "General inquiry": "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

type Toast = { id: string; message: string; kind: "success" | "error" | "info" };
type AppNotification = {
  id: string;
  message: string;
  kind: "lead" | "booking" | "escalation";
  conversationId: string;
  time: string;
  read: boolean;
};
const AGENT_ROSTER = ["Priya", "Support Team", "Sales Team", "Unassigned"];

export default function DashboardPage() {
  const router = useRouter();
  // undefined = auth not checked yet (loading), null = no session, MockUser = logged in
  const [user, setUser] = useState<ReturnType<typeof getMockUserSnapshot> | undefined>(undefined);

  useEffect(() => {
    setUser(getMockUserSnapshot());
  }, []);

  const [activeSection, setActiveSection] = useState<NavSection>("Inbox");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [draftMessage, setDraftMessage] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isSending, setIsSending]         = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [humanDraft, setHumanDraft] = useState("");
  const [isSendingHuman, setIsSendingHuman] = useState(false);

  // Workflows state
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  // Workflow form state
  const [wfName, setWfName] = useState("");
  const [wfTrigger, setWfTrigger] = useState("");
  const [wfCondition, setWfCondition] = useState<WorkflowCondition>("contains");
  const [wfAction, setWfAction] = useState<WorkflowAction>("escalate");
  const [wfActionValue, setWfActionValue] = useState("");
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Notification state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const prevConversationsRef = useRef<Conversation[]>([]);

  // Team assignment state
  const [isAssigning, setIsAssigning] = useState(false);

  // SSE real-time state
  const [sseConnected, setSseConnected] = useState(false);

  // Channel filter for inbox
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");

  // Widget settings
  const WIDGET_GREETING_KEY = "omniflow_widget_greeting";
  const DEFAULT_GREETING    = "Hi! 👋 I'm OmniFlow AI. How can I help you today?";
  const [widgetGreeting, setWidgetGreeting] = useState(DEFAULT_GREETING);
  const [widgetOrigin, setWidgetOrigin]     = useState("");
  const [snippetCopied, setSnippetCopied]   = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(WIDGET_GREETING_KEY);
    if (saved) setWidgetGreeting(saved);
    setWidgetOrigin(window.location.origin);
  }, []);

  function saveWidgetGreeting() {
    localStorage.setItem(WIDGET_GREETING_KEY, widgetGreeting);
    addToast("Widget greeting saved!");
  }

  function copySnippet() {
    const snippet = `<script src="${widgetOrigin}/widget.js"\n  data-greeting="${widgetGreeting}"\n  data-color="#22d3ee">\n</script>`;
    navigator.clipboard.writeText(snippet).then(() => {
      setSnippetCopied(true);
      setTimeout(() => setSnippetCopied(false), 2000);
    });
  }

  const addToast = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    }
  }, [router, user]);

  useEffect(() => {
    let isMounted = true;

    // Pre-fetch ALL sections in parallel so every tab opens instantly
    Promise.all([
      fetchConversations(),
      fetchAiStatus(),
      fetchDocuments(),
      fetchLeads(),
      fetchBookings(),
      fetchAnalytics(),
      fetchWorkflows(),
      fetchWorkflowLogs(),
    ])
      .then(([convData, statusData, docData, leadData, bookingData, analyticsData, wfData, wfLogData]) => {
        if (!isMounted) return;
        prevConversationsRef.current = convData;
        setConversations(convData);
        setAiStatus(statusData);
        setDocuments(docData);
        setLeads(leadData);
        setBookings(bookingData);
        setAnalytics(analyticsData);
        setWorkflows(wfData);
        setWorkflowLogs(wfLogData);
        setSelectedConversationId((currentId) => currentId || convData[0]?.id || "");
        setErrorMessage("");
      })
      .catch(() => {
        if (isMounted) setErrorMessage("Could not load dashboard. Check the backend server.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingConversations(false);
          setIsLoadingLeads(false);
          setIsLoadingBookings(false);
          setIsLoadingAnalytics(false);
          setIsLoadingWorkflows(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  // Silently refresh leads when Leads tab is opened (no spinner if data already loaded)
  useEffect(() => {
    if (activeSection !== "Leads") return;
    let isMounted = true;
    if (leads.length === 0) setIsLoadingLeads(true);
    fetchLeads()
      .then((data) => { if (isMounted) setLeads(data); })
      .catch(() => {})
      .finally(() => { if (isMounted) setIsLoadingLeads(false); });
    return () => { isMounted = false; };
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Silently refresh workflows when Workflows tab is opened
  useEffect(() => {
    if (activeSection !== "Workflows") return;
    let isMounted = true;
    if (workflows.length === 0) setIsLoadingWorkflows(true);
    Promise.all([fetchWorkflows(), fetchWorkflowLogs()])
      .then(([wfData, logData]) => {
        if (!isMounted) return;
        setWorkflows(wfData);
        setWorkflowLogs(logData);
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setIsLoadingWorkflows(false); });
    return () => { isMounted = false; };
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Silently refresh analytics when Overview tab is opened
  useEffect(() => {
    if (activeSection !== "Overview") return;
    let isMounted = true;
    if (!analytics) setIsLoadingAnalytics(true);
    fetchAnalytics()
      .then((data) => { if (isMounted) setAnalytics(data); })
      .catch(() => {})
      .finally(() => { if (isMounted) setIsLoadingAnalytics(false); });
    return () => { isMounted = false; };
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Silently refresh bookings when Bookings tab is opened
  useEffect(() => {
    if (activeSection !== "Bookings") return;
    let isMounted = true;
    if (bookings.length === 0) setIsLoadingBookings(true);
    fetchBookings()
      .then((data) => { if (isMounted) setBookings(data); })
      .catch(() => {})
      .finally(() => { if (isMounted) setIsLoadingBookings(false); });
    return () => { isMounted = false; };
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedConversationId) return;
    let isMounted = true;

    fetchMessages(selectedConversationId)
      .then((data) => {
        if (isMounted) {
          setMessages(data);
          setErrorMessage("");
        }
      })
      .catch(() => {
        if (isMounted) setErrorMessage("Could not load messages for this conversation.");
      });

    return () => { isMounted = false; };
  }, [selectedConversationId]);

  // Auto-scroll to bottom whenever messages update or the typing indicator appears
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // ↑ / ↓ keyboard navigation for conversation list
  useEffect(() => {
    if (activeSection !== "Inbox") return;
    function handleKey(e: KeyboardEvent) {
      // Don't steal keys while the user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      if (conversations.length === 0) return;
      const idx = conversations.findIndex((c) => c.id === selectedConversationId);
      let next = idx;
      if (e.key === "ArrowUp")   next = Math.max(0, idx - 1);
      if (e.key === "ArrowDown") next = Math.min(conversations.length - 1, idx + 1);
      if (next !== idx) setSelectedConversationId(conversations[next].id);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeSection, conversations, selectedConversationId]);


  const filteredConversations = useMemo(
    () => channelFilter === "all"
      ? conversations
      : conversations.filter((c) => c.channel === channelFilter),
    [conversations, channelFilter],
  );

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const selectedTheme = useMemo(
    () => channelTheme[selectedConversation?.channel ?? "website"],
    [selectedConversation],
  );

  const metrics = useMemo(
    () => [
      {
        label: "Total chats",
        value: conversations.length.toString(),
        detail: "Across all channels",
      },
      {
        label: "AI replies",
        value: messages.filter((m) => m.sender === "ai").length.toString(),
        detail: "Selected thread",
      },
      {
        label: "Leads captured",
        value: conversations.filter((c) => c.status === "lead").length.toString(),
        detail: "View in Leads tab",
        action: () => setActiveSection("Leads"),
      },
      {
        label: "Appointments booked",
        value: conversations.filter((c) => c.status === "booked").length.toString(),
        detail: "View in Bookings tab",
        action: () => setActiveSection("Bookings"),
      },
    ],
    [conversations, messages],
  );

  function handleLogout() {
    clearMockUser();
    router.push("/");
  }

  async function refreshConversations() {
    const data = await fetchConversations();
    setConversations(data);
  }

  // Close notification panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  // Helper: diff conversations and emit notifications on status change
  function diffAndNotify(prev: Conversation[], next: Conversation[]) {
    const prevById = new Map(prev.map((c) => [c.id, c]));
    for (const conv of next) {
      const old = prevById.get(conv.id);
      if (!old || old.status === conv.status) continue;
      if (conv.status === "escalated") {
        addAppNotification(`🔴 ${conv.customer_name} needs human support`, "escalation", conv.id);
      } else if (conv.status === "lead") {
        addAppNotification(`🟢 New lead captured: ${conv.customer_name}`, "lead", conv.id);
      } else if (conv.status === "booked") {
        addAppNotification(`📅 ${conv.customer_name} booked an appointment`, "booking", conv.id);
      }
    }
  }

  // Real-time conversation updates via SSE, with polling fallback
  useEffect(() => {
    if (activeSection !== "Inbox") return;

    let es: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    function startPollingFallback() {
      setSseConnected(false);
      fallbackInterval = setInterval(async () => {
        try {
          const data = await fetchConversations();
          diffAndNotify(prevConversationsRef.current, data);
          prevConversationsRef.current = data;
          setConversations(data);
        } catch {
          // silently ignore poll errors
        }
      }, 8000);
    }

    try {
      es = new EventSource(`${API_BASE_URL}/stream/conversations`);

      es.onopen = () => {
        setSseConnected(true);
        // Cancel fallback polling if SSE reconnects
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      };

      es.onmessage = (evt) => {
        try {
          const event = JSON.parse(evt.data) as { type: string; conversation?: Conversation };
          if (event.type === "ping") return;
          if (event.type === "update" && event.conversation) {
            const updated = event.conversation;
            setConversations((prev) => {
              const exists = prev.some((c) => c.id === updated.id);
              const next = exists
                ? prev.map((c) => (c.id === updated.id ? updated : c))
                : [updated, ...prev];
              // Sort by updated_at desc so newest stays at top
              next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
              diffAndNotify(prevConversationsRef.current, next);
              prevConversationsRef.current = next;
              return next;
            });
          }
        } catch {
          // skip malformed events
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        setSseConnected(false);
        if (!fallbackInterval) startPollingFallback();
      };
    } catch {
      startPollingFallback();
    }

    return () => {
      es?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      setSseConnected(false);
    };
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time message updates via SSE for the selected conversation (polling fallback)
  useEffect(() => {
    if (activeSection !== "Inbox" || !selectedConversationId) return;

    let es: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    function startMsgPollingFallback() {
      fallbackInterval = setInterval(async () => {
        try {
          const data = await fetchMessages(selectedConversationId);
          setMessages(data);
        } catch {
          // silently ignore
        }
      }, 5000);
    }

    try {
      es = new EventSource(`${API_BASE_URL}/stream/messages/${selectedConversationId}`);

      es.onmessage = (evt) => {
        try {
          const event = JSON.parse(evt.data) as { type: string; messages?: Message[] };
          if (event.type === "messages" && event.messages) {
            setMessages(event.messages);
          }
        } catch {
          // skip malformed events
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (!fallbackInterval) startMsgPollingFallback();
      };
    } catch {
      startMsgPollingFallback();
    }

    return () => {
      es?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [activeSection, selectedConversationId]);

  async function handleUploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      addToast("Choose a TXT, Markdown, or PDF file first.", "info");
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await uploadDocument(selectedFile);
      setDocuments((prev) => [uploaded, ...prev]);
      setSelectedFile(null);
      event.currentTarget.reset();
      addToast(`"${uploaded.name}" added to the knowledge base.`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Document upload failed.", "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversation || !draftMessage.trim()) return;

    const outgoing = draftMessage.trim();
    setDraftMessage("");
    setIsSending(true);

    // Optimistic user message
    const tempUserId = `u-${Date.now()}`;
    const userMsg: Message = {
      id: tempUserId,
      conversation_id: selectedConversation.id,
      sender: "user",
      body: outgoing,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Empty AI bubble that will fill with streaming tokens
    const streamId = `stream-${Date.now()}`;
    const aiPlaceholder: Message = {
      id: streamId,
      conversation_id: selectedConversation.id,
      sender: "ai",
      body: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiPlaceholder]);
    setStreamingMsgId(streamId);

    try {
      for await (const evt of streamMessage(selectedConversation.id, outgoing)) {
        if (evt.type === "token") {
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, body: m.body + evt.token } : m)),
          );
        } else if (evt.type === "done") {
          setMessages(evt.messages);
          setStreamingMsgId(null);
          await refreshConversations();
        }
      }
    } catch {
      setStreamingMsgId(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamId
            ? { ...m, body: "Sorry, I couldn't reach the server. Please try again." }
            : m,
        ),
      );
      setDraftMessage(outgoing);
      addToast("Message failed to send. Check the backend server.", "error");
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateWorkflow(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!wfName.trim() || !wfTrigger.trim()) return;
    if (wfAction === "send_reply" && !wfActionValue.trim()) {
      addToast("A reply text is required for the 'Send custom reply' action.", "error");
      return;
    }
    setIsCreatingWorkflow(true);
    try {
      const payload: WorkflowCreate = {
        name: wfName.trim(),
        trigger: wfTrigger.trim(),
        condition: wfCondition,
        action: wfAction,
        action_value: wfActionValue.trim(),
      };
      const created = await createWorkflow(payload);
      setWorkflows((prev) => [...prev, created]);
      setWfName(""); setWfTrigger(""); setWfActionValue("");
      setWfCondition("contains"); setWfAction("escalate");
      addToast("Rule created successfully.");
    } catch {
      addToast("Failed to create rule. Check the backend server.", "error");
    } finally {
      setIsCreatingWorkflow(false);
    }
  }

  async function handleDeleteWorkflow(id: string) {
    try {
      await deleteWorkflow(id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      addToast("Rule deleted.", "info");
    } catch {
      addToast("Failed to delete rule.", "error");
    }
  }

  async function handleToggleWorkflow(id: string) {
    try {
      const updated = await toggleWorkflow(id);
      setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch {
      addToast("Failed to toggle rule.", "error");
    }
  }

  function exportLeadsCSV() {
    if (leads.length === 0) return;
    const header = "Name,Email,Phone,Interest,Channel,Captured At";
    const rows = leads.map((l) =>
      [l.customer_name, l.email, l.phone ?? "", l.interest, l.channel, l.created_at]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv  = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `omniflow-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${leads.length} lead${leads.length !== 1 ? "s" : ""} as CSV.`);
  }

  function exportBookingsCSV() {
    if (bookings.length === 0) return;
    const header = "Name,Email,Slot,Channel,Booked At";
    const rows = bookings.map((b) =>
      [b.customer_name, b.email ?? "", b.slot, b.channel, b.created_at]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv  = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `omniflow-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${bookings.length} booking${bookings.length !== 1 ? "s" : ""} as CSV.`);
  }

  async function handleSyncSheets() {
    setIsSyncingSheets(true);
    try {
      const result = await syncLeadsToSheets();
      if (result.synced === 0) {
        addToast("Google Sheets not configured — set GOOGLE_SHEETS_ID in backend/.env", "info");
      } else {
        addToast(`✅ Synced ${result.synced} lead${result.synced !== 1 ? "s" : ""} to Google Sheets!`, "success");
      }
    } catch {
      addToast("Sheets sync failed. Check backend logs.", "error");
    } finally {
      setIsSyncingSheets(false);
    }
  }

  function addAppNotification(
    message: string,
    kind: AppNotification["kind"],
    conversationId: string,
  ) {
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      kind,
      conversationId,
      time: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 20));
  }

  async function handleAssign(agent: string) {
    if (!selectedConversation) return;
    setIsAssigning(true);
    try {
      const updated = await assignConversation(selectedConversation.id, agent);
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      addToast(`Assigned to ${agent === "Unassigned" ? "nobody" : agent}.`);
    } catch {
      addToast("Failed to assign conversation.", "error");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!selectedConversation) return;
    try {
      const updated = await updateConversationStatus(
        selectedConversation.id,
        newStatus as ConversationStatus | "resolved",
      );
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      addToast(`Status changed to ${newStatus}.`);
    } catch {
      addToast("Failed to update status.", "error");
    }
  }

  async function handleEscalate() {
    if (!selectedConversation || selectedConversation.status === "escalated") return;
    setIsEscalating(true);
    try {
      const updated = await escalateConversation(selectedConversation.id);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      // Refresh messages so the auto-generated handoff message appears in chat
      const updatedMessages = await fetchMessages(selectedConversation.id);
      setMessages(updatedMessages);
      addToast("Conversation transferred to human agent.");
    } catch {
      addToast("Could not escalate conversation. Check the backend server.", "error");
    } finally {
      setIsEscalating(false);
    }
  }

  async function handleHumanReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversation || !humanDraft.trim()) return;
    const text = humanDraft.trim();
    setHumanDraft("");
    setIsSendingHuman(true);
    try {
      const updatedMessages = await sendAgentMessage(selectedConversation.id, text);
      setMessages(updatedMessages);
      await refreshConversations();
    } catch {
      addToast("Failed to send message. Check the backend server.", "error");
      setHumanDraft(text);
    } finally {
      setIsSendingHuman(false);
    }
  }

  // Still reading localStorage — render nothing to avoid a flash
  if (user === undefined) return null;

  // No session — redirect effect will fire; show nothing in the meantime
  if (user === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101313] text-neutral-50">
        <div className="rounded-md border border-white/10 bg-white/4 px-4 py-3 text-sm text-neutral-300">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f7] text-neutral-950">
      <div className="flex min-h-screen">

        {/* ── Sidebar (fixed) ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-neutral-200 bg-[#101313] text-neutral-50 transition-all duration-300 ease-in-out lg:flex ${
            sidebarOpen ? "w-72" : "w-16"
          }`}
        >
          {/* Logo row + hamburger */}
          <div
            className={`flex shrink-0 items-center border-b border-white/10 py-4 ${
              sidebarOpen ? "justify-between px-4" : "justify-center px-2"
            }`}
          >
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-300 text-neutral-950">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">OmniFlow AI</p>
                    <p className="text-xs text-neutral-400">Automation MVP</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition hover:bg-white/10 hover:text-white"
                  type="button"
                  aria-label="Collapse sidebar"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition hover:bg-white/10 hover:text-white"
                type="button"
                aria-label="Expand sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
          </div>

          <nav className={`mt-3 flex-1 space-y-1 ${sidebarOpen ? "px-3" : "px-2"}`}>
            {/* Home — links back to landing page */}
            <button
              onClick={() => router.push("/")}
              title={!sidebarOpen ? "Home" : undefined}
              className={`flex h-10 w-full items-center rounded-md text-sm transition text-neutral-300 hover:bg-white/10 hover:text-white ${
                sidebarOpen ? "gap-3 px-3" : "justify-center px-0"
              }`}
              type="button"
            >
              <Home className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>Home</span>}
            </button>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.label === activeSection;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveSection(item.label)}
                  title={!sidebarOpen ? item.label : undefined}
                  className={`flex h-10 w-full items-center rounded-md text-sm transition ${
                    sidebarOpen ? "gap-3 px-3" : "justify-center px-0"
                  } ${
                    isActive
                      ? "bg-cyan-300 text-neutral-950"
                      : "text-neutral-300 hover:bg-white/10 hover:text-white"
                  }`}
                  type="button"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content (offset by fixed sidebar on lg) ── */}
        <section
          className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${
            sidebarOpen ? "lg:pl-72" : "lg:pl-16"
          }`}
        >

          {/* Top bar */}
          <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-500">
                  {activeSection}
                </p>
                <h1 className="text-2xl font-semibold">
                  Welcome back, {user.name.split(" ")[0]}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 md:block">
                  AI:{" "}
                  <span className="font-semibold capitalize text-neutral-950">
                    {aiStatus?.provider ?? "checking"}
                  </span>
                  {aiStatus ? (
                    <span className="ml-1 text-neutral-400">{aiStatus.model}</span>
                  ) : null}
                </div>
                {/* ── Notification bell ── */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen((o) => !o)}
                    className="relative flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-100"
                    type="button"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {notifications.filter((n) => !n.read).length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                        {notifications.filter((n) => !n.read).length > 9 ? "9+" : notifications.filter((n) => !n.read).length}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-neutral-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                        <p className="text-sm font-semibold">Notifications</p>
                        {notifications.some((n) => !n.read) && (
                          <button
                            onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                            className="text-xs text-cyan-600 hover:underline"
                            type="button"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="mx-auto h-8 w-8 text-neutral-200" />
                          <p className="mt-2 text-sm text-neutral-400">No notifications yet</p>
                          <p className="mt-1 text-xs text-neutral-400">Status changes appear here in real time.</p>
                        </div>
                      ) : (
                        <ul className="max-h-72 divide-y divide-neutral-100 overflow-y-auto">
                          {notifications.map((n) => (
                            <li
                              key={n.id}
                              onClick={() => {
                                setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
                                setActiveSection("Inbox");
                                setSelectedConversationId(n.conversationId);
                                setNotifOpen(false);
                              }}
                              className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-neutral-50 ${n.read ? "opacity-60" : ""}`}
                            >
                              <span className="mt-1 text-base leading-none">
                                {n.kind === "escalation" ? "🔴" : n.kind === "lead" ? "🟢" : "📅"}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-neutral-800">{n.message}</p>
                                <p className="mt-0.5 text-xs text-neutral-400">{formatDateTime(n.time)}</p>
                              </div>
                              {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <div className="hidden items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 sm:flex">
                  <UserRound className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-neutral-500">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex h-10 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>

            {/* Mobile nav */}
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.label === activeSection;
                return (
                  <button
                    key={item.label}
                    onClick={() => setActiveSection(item.label)}
                    className={`flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm ${
                      isActive
                        ? "bg-neutral-950 text-white"
                        : "border border-neutral-200 bg-white text-neutral-600"
                    }`}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </header>

          <div className="flex-1 p-5">

            {/* ── Metrics row (hidden on Inbox) ── */}
            {activeSection !== "Inbox" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <article
                    key={metric.label}
                    onClick={metric.action}
                    className={`rounded-lg border border-neutral-200 bg-white p-5 ${
                      metric.action ? "cursor-pointer transition hover:border-cyan-300 hover:shadow-sm" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-neutral-500">{metric.label}</p>
                    <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
                    <p className="mt-2 text-sm text-neutral-500">{metric.detail}</p>
                  </article>
                ))}
              </div>
            )}

            {errorMessage ? (
              <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {/* ══════════════════════════════════════
                INBOX section
            ══════════════════════════════════════ */}
            {activeSection === "Inbox" && (
              <section className="mt-5 grid h-160 overflow-hidden rounded-lg border border-neutral-200 bg-white xl:grid-cols-[360px_1fr]">
                <aside className="flex h-full flex-col overflow-hidden border-b border-neutral-200 xl:border-b-0 xl:border-r">
                  <div className="shrink-0 border-b border-neutral-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold">Conversations</h2>
                      {sseConnected ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-neutral-400">
                          <span className="h-2 w-2 rounded-full bg-neutral-300" />
                          Polling
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {channelFilter === "all"
                        ? `${filteredConversations.length} conversation${filteredConversations.length !== 1 ? "s" : ""} · all channels`
                        : `${filteredConversations.length} ${channelFilter} conversation${filteredConversations.length !== 1 ? "s" : ""}`}
                    </p>
                    {/* Channel filter */}
                    <select
                      value={channelFilter}
                      onChange={(e) => setChannelFilter(e.target.value as Channel | "all")}
                      className="mt-2 w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                      <option value="all">All channels</option>
                      <option value="website">🌐 Website</option>
                      <option value="whatsapp">📱 WhatsApp</option>
                      <option value="facebook">📘 Facebook</option>
                      <option value="instagram">📸 Instagram</option>
                      <option value="email">✉️ Email</option>
                    </select>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {/* Skeleton while loading */}
                    {isLoadingConversations && conversations.length === 0 && (
                      <div className="space-y-0">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex gap-3 border-b border-neutral-100 p-4 animate-pulse">
                            <div className="h-9 w-9 shrink-0 rounded-lg bg-neutral-200" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 w-3/4 rounded bg-neutral-200" />
                              <div className="h-3 w-1/2 rounded bg-neutral-100" />
                              <div className="h-3 w-full rounded bg-neutral-100" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty state */}
                    {!isLoadingConversations && filteredConversations.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                        <Inbox className="h-10 w-10 text-neutral-300" />
                        <p className="text-sm font-medium text-neutral-500">
                          {channelFilter === "all" ? "No conversations yet" : `No ${channelFilter} conversations`}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {channelFilter === "all"
                            ? "Embed the chat widget on your website to start receiving messages."
                            : "Messages from this channel will appear here automatically."}
                        </p>
                      </div>
                    )}

                    {filteredConversations.map((conversation) => {
                      const meta = channelMeta[conversation.channel];
                      const ChannelIcon = meta.icon;
                      const isSelected = conversation.id === selectedConversationId;

                      return (
                        <button
                          key={conversation.id}
                          onClick={() => {
                            setSelectedConversationId(conversation.id);
                            // Clear unread badge immediately when the user opens the conversation
                            if (conversation.unread_count > 0) {
                              setConversations((prev) =>
                                prev.map((c) =>
                                  c.id === conversation.id ? { ...c, unread_count: 0 } : c
                                )
                              );
                            }
                          }}
                          className={`flex w-full gap-3 border-b border-neutral-100 p-4 text-left transition ${
                            isSelected ? "bg-cyan-50" : "bg-white hover:bg-neutral-50"
                          }`}
                          type="button"
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white ${channelTheme[conversation.channel].avatarBg}`}>
                            <ChannelIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-semibold">
                                {conversation.customer_name}
                              </p>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {conversation.unread_count > 0 && (
                                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1 text-xs font-bold text-white">
                                    {conversation.unread_count}
                                  </span>
                                )}
                                <span className="text-xs text-neutral-500">
                                  {formatTime(conversation.updated_at)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-md px-2 py-1 text-xs font-medium ring-1 ${channelTheme[conversation.channel].badgeBg}`}>
                                {meta.label}
                              </span>
                              <span
                                className={`rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ${statusClass[conversation.status]}`}
                              >
                                {conversation.status}
                              </span>
                              {conversation.assigned_to && (
                                <span className="flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                                  <UserRound className="h-3 w-3" />
                                  {conversation.assigned_to}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm leading-5 text-neutral-500">
                              {conversation.last_message}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <div className="flex h-full min-w-0 flex-col overflow-hidden">
                  {selectedConversation ? (
                    <>
                      {/* Channel accent bar */}
                      {selectedTheme.headerBar && (
                        <div className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white ${selectedTheme.headerBar}`}>
                          {selectedConversation.channel === "whatsapp" && (
                            <><Smartphone className="h-3.5 w-3.5" /><span>WhatsApp Business · End-to-end encrypted</span></>
                          )}
                          {selectedConversation.channel === "email" && (
                            <><Mail className="h-3.5 w-3.5" /><span>Email Channel</span></>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-4">
                        <div>
                          <h2 className="text-lg font-semibold">
                            {selectedConversation.customer_name}
                          </h2>
                          <p className="mt-1 text-sm text-neutral-500">
                            {channelMeta[selectedConversation.channel].label} thread ·{" "}
                            updated {formatDateTime(selectedConversation.updated_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedConversation.status !== "escalated" && (
                            <button
                              onClick={handleEscalate}
                              disabled={isEscalating}
                              className="flex h-9 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                              type="button"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              {isEscalating ? "Transferring…" : "Escalate to Human"}
                            </button>
                          )}
                          {/* Live status dropdown */}
                          <select
                            value={selectedConversation.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className={`h-9 cursor-pointer rounded-md border px-3 text-sm font-medium capitalize outline-none transition ring-1 ${statusClass[selectedConversation.status as ConversationStatus] ?? "border-neutral-200 bg-white text-neutral-700 ring-neutral-200"}`}
                          >
                            <option value="active">active</option>
                            <option value="lead">lead</option>
                            <option value="booked">booked</option>
                            <option value="escalated">escalated</option>
                            <option value="resolved">resolved</option>
                          </select>

                          {/* Team assignment dropdown */}
                          <div className="flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                            <select
                              value={selectedConversation.assigned_to ?? "Unassigned"}
                              onChange={(e) => handleAssign(e.target.value)}
                              disabled={isAssigning}
                              className="h-9 cursor-pointer rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-600 outline-none transition hover:bg-neutral-50 disabled:opacity-50"
                              title="Assign to agent"
                            >
                              {AGENT_ROSTER.map((a) => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className={`flex-1 space-y-4 overflow-y-auto p-5 ${selectedTheme.chatBg}`}>
                        {selectedConversation.status === "escalated" && (
                          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                            <div>
                              <p className="text-sm font-semibold text-rose-700">
                                Transferred to human agent
                              </p>
                              <p className="mt-0.5 text-sm text-rose-600">
                                A teammate is handling this conversation. AI replies are paused.
                              </p>
                            </div>
                          </div>
                        )}
                        {messages.map((message) => {
                          const isUser   = message.sender === "user";
                          const isAgent  = message.sender === "human";
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[78%] rounded-lg px-4 py-3 shadow-sm ${
                                  isUser
                                    ? selectedTheme.userBubble
                                    : isAgent
                                      ? "border border-rose-200 bg-rose-50 text-rose-900"
                                      : "border border-neutral-200 bg-white text-neutral-900"
                                }`}
                              >
                                <div className="mb-1 flex items-center gap-2">
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${
                                      isUser
                                        ? selectedTheme.userBadge
                                        : isAgent
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-cyan-50 text-cyan-700"
                                    }`}
                                  >
                                    {isAgent ? "Agent" : message.sender}
                                  </span>
                                  <span
                                    className={`text-xs ${isUser ? selectedTheme.userTime : "text-neutral-500"}`}
                                  >
                                    {formatTime(message.created_at)}
                                  </span>
                                </div>
                                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-6">
                                  {message.body || (message.id === streamingMsgId ? "" : "")}
                                  {message.id === streamingMsgId && (
                                    <span className="ml-px inline-block animate-pulse text-cyan-500">▌</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatBottomRef} />
                      </div>

                      {selectedConversation.status === "escalated" ? (
                        <form
                          onSubmit={handleHumanReply}
                          className="border-t border-rose-200 bg-rose-50 p-4"
                        >
                          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Human agent mode — AI is paused
                          </div>
                          <div className="flex gap-3">
                            <input
                              className="min-h-11 flex-1 rounded-md border border-rose-300 bg-white px-4 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                              onChange={(e) => setHumanDraft(e.target.value)}
                              placeholder="Reply as human agent..."
                              value={humanDraft}
                            />
                            <button
                              className="flex h-11 items-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={isSendingHuman || !humanDraft.trim()}
                              type="submit"
                            >
                              <Send className="h-4 w-4" />
                              Send
                            </button>
                          </div>
                        </form>
                      ) : (
                        <form
                          onSubmit={handleSendMessage}
                          className="border-t border-neutral-200 bg-white p-4"
                        >
                          <div className="flex gap-3">
                            <input
                              className={`min-h-11 flex-1 rounded-md border border-neutral-200 px-4 text-sm outline-none transition ${selectedTheme.focusRing}`}
                              onChange={(e) => setDraftMessage(e.target.value)}
                              placeholder="Simulate customer message (test AI)..."
                              value={draftMessage}
                            />
                            <button
                              className={`flex h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedTheme.sendBtn}`}
                              disabled={isSending || !draftMessage.trim()}
                              type="submit"
                            >
                              <Send className="h-4 w-4" />
                              Send
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center p-8 text-sm text-neutral-500">
                      Select a conversation to start.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════
                KNOWLEDGE BASE section
            ══════════════════════════════════════ */}
            {activeSection === "Knowledge Base" && (
              <section className="mt-5 grid gap-5 rounded-lg border border-neutral-200 bg-white p-5 xl:grid-cols-[1fr_420px]">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-100 text-cyan-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Knowledge Base</h2>
                      <p className="text-sm text-neutral-500">
                        Seeded FAQ plus uploaded files are used as chat context.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {documents.map((doc) => (
                      <article
                        key={doc.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold">{doc.name}</p>
                          <span className="rounded-md bg-white px-2 py-1 text-xs font-medium uppercase text-neutral-500">
                            {doc.kind}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-neutral-500">
                          {doc.chunk_count} chunks indexed
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={handleUploadDocument}
                  className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
                >
                  <label className="block text-sm font-semibold text-neutral-700">
                    Upload document
                    <input
                      accept=".txt,.md,.pdf"
                      className="mt-3 block w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </label>
                  <button
                    className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isUploading}
                    type="submit"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Add to Knowledge Base
                  </button>
                </form>
              </section>
            )}

            {/* ══════════════════════════════════════
                LEADS section  (Phase 6)
            ══════════════════════════════════════ */}
            {activeSection === "Leads" && (
              <section className="mt-5 rounded-lg border border-neutral-200 bg-white">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-100 text-cyan-700">
                      <UsersRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Captured Leads</h2>
                      <p className="text-sm text-neutral-500">
                        Auto-extracted from conversations when a customer provides their email.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 ring-1 ring-cyan-200">
                      {leads.length} lead{leads.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={exportLeadsCSV}
                      disabled={leads.length === 0}
                      className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Export CSV
                    </button>
                    <button
                      onClick={handleSyncSheets}
                      disabled={isSyncingSheets || leads.length === 0}
                      className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      title="Push all leads to Google Sheets"
                    >
                      {isSyncingSheets
                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />}
                      Sync to Sheets
                    </button>
                  </div>
                </div>

                {/* Lead cards */}
                {isLoadingLeads && leads.length === 0 ? (
                  <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                        <div className="flex gap-2">
                          <div className="h-9 w-9 rounded-md bg-neutral-200" />
                          <div className="flex-1 space-y-2 pt-1">
                            <div className="h-3 w-2/3 rounded bg-neutral-200" />
                            <div className="h-3 w-1/3 rounded bg-neutral-100" />
                          </div>
                        </div>
                        <div className="h-3 w-full rounded bg-neutral-100" />
                        <div className="h-3 w-3/4 rounded bg-neutral-100" />
                      </div>
                    ))}
                  </div>
                ) : leads.length === 0 ? (
                  <div className="p-10 text-center">
                    <UsersRound className="mx-auto h-10 w-10 text-neutral-300" />
                    <p className="mt-4 text-sm font-medium text-neutral-500">No leads yet</p>
                    <p className="mt-1 text-sm text-neutral-400">
                      When a customer shares their email in the Inbox, a lead is created here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                    {leads.map((lead) => {
                      const ChannelIcon = channelMeta[lead.channel]?.icon ?? Globe;
                      const interestClass =
                        interestColors[lead.interest] ?? interestColors["General inquiry"];

                      return (
                        <article
                          key={lead.id}
                          className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 transition hover:border-cyan-300 hover:shadow-sm"
                        >
                          {/* Name + channel */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-white">
                                <ChannelIcon className="h-4 w-4" />
                              </div>
                              <p className="text-sm font-semibold leading-tight">
                                {lead.customer_name}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ring-1 ${interestClass}`}
                            >
                              {lead.interest}
                            </span>
                          </div>

                          {/* Contact details */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                              <AtSign className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                            {lead.phone ? (
                              <div className="flex items-center gap-2 text-sm text-neutral-600">
                                <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                                <span>{lead.phone}</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                              <Tag className="h-3 w-3" />
                              <span className="capitalize">{lead.channel}</span>
                            </div>
                            <span className="text-xs text-neutral-400">
                              {formatDate(lead.created_at)}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* How it works hint */}
                <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3">
                  <p className="text-xs text-neutral-400">
                    💡 Share an email in any conversation (e.g. <em>my email is ravi@acme.com</em>) and it is captured here instantly.
                  </p>
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════
                BOOKINGS section  (Phase 7)
            ══════════════════════════════════════ */}
            {activeSection === "Bookings" && (
              <section className="mt-5 rounded-lg border border-neutral-200 bg-white">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Appointments</h2>
                      <p className="text-sm text-neutral-500">
                        Auto-confirmed when a customer picks a time slot in chat.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200">
                      {bookings.length} booked
                    </span>
                    <button
                      onClick={exportBookingsCSV}
                      disabled={bookings.length === 0}
                      className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Booking cards */}
                {isLoadingBookings && bookings.length === 0 ? (
                  <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                        <div className="h-3 w-2/3 rounded bg-neutral-200" />
                        <div className="h-3 w-1/2 rounded bg-neutral-100" />
                        <div className="h-3 w-3/4 rounded bg-neutral-100" />
                      </div>
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="p-10 text-center">
                    <CalendarDays className="mx-auto h-10 w-10 text-neutral-300" />
                    <p className="mt-4 text-sm font-medium text-neutral-500">No appointments yet</p>
                    <p className="mt-1 text-sm text-neutral-400">
                      When a customer says a time like <em>&ldquo;11 AM&rdquo;</em> in chat, it&apos;s booked here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                    {bookings.map((booking) => {
                      const ChannelIcon = channelMeta[booking.channel]?.icon ?? Globe;
                      return (
                        <article
                          key={booking.id}
                          className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 transition hover:border-indigo-300 hover:shadow-sm"
                        >
                          {/* Name + channel icon */}
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-white">
                              <ChannelIcon className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-semibold leading-tight">
                              {booking.customer_name}
                            </p>
                          </div>

                          {/* Slot highlight */}
                          <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
                            <CalendarDays className="h-4 w-4 shrink-0" />
                            <span>{booking.slot}</span>
                          </div>

                          {/* Email if available */}
                          {booking.email ? (
                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                              <AtSign className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                              <span className="truncate">{booking.email}</span>
                            </div>
                          ) : null}

                          {/* Footer */}
                          <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                            <span className="text-xs capitalize text-neutral-400">
                              {channelMeta[booking.channel]?.label ?? booking.channel}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {formatDate(booking.created_at)}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* Hint */}
                <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3">
                  <p className="text-xs text-neutral-400">
                    💡 Type <em>&ldquo;I want to book&rdquo;</em> in any chat — the AI lists available slots. Reply with a time like <em>&ldquo;11 AM&rdquo;</em> and the appointment is confirmed instantly.
                  </p>
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════
                WORKFLOWS section  (Phase 9)
            ══════════════════════════════════════ */}
            {activeSection === "Workflows" && (
              <section className="mt-5 space-y-5">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Workflow Automation</h2>
                      <p className="text-sm text-neutral-500">
                        Rules that run automatically on every incoming message.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 ring-1 ring-violet-200">
                    {workflows.filter((w) => w.enabled).length} active rule{workflows.filter((w) => w.enabled).length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1fr_380px]">

                  {/* ── Left: rule list ── */}
                  <div className="space-y-4">
                    {isLoadingWorkflows ? (
                      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading rules…
                      </div>
                    ) : workflows.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
                        <Zap className="mx-auto h-10 w-10 text-neutral-300" />
                        <p className="mt-4 text-sm font-medium text-neutral-500">No rules yet</p>
                        <p className="mt-1 text-sm text-neutral-400">
                          Create your first rule using the form on the right.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {workflows.map((wf) => {
                          const actionColors: Record<string, string> = {
                            escalate:   "bg-rose-50 text-rose-700 ring-rose-200",
                            send_reply: "bg-amber-50 text-amber-700 ring-amber-200",
                            tag_lead:   "bg-cyan-50 text-cyan-700 ring-cyan-200",
                          };
                          const actionLabels: Record<string, string> = {
                            escalate:   "Escalate to human",
                            send_reply: "Send custom reply",
                            tag_lead:   "Tag as lead",
                          };
                          const conditionLabels: Record<string, string> = {
                            contains:    "contains",
                            equals:      "equals",
                            starts_with: "starts with",
                          };
                          return (
                            <article
                              key={wf.id}
                              className={`flex flex-col gap-3 rounded-lg border bg-white p-4 transition ${
                                wf.enabled ? "border-neutral-200" : "border-neutral-100 opacity-60"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold leading-tight">{wf.name}</p>
                                <span
                                  className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ring-1 ${actionColors[wf.action] ?? ""}`}
                                >
                                  {actionLabels[wf.action] ?? wf.action}
                                </span>
                              </div>

                              <p className="text-sm text-neutral-500">
                                IF message{" "}
                                <span className="font-medium text-neutral-700">
                                  {conditionLabels[wf.condition]}
                                </span>{" "}
                                <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700">
                                  &ldquo;{wf.trigger}&rdquo;
                                </span>
                              </p>

                              {wf.action === "send_reply" && wf.action_value && (
                                <p className="line-clamp-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                  {wf.action_value}
                                </p>
                              )}

                              <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                                <button
                                  onClick={() => handleToggleWorkflow(wf.id)}
                                  className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${
                                    wf.enabled
                                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                                  }`}
                                  type="button"
                                >
                                  {wf.enabled ? "ON" : "OFF"}
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkflow(wf.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600"
                                  type="button"
                                  aria-label="Delete rule"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}

                    {/* Activity log */}
                    <div className="rounded-lg border border-neutral-200 bg-white">
                      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
                        <Activity className="h-4 w-4 text-neutral-500" />
                        <h3 className="text-sm font-semibold">Recent Activity</h3>
                      </div>
                      {workflowLogs.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-neutral-400">
                          No workflow activity yet. Rules trigger when messages are received.
                        </p>
                      ) : (
                        <ul className="divide-y divide-neutral-100">
                          {workflowLogs.slice(0, 10).map((log) => (
                            <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-neutral-700">
                                  {log.workflow_name}
                                </p>
                                <p className="mt-0.5 text-xs text-neutral-500">
                                  {log.action_taken} · triggered by &ldquo;{log.triggered_by.slice(0, 60)}{log.triggered_by.length > 60 ? "…" : ""}&rdquo;
                                </p>
                              </div>
                              <span className="shrink-0 text-xs text-neutral-400">
                                {formatDateTime(log.created_at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* ── Right: create rule form ── */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-5">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-neutral-500" />
                      <h3 className="text-sm font-semibold">Create New Rule</h3>
                    </div>

                    <form onSubmit={handleCreateWorkflow} className="mt-4 space-y-4">
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Rule name
                        </span>
                        <input
                          className="mt-1.5 block w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          placeholder="e.g. Escalate angry customers"
                          value={wfName}
                          onChange={(e) => setWfName(e.target.value)}
                          required
                        />
                      </label>

                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Trigger condition
                        </span>
                        <div className="flex gap-2">
                          <select
                            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            value={wfCondition}
                            onChange={(e) => setWfCondition(e.target.value as WorkflowCondition)}
                          >
                            <option value="contains">contains</option>
                            <option value="equals">equals</option>
                            <option value="starts_with">starts with</option>
                          </select>
                          <input
                            className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            placeholder="keyword…"
                            value={wfTrigger}
                            onChange={(e) => setWfTrigger(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Action
                        </span>
                        <select
                          className="mt-1.5 block w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          value={wfAction}
                          onChange={(e) => { setWfAction(e.target.value as WorkflowAction); setWfActionValue(""); }}
                        >
                          <option value="escalate">Escalate to human</option>
                          <option value="send_reply">Send custom reply</option>
                          <option value="tag_lead">Tag as lead</option>
                        </select>
                      </label>

                      {wfAction === "send_reply" && (
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Reply text
                          </span>
                          <textarea
                            className="mt-1.5 block w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            placeholder="The message to send automatically…"
                            rows={3}
                            value={wfActionValue}
                            onChange={(e) => setWfActionValue(e.target.value)}
                            required
                          />
                        </label>
                      )}

                      <button
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isCreatingWorkflow}
                        type="submit"
                      >
                        {isCreatingWorkflow ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Create Rule
                      </button>
                    </form>

                    <div className="mt-5 rounded-md bg-neutral-50 p-3">
                      <p className="text-xs font-semibold text-neutral-500">Examples</p>
                      <ul className="mt-2 space-y-1 text-xs text-neutral-400">
                        <li>• <span className="font-mono">refund</span> → Escalate to human</li>
                        <li>• <span className="font-mono">pricing</span> → Send custom reply</li>
                        <li>• <span className="font-mono">demo</span> → Tag as lead</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════
                PLACEHOLDER sections
            ══════════════════════════════════════ */}
            {/* ── Overview / Analytics ───────────────────────────────── */}
            {activeSection === "Overview" && (
              <section className="mt-5 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-800">Analytics Overview</h2>
                    <p className="mt-0.5 text-sm text-neutral-500">Live stats from your OmniFlow workspace</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsLoadingAnalytics(true);
                      fetchAnalytics()
                        .then((data) => setAnalytics(data))
                        .catch(() => {})
                        .finally(() => setIsLoadingAnalytics(false));
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm hover:bg-neutral-50"
                  >
                    {isLoadingAnalytics ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Activity className="h-3.5 w-3.5" />
                    )}
                    Refresh
                  </button>
                </div>

                {isLoadingAnalytics && !analytics ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                  </div>
                ) : analytics ? (
                  <>
                    {/* ── Metric cards ──────────────────────────────────── */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                      {(
                        [
                          { label: "Total Chats",  value: analytics.total_conversations, Icon: MessageSquareText, color: "text-indigo-600",  bg: "bg-indigo-50"  },
                          { label: "AI Replies",   value: analytics.ai_replies,          Icon: Bot,               color: "text-violet-600",  bg: "bg-violet-50"  },
                          { label: "Leads",        value: analytics.leads,               Icon: UsersRound,        color: "text-cyan-600",    bg: "bg-cyan-50"    },
                          { label: "Bookings",     value: analytics.bookings,            Icon: CalendarDays,      color: "text-emerald-600", bg: "bg-emerald-50" },
                          { label: "Escalations",  value: analytics.escalations,         Icon: AlertTriangle,     color: "text-rose-600",    bg: "bg-rose-50"    },
                        ] as const
                      ).map(({ label, value, Icon, color, bg }) => (
                        <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                          <div className={`mb-3 inline-flex rounded-lg p-2 ${bg}`}>
                            <Icon className={`h-5 w-5 ${color}`} />
                          </div>
                          <p className="text-2xl font-bold text-neutral-800">{value}</p>
                          <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* ── Charts ────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Daily conversations */}
                      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold text-neutral-700">
                          Daily Conversations — last 7 days
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart
                            data={analytics.daily_conversations}
                            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(d: string) =>
                                new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                                  month: "short", day: "numeric",
                                })
                              }
                              tick={{ fontSize: 11, fill: "#9ca3af" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: "#9ca3af" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                              labelFormatter={(label) =>
                                new Date(String(label) + "T00:00:00").toLocaleDateString("en-US", {
                                  weekday: "short", month: "short", day: "numeric",
                                })
                              }
                            />
                            <Area
                              type="monotone"
                              dataKey="count"
                              stroke="#6366f1"
                              strokeWidth={2}
                              fill="url(#convGrad)"
                              dot={{ r: 3, fill: "#6366f1" }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Lead growth */}
                      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold text-neutral-700">
                          Lead Growth — last 7 days
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={analytics.lead_growth}
                            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(d: string) =>
                                new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                                  month: "short", day: "numeric",
                                })
                              }
                              tick={{ fontSize: 11, fill: "#9ca3af" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: "#9ca3af" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                              labelFormatter={(label) =>
                                new Date(String(label) + "T00:00:00").toLocaleDateString("en-US", {
                                  weekday: "short", month: "short", day: "numeric",
                                })
                              }
                            />
                            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Channel breakdown — donut */}
                      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold text-neutral-700">
                          Conversations by Channel
                        </h3>
                        {analytics.channel_breakdown.length > 0 ? (
                          <div className="flex items-center gap-6">
                            <ResponsiveContainer width="50%" height={180}>
                              <PieChart>
                                <Pie
                                  data={analytics.channel_breakdown}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={75}
                                  strokeWidth={0}
                                >
                                  {analytics.channel_breakdown.map((entry: NameValue, idx: number) => (
                                    <Cell
                                      key={entry.name}
                                      fill={["#6366f1","#22d3ee","#f59e0b","#10b981"][idx % 4]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2">
                              {analytics.channel_breakdown.map((entry: NameValue, idx: number) => (
                                <div key={entry.name} className="flex items-center gap-2 text-sm text-neutral-700">
                                  <span
                                    className="inline-block h-3 w-3 rounded-full"
                                    style={{ backgroundColor: ["#6366f1","#22d3ee","#f59e0b","#10b981"][idx % 4] }}
                                  />
                                  {entry.name}
                                  <span className="ml-auto font-semibold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-400">No data yet.</p>
                        )}
                      </div>

                      {/* Status breakdown — horizontal bar */}
                      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold text-neutral-700">
                          Conversation Status Breakdown
                        </h3>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart
                            data={analytics.status_breakdown}
                            layout="vertical"
                            margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={72} />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {analytics.status_breakdown.map((entry: NameValue) => (
                                <Cell
                                  key={entry.name}
                                  fill={
                                    entry.name === "Active"    ? "#6366f1" :
                                    entry.name === "Lead"      ? "#f59e0b" :
                                    entry.name === "Booked"    ? "#10b981" :
                                    entry.name === "Escalated" ? "#f43f5e" : "#94a3b8"
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white">
                    <p className="text-sm text-neutral-400">Could not load analytics. Check the backend server.</p>
                  </div>
                )}
              </section>
            )}

            {/* ── Settings ──────────────────────────────────────────── */}
            {activeSection === "Settings" && (
              <section className="mt-5 space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Settings</h2>
                    <p className="text-sm text-neutral-500">Configure your OmniFlow AI workspace.</p>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">

                  {/* AI Provider */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-5">
                    <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
                      <Bot className="h-4 w-4 text-neutral-500" />
                      <h3 className="text-sm font-semibold">AI Provider</h3>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Current provider</p>
                        <div className="mt-2 flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="text-sm font-medium capitalize">{aiStatus?.provider ?? "checking"}</span>
                          {aiStatus && <span className="text-xs text-neutral-400">{aiStatus.model}</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">API Key</p>
                        <div className="mt-2 flex gap-2">
                          <input
                            className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-400 outline-none"
                            defaultValue="sk-••••••••••••••••••••••••••••••"
                            readOnly
                            type="password"
                          />
                          <button
                            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
                            type="button"
                          >
                            Update
                          </button>
                        </div>
                        <p className="mt-1.5 text-xs text-neutral-400">Set via <code className="rounded bg-neutral-100 px-1 py-0.5">GROQ_API_KEY</code> or <code className="rounded bg-neutral-100 px-1 py-0.5">OPENAI_API_KEY</code> in your <code className="rounded bg-neutral-100 px-1 py-0.5">.env</code> file.</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Model</p>
                        <select className="mt-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600 outline-none">
                          <option>llama-3.3-70b-versatile (Groq)</option>
                          <option>gpt-4o-mini (OpenAI)</option>
                          <option>gpt-4o (OpenAI)</option>
                          <option>mock-responder (no key needed)</option>
                        </select>
                        <p className="mt-1.5 text-xs text-neutral-400">Set via <code className="rounded bg-neutral-100 px-1 py-0.5">GROQ_MODEL</code> / <code className="rounded bg-neutral-100 px-1 py-0.5">OPENAI_MODEL</code> in your <code className="rounded bg-neutral-100 px-1 py-0.5">.env</code> file.</p>
                      </div>
                    </div>
                  </div>

                  {/* Workspace */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-5">
                    <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
                      <UsersRound className="h-4 w-4 text-neutral-500" />
                      <h3 className="text-sm font-semibold">Workspace</h3>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Workspace name</p>
                        <input
                          className="mt-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition"
                          defaultValue="OmniFlow AI Demo"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Admin email</p>
                        <input
                          className="mt-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition"
                          defaultValue="priya@omniflow.ai"
                          type="email"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Default channel</p>
                        <select className="mt-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600 outline-none">
                          <option value="website">Website</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">Email</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Chat Widget */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-5">
                    <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
                      <MessageSquareText className="h-4 w-4 text-neutral-500" />
                      <h3 className="text-sm font-semibold">Chat Widget</h3>
                    </div>
                    <div className="mt-4 space-y-5">

                      {/* Greeting editor */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Widget greeting</p>
                        <textarea
                          className="mt-2 w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                          rows={2}
                          value={widgetGreeting}
                          onChange={(e) => setWidgetGreeting(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={saveWidgetGreeting}
                          className="mt-2 rounded-md bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-neutral-950 transition hover:bg-cyan-200"
                        >
                          Save greeting
                        </button>
                      </div>

                      {/* Embed snippet */}
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Embed snippet</p>
                          <button
                            type="button"
                            onClick={copySnippet}
                            className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
                          >
                            {snippetCopied ? (
                              <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Copied!</>
                            ) : (
                              <><FileText className="h-3.5 w-3.5" /> Copy</>
                            )}
                          </button>
                        </div>
                        <pre className="mt-2 overflow-x-auto rounded-md bg-neutral-950 px-3 py-3 text-xs text-cyan-300">
{`<script src="${widgetOrigin || "http://localhost:3000"}/widget.js"
  data-greeting="${widgetGreeting}"
  data-color="#22d3ee">
</script>`}
                        </pre>
                        <p className="mt-1.5 text-xs text-neutral-400">
                          Paste this before the closing{" "}
                          <code className="rounded bg-neutral-100 px-1 py-0.5">&lt;/body&gt;</code>{" "}
                          tag of your website. Visitors' messages appear in the Inbox.
                        </p>
                      </div>

                      {/* Preview link */}
                      <a
                        href="/widget"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-cyan-600 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Preview live chat widget
                      </a>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-5">
                    <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
                      <Bell className="h-4 w-4 text-neutral-500" />
                      <h3 className="text-sm font-semibold">Notifications</h3>
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: "New conversation", desc: "Alert when a visitor starts a new chat" },
                        { label: "Lead captured", desc: "Alert when an email is extracted from chat" },
                        { label: "Appointment booked", desc: "Alert when a slot is confirmed" },
                        { label: "Escalation triggered", desc: "Alert when AI escalates to human" },
                      ].map(({ label, desc }) => (
                        <label key={label} className="flex cursor-pointer items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-neutral-700">{label}</p>
                            <p className="text-xs text-neutral-400">{desc}</p>
                          </div>
                          <div className="relative mt-0.5 h-5 w-9 shrink-0">
                            <input type="checkbox" defaultChecked className="peer sr-only" />
                            <div className="h-5 w-9 rounded-full bg-neutral-200 transition peer-checked:bg-cyan-400" />
                            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Save button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => addToast("Settings saved.", "success")}
                    className="flex h-10 items-center gap-2 rounded-md bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    type="button"
                  >
                    Save changes
                  </button>
                </div>

              </section>
            )}

          </div>
        </section>
      </div>

      {/* ── Toast notification stack ──────────────────────────────────── */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
              toast.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : toast.kind === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-sky-200 bg-sky-50 text-sky-800"
            }`}
          >
            {toast.kind === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
            {toast.kind === "error"   && <AlertCircle  className="h-4 w-4 shrink-0 text-rose-500"    />}
            {toast.kind === "info"    && <Info          className="h-4 w-4 shrink-0 text-sky-500"     />}
            <p className="max-w-xs text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-1 shrink-0 opacity-50 transition hover:opacity-100"
              type="button"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
