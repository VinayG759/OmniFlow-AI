export type ConversationStatus = "active" | "lead" | "booked" | "escalated" | "resolved";
export type Channel = "website" | "whatsapp" | "email" | "facebook" | "instagram" | "phone" | "linkedin";
export type Sender = "user" | "ai" | "human";

export type Conversation = {
  id: string;
  customer_name: string;
  channel: Channel;
  status: ConversationStatus;
  last_message: string;
  updated_at: string;
  unread_count: number;
  assigned_to?: string | null;
  sentiment?: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender: Sender;
  body: string;
  created_at: string;
};

export type AiStatus = {
  provider: "openai" | "groq" | "mock";
  model: string;
};

export type KnowledgeDocument = {
  id: string;
  name: string;
  kind: string;
  chunk_count: number;
  created_at: string;
};

export type Lead = {
  id: string;
  conversation_id: string;
  customer_name: string;
  email: string;
  phone: string;
  interest: string;
  channel: Channel;
  created_at: string;
  score: number;
  next_action?: string;
};

export type Booking = {
  id: string;
  conversation_id: string;
  customer_name: string;
  email: string;
  slot: string;
  channel: Channel;
  created_at: string;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchConversations() {
  return apiFetch<Conversation[]>("/conversations");
}

export function fetchAiStatus() {
  return apiFetch<AiStatus>("/ai/status");
}

export function fetchDocuments() {
  return apiFetch<KnowledgeDocument[]>("/documents");
}

export function fetchMessages(conversationId: string) {
  return apiFetch<Message[]>(`/messages/${conversationId}`);
}

export function sendMessage(conversationId: string, body: string) {
  return apiFetch<Message[]>("/messages", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId, body }),
  });
}

// ── Streaming message (SSE) ───────────────────────────────────────────────────

export type StreamEvent =
  | { type: "token"; token: string }
  | { type: "done";  messages: Message[] };

/**
 * Sends a message and yields SSE events as they arrive.
 * Each `token` event carries one word fragment.
 * The final `done` event carries the authoritative message thread.
 */
export async function* streamMessage(
  conversationId: string,
  body: string,
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE_URL}/messages/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, body }),
  });

  if (!response.ok) throw new Error(`Stream failed: ${response.status}`);

  const reader  = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";           // keep incomplete last chunk

    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const raw = part.slice(6).trim();
      try {
        yield JSON.parse(raw) as StreamEvent;
      } catch {
        // skip malformed events
      }
    }
  }
}

export function fetchLeads() {
  return apiFetch<Lead[]>("/leads");
}

export function deleteLead(id: string) {
  return apiFetch<void>(`/leads/${id}`, { method: "DELETE" });
}

export function fetchBookings() {
  return apiFetch<Booking[]>("/bookings");
}

export function fetchSlots() {
  return apiFetch<{ available: string[] }>("/slots");
}

export function escalateConversation(conversationId: string) {
  return apiFetch<Conversation>(`/escalate/${conversationId}`, { method: "POST" });
}

export function sendFollowUp(conversationId: string) {
  return apiFetch<Message[]>(`/conversations/${conversationId}/followup`, { method: "POST" });
}

export function sendAgentMessage(conversationId: string, body: string) {
  return apiFetch<Message[]>("/messages/agent", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId, body }),
  });
}

export function updateConversationStatus(conversationId: string, status: ConversationStatus | "resolved") {
  return apiFetch<Conversation>(`/conversations/${conversationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function assignConversation(conversationId: string, agent: string) {
  return apiFetch<Conversation>(`/conversations/${conversationId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ agent }),
  });
}

export function exportBookingsCSV(apiBase: string) {
  window.open(`${apiBase}/bookings/export`, "_blank");
}

// ── Workflows ─────────────────────────────────────────────────────────────────

export type WorkflowCondition = "contains" | "equals" | "starts_with";
export type WorkflowAction    = "escalate" | "send_reply" | "tag_lead";

export type Workflow = {
  id:           string;
  name:         string;
  trigger:      string;
  condition:    WorkflowCondition;
  action:       WorkflowAction;
  action_value: string;
  enabled:      boolean;
  created_at:   string;
};

export type WorkflowCreate = {
  name:          string;
  trigger:       string;
  condition:     WorkflowCondition;
  action:        WorkflowAction;
  action_value?: string;
};

export type WorkflowLog = {
  id:              string;
  workflow_id:     string;
  workflow_name:   string;
  conversation_id: string;
  triggered_by:    string;
  action_taken:    string;
  created_at:      string;
};

export function fetchWorkflows() {
  return apiFetch<Workflow[]>("/workflows");
}

export function createWorkflow(payload: WorkflowCreate) {
  return apiFetch<Workflow>("/workflows", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteWorkflow(workflowId: string) {
  return apiFetch<Workflow>(`/workflows/${workflowId}`, { method: "DELETE" });
}

export function toggleWorkflow(workflowId: string) {
  return apiFetch<Workflow>(`/workflows/${workflowId}/toggle`, { method: "PATCH" });
}

export function fetchWorkflowLogs() {
  return apiFetch<WorkflowLog[]>("/workflow-logs");
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export type DailyCount = { date: string; count: number };

export type NameValue = { name: string; value: number };

export type AnalyticsSummary = {
  total_conversations: number;
  ai_replies:          number;
  leads:               number;
  bookings:            number;
  escalations:         number;
  daily_conversations: DailyCount[];
  lead_growth:         DailyCount[];
  channel_breakdown:   NameValue[];
  status_breakdown:    NameValue[];
};

export function fetchAnalytics() {
  return apiFetch<AnalyticsSummary>("/analytics");
}

/**
 * Trigger a Google Sheets sync from the frontend.
 * The backend silently skips if GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_JSON
 * are not configured — so this is always safe to call.
 */
export function syncLeadsToSheets() {
  return apiFetch<{ synced: number }>("/leads/sync-sheets", { method: "POST" });
}

export function broadcastWhatsApp(message: string) {
  return apiFetch<{ sent: number; skipped: number; total: number }>("/broadcast", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail ?? `Upload failed: ${response.status}`);
  }

  return response.json() as Promise<KnowledgeDocument>;
}

export async function deleteDocument(id: string) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail ?? `Delete failed: ${response.status}`);
  }
}
