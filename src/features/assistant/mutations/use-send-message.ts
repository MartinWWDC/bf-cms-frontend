import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendMessage, streamMessage, StreamUnavailableError } from "../api/assistant.api";
import { assistantKeys } from "../queries/keys";
import type {
  AssistantConversationDetail,
  AssistantMessage,
  AssistantStreamEvent,
  SendMessageInput,
  SentMessage,
} from "../types";

interface SendInput extends SendMessageInput {
  conversationId: number;
  /** Called for every event while the answer is written. */
  onEvent: (event: AssistantStreamEvent) => void;
  /** Aborting stops reading; what the backend already stored stays stored. */
  signal?: AbortSignal;
}

/** The stream ended with an `error` event, or without the finished answer. */
export class AssistantStreamError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AssistantStreamError";
    this.code = code;
  }
}

/**
 * Sends a message and follows the streamed answer. Falls back to the non-streaming
 * endpoint when the browser cannot read the stream. On success the question and the
 * answer are added to the cached conversation.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, onEvent, signal, ...input }: SendInput): Promise<SentMessage> => {
      let question: AssistantMessage | null = null;
      let completed: Extract<AssistantStreamEvent, { event: "message.completed" }>["data"] | null = null;
      let failure: { code: string; message: string } | null = null;

      try {
        await streamMessage(
          conversationId,
          input,
          (event) => {
            if (event.event === "message.created") question = event.data.message;
            else if (event.event === "message.completed") completed = event.data;
            else if (event.event === "error") failure = event.data;
            onEvent(event);
          },
          signal,
        );
      } catch (error) {
        if (!(error instanceof StreamUnavailableError)) throw error;
        return sendMessage(conversationId, input, signal);
      }

      const error = failure as { code: string; message: string } | null;
      if (error) throw new AssistantStreamError(error.code, error.message);
      const done = completed as Extract<AssistantStreamEvent, { event: "message.completed" }>["data"] | null;
      if (!done || !question) throw new AssistantStreamError("stream_incomplete", "");
      return { conversation: done.conversation, message: question, answer: done.message };
    },
    onSuccess: (sent, { conversationId }) => {
      queryClient.setQueryData<AssistantConversationDetail>(assistantKeys.conversation(conversationId), (current) => {
        const known = new Set(current?.messages.map((message) => message.id));
        const added = [sent.message, sent.answer].filter((message) => !known.has(message.id));
        return { ...sent.conversation, messages: [...(current?.messages ?? []), ...added] };
      });
    },
    // Also after a failure or a stop: the question, and maybe a partial answer, are stored.
    onSettled: (sent, _error, { conversationId }) =>
      Promise.all([
        sent ? null : queryClient.invalidateQueries({ queryKey: assistantKeys.conversation(conversationId) }),
        queryClient.invalidateQueries({ queryKey: assistantKeys.conversations() }),
        queryClient.invalidateQueries({ queryKey: assistantKeys.status() }),
      ]),
  });
}
