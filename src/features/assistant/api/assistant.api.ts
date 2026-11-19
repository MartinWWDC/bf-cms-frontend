import { getAuthToken } from "@/lib/api/auth-token";
import { api, API_BASE_URL, ApiError, type Envelope, getApiLocale, getApiTimeZone, getData } from "@/lib/api/client";
import type { ApiErrorBody } from "@/lib/api/types";

import type {
  AssistantConversation,
  AssistantConversationDetail,
  AssistantConversationList,
  AssistantStatus,
  AssistantStreamEvent,
  AssistantUsage,
  SendMessageInput,
  SentMessage,
} from "../types";

const conversationPath = (id: number) => `/assistant/conversations/${id}`;

export function fetchAssistantStatus(): Promise<AssistantStatus> {
  return getData<AssistantStatus>("/assistant");
}

export async function fetchConversations(page: number): Promise<AssistantConversationList> {
  const response = await api.get<AssistantConversationList>("/assistant/conversations", {
    params: { page, per_page: 30 },
  });
  return response.data;
}

export function fetchConversation(id: number): Promise<AssistantConversationDetail> {
  return getData<AssistantConversationDetail>(conversationPath(id));
}

/** Without a title the backend uses the start of the first message. */
export async function createConversation(title?: string | null): Promise<AssistantConversation> {
  const response = await api.post<Envelope<AssistantConversation>>("/assistant/conversations", {
    title: title ?? null,
  });
  return response.data.data;
}

export async function deleteConversation(id: number): Promise<void> {
  await api.delete(conversationPath(id));
}

/** Sends a message and waits for the whole answer. The fallback when the stream cannot be read. */
export async function sendMessage(id: number, input: SendMessageInput, signal?: AbortSignal): Promise<SentMessage> {
  const response = await api.post<Envelope<SentMessage>>(`${conversationPath(id)}/messages`, input, { signal });
  return response.data.data;
}

export async function fetchAssistantUsage(month: string): Promise<AssistantUsage> {
  const response = await api.get<AssistantUsage>("/assistant/usage", { params: { month } });
  return response.data;
}

/** The browser cannot read the answer as a stream; send the message the non-streaming way. */
export class StreamUnavailableError extends Error {
  constructor() {
    super("stream unavailable");
    this.name = "StreamUnavailableError";
  }
}

function parseEvent(block: string): AssistantStreamEvent | null {
  let event = "";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!event || data.length === 0) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) } as AssistantStreamEvent;
  } catch {
    return null;
  }
}

/**
 * Sends a message and reports the answer as it is written (`POST .../messages/stream`).
 *
 * This is the one request that does not go through the Axios client: the answer is
 * `text/event-stream` over POST, which Axios cannot read as a stream in the browser. It
 * sends the same headers as the client. An error before the stream starts (permission,
 * limit, validation) arrives as the normal JSON error and is thrown as `ApiError`; an
 * `error` event inside the stream is passed to `onEvent`.
 */
export async function streamMessage(
  id: number,
  input: SendMessageInput,
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
    "Accept-Language": getApiLocale(),
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const timeZone = getApiTimeZone();
  if (timeZone) headers["X-Timezone"] = timeZone;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${conversationPath(id)}/messages/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ code: "network_error", message: "" });
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as Partial<ApiErrorBody> | undefined;
    const details = body?.error?.details && !Array.isArray(body.error.details) ? body.error.details : {};
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new ApiError({
      status: response.status,
      code: body?.error?.code ?? `http_${response.status}`,
      message: body?.error?.message ?? "",
      fields: body?.error?.fields,
      details,
      requestId: response.headers.get("x-request-id") ?? undefined,
      retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    });
  }
  if (!response.body) throw new StreamUnavailableError();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    let end = buffer.indexOf("\n\n");
    while (end !== -1) {
      const event = parseEvent(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
      if (event) onEvent(event);
      end = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
}
