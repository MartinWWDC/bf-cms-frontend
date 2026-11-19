import type { PageMeta } from "@/lib/api/types";

/**
 * The AI assistant (`conventions.md` section 19, `Assistant*` in the spec). The backend runs
 * the conversation and lets the model use CMS tools; the frontend only renders the chat.
 * The assistant never changes anything: it can only propose, and the admin confirms in the
 * normal dialog.
 */

export type AssistantLimitKey = "daily_messages" | "daily_tokens" | "monthly_cost";

/** `GET /assistant`. */
export interface AssistantStatus {
  enabled: boolean;
  model: string;
  /** The admin may get change proposals (`assistant.propose`). */
  can_propose: boolean;
  /** The admin may open the usage report (`assistant.usage`). */
  can_view_usage: boolean;
  limits: { daily_messages: number; daily_tokens: number; max_message_characters: number };
  usage_today: { messages: number; tokens: number };
  /** The limit that stops the admin right now, if any. */
  blocked_by: AssistantLimitKey | null;
  /** Conversations are deleted after this many days without activity. */
  keep_days: number;
}

export interface AssistantConversation {
  id: number;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string | null;
}

export interface AssistantConversationDetail extends AssistantConversation {
  messages: AssistantMessage[];
}

export interface AssistantConversationList {
  data: AssistantConversation[];
  meta: PageMeta;
}

/** Which page the admin is on, so "this checkout" works. All optional. */
export interface AssistantPageContext {
  resource?: string | null;
  record_id?: string | null;
  view?: string | null;
  tab?: string | null;
  filter?: unknown;
  q?: string | null;
  dashboard?: string | null;
}

/** A tool the assistant used, so the admin can check what it looked at. */
export interface AssistantStep {
  id: string;
  tool: string;
  label: string;
  status: "ok" | "error" | "denied";
  arguments: Record<string, unknown>;
  resource: string | null;
  record_id: string | null;
  error: string | null;
  duration_ms: number;
}

/** What an answer is based on. `href` uses the `cms://` scheme, mapped in `lib/cms-links.ts`. */
export interface AssistantLink {
  type: "record" | "list" | "metric" | "dashboard" | "doc";
  label: string | null;
  href: string;
  resource?: string;
  id?: string;
  query?: Record<string, unknown>;
  total?: number | null;
}

/** A change the assistant suggests. The admin reviews and sends it through the normal dialog. */
export interface AssistantProposal {
  id: string;
  kind: "action" | "note" | "assignment";
  resource: string;
  record_id: string;
  record_title: string | null;
  action: string | null;
  label: string | null;
  input: Record<string, unknown>;
  /** Inputs the admin still has to fill. Sensitive and file inputs are never filled by the assistant. */
  missing_inputs: string[];
  reason: string | null;
  dangerous: boolean;
  requires_reason: boolean;
  preview: unknown;
  request: {
    method: "POST" | "PUT" | "DELETE";
    path: string;
    preview_path: string | null;
    body: Record<string, unknown>;
    idempotency_key: string;
  };
}

export interface AssistantMessage {
  id: number;
  role: "user" | "assistant";
  /** `failed`: the provider failed, `content` is the error text. `stopped`: a limit ended the answer early. */
  status: "complete" | "stopped" | "failed";
  /** Markdown. */
  content: string;
  context: AssistantPageContext | null;
  steps: AssistantStep[];
  links: AssistantLink[];
  proposals: AssistantProposal[];
  created_at: string | null;
}

export interface SendMessageInput {
  content: string;
  context?: AssistantPageContext | null;
}

/** Answer of `POST .../messages`, and what the stream adds up to. */
export interface SentMessage {
  conversation: AssistantConversation;
  /** The stored question. */
  message: AssistantMessage;
  answer: AssistantMessage;
}

/** Events of `POST .../messages/stream` (`text/event-stream`). */
export type AssistantStreamEvent =
  | { event: "message.created"; data: { message: AssistantMessage } }
  | { event: "tool.started"; data: { id: string; tool: string; label: string } }
  | { event: "tool.finished"; data: { step: AssistantStep; links: AssistantLink[]; proposals: AssistantProposal[] } }
  | { event: "text.delta"; data: { text: string } }
  | { event: "message.completed"; data: { conversation: AssistantConversation; message: AssistantMessage } }
  | { event: "error"; data: { code: string; message: string } };

export interface AssistantUsageNumbers {
  messages: number;
  model_calls: number;
  tool_calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_micros: number;
  cost_usd: number;
}

export interface AssistantUsageRow extends AssistantUsageNumbers {
  admin: { id: number; name: string | null };
}

/** `GET /assistant/usage?month=2026-11`. */
export interface AssistantUsage {
  data: { month: string; admins: AssistantUsageRow[]; totals: AssistantUsageNumbers };
  meta: {
    limits: { daily_messages_per_admin: number; daily_tokens_per_admin: number; monthly_cost_usd: number };
    month_cost_usd: number;
    model: string;
  };
}
