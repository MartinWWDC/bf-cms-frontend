"use client";

import { useCallback, useRef, useState } from "react";

import { AssistantStreamError, useCreateConversation, useSendMessage } from "../mutations";
import type { AssistantLink, AssistantPageContext, AssistantProposal, AssistantStep, AssistantStreamEvent } from "../types";

/** A tool the assistant is using or has used in the answer being written. */
export interface LiveStep {
  id: string;
  label: string;
  /** `null` while the tool is still running. */
  step: AssistantStep | null;
}

/** The exchange in flight: the question and the answer as far as it has been written. */
export interface LiveTurn {
  conversationId: number | null;
  question: string;
  text: string;
  steps: LiveStep[];
  links: AssistantLink[];
  proposals: AssistantProposal[];
}

interface UseChatOptions {
  conversationId: number | null;
  context: AssistantPageContext | null;
  /** A conversation was started for the first message. */
  onConversationCreated: (id: number) => void;
}

function applyEvent(turn: LiveTurn, event: AssistantStreamEvent): LiveTurn {
  switch (event.event) {
    case "text.delta":
      return { ...turn, text: turn.text + event.data.text };
    case "tool.started":
      return { ...turn, steps: [...turn.steps, { id: event.data.id, label: event.data.label, step: null }] };
    case "tool.finished": {
      const { step, links, proposals } = event.data;
      const known = turn.steps.some((entry) => entry.id === step.id);
      return {
        ...turn,
        steps: known
          ? turn.steps.map((entry) => (entry.id === step.id ? { ...entry, label: step.label, step } : entry))
          : [...turn.steps, { id: step.id, label: step.label, step }],
        links: [...turn.links, ...(links ?? [])],
        proposals: [...turn.proposals, ...(proposals ?? [])],
      };
    }
    default:
      return turn;
  }
}

/**
 * Sending one message and following its streamed answer. The first message of a new chat
 * starts the conversation first. `stop` aborts reading; what is already stored stays.
 */
export function useChat({ conversationId, context, onConversationCreated }: UseChatOptions) {
  const create = useCreateConversation();
  const sendMessage = useSendMessage();
  const [live, setLive] = useState<LiveTurn | null>(null);
  const [error, setError] = useState<unknown>(null);
  const controller = useRef<AbortController | null>(null);

  const send = useCallback(
    async (content: string) => {
      setError(null);
      setLive({ conversationId, question: content, text: "", steps: [], links: [], proposals: [] });
      const abort = new AbortController();
      controller.current = abort;

      try {
        let id = conversationId;
        if (id === null) {
          id = (await create.mutateAsync(null)).id;
          const created = id;
          setLive((turn) => (turn ? { ...turn, conversationId: created } : turn));
          onConversationCreated(created);
        }
        await sendMessage.mutateAsync({
          conversationId: id,
          content,
          context,
          signal: abort.signal,
          onEvent: (event) => setLive((turn) => (turn ? applyEvent(turn, event) : turn)),
        });
      } catch (failure) {
        const aborted =
          abort.signal.aborted || (failure instanceof Error && (failure.name === "AbortError" || failure.name === "CanceledError"));
        if (!aborted) setError(failure);
      } finally {
        controller.current = null;
        setLive(null);
      }
    },
    [conversationId, context, create, sendMessage, onConversationCreated],
  );

  const stop = useCallback(() => controller.current?.abort(), []);

  return {
    send,
    stop,
    live,
    isSending: live !== null,
    error,
    /** Text of an `error` event of the stream, already in the admin's language. */
    streamErrorMessage: error instanceof AssistantStreamError && error.message ? error.message : null,
    clearError: () => setError(null),
  };
}
