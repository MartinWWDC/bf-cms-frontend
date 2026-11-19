"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { SendIcon, SquareIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api/client";
import { useErrorMessage } from "@/lib/api/use-error-message";

import { useChat } from "../hooks/use-chat";
import { useConversation } from "../queries";
import type { AssistantPageContext, AssistantStatus } from "../types";
import { LiveAnswer, MessageItem, UserBubble } from "./message-item";

interface ChatPanelProps {
  conversationId: number | null;
  status: AssistantStatus;
  /** The page the admin came from, sent with every message. */
  context: AssistantPageContext | null;
  onClearContext: () => void;
  onConversationCreated: (id: number) => void;
  /** Tells the screen while an answer is being written. */
  onSendingChange: (sending: boolean) => void;
}

/** One conversation: its messages, the answer being written, and the message box. */
export function ChatPanel({
  conversationId,
  status,
  context,
  onClearContext,
  onConversationCreated,
  onSendingChange,
}: ChatPanelProps) {
  const t = useTranslations("assistant.chat");
  const errorMessage = useErrorMessage();
  const conversation = useConversation(conversationId);
  const chat = useChat({ conversationId, context, onConversationCreated });
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const maxLength = status.limits.max_message_characters;
  const blocked = status.blocked_by !== null;
  const { live, isSending } = chat;
  const showLive = live !== null && (live.conversationId === null || live.conversationId === conversationId);
  const messages = conversation.data?.messages ?? [];

  useEffect(() => onSendingChange(isSending), [isSending, onSendingChange]);

  // Keep the newest text in view while the answer grows.
  const liveLength = live ? live.text.length + live.steps.length : 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, liveLength, showLive]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || isSending || blocked || content.length > maxLength) return;
    setDraft("");
    void chat.send(content);
  };

  const error = chat.error;
  const errorText = error ? (chat.streamErrorMessage ?? (isApiError(error) ? errorMessage(error) : t("failed"))) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {conversationId !== null && conversation.isError && !showLive ? (
          <ErrorState title={t("loadFailed")} error={conversation.error} onRetry={() => conversation.refetch()} />
        ) : conversationId !== null && conversation.isPending && !showLive ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <Skeleton className="h-10 w-2/3 self-end" />
            <Skeleton className="h-24" />
          </div>
        ) : messages.length === 0 && !showLive ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="font-heading text-xl font-semibold tracking-tight">{t("emptyTitle")}</p>
            <p className="max-w-md text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        ) : (
          <ol className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} canPropose={status.can_propose} />
            ))}
            {showLive && live ? (
              <>
                <UserBubble content={live.question} />
                <LiveAnswer text={live.text} steps={live.steps} links={live.links} />
              </>
            ) : null}
          </ol>
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={submit} className="shrink-0 border-t bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {errorText ? (
            <p role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <span className="min-w-0 flex-1">
                {errorText}
                {isApiError(error) && error.requestId ? (
                  <span className="mt-0.5 block font-mono text-xs opacity-80 select-all">{error.requestId}</span>
                ) : null}
              </span>
              <button
                type="button"
                aria-label={t("dismissError")}
                onClick={chat.clearError}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon className="size-4" />
              </button>
            </p>
          ) : null}

          {blocked && status.blocked_by ? (
            <p className="rounded-md bg-tone-warning/10 px-3 py-2 text-sm">{t(`blocked.${status.blocked_by}`)}</p>
          ) : null}

          {context ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">
                {context.record_id && context.resource
                  ? t("contextRecord", { resource: context.resource, id: context.record_id })
                  : context.resource
                    ? t("contextList", { resource: context.resource })
                    : context.dashboard
                      ? t("contextDashboard", { dashboard: context.dashboard })
                      : t("contextPage")}
              </span>
              <button
                type="button"
                onClick={onClearContext}
                className="shrink-0 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("contextRemove")}
              </button>
            </p>
          ) : null}

          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              rows={2}
              maxLength={maxLength}
              disabled={blocked}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter starts a new line.
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
              className="max-h-48 min-h-16 flex-1 bg-background"
            />
            {isSending ? (
              <Button type="button" variant="outline" onClick={chat.stop}>
                <SquareIcon />
                {t("stop")}
              </Button>
            ) : (
              <Button type="submit" disabled={blocked || draft.trim() === ""}>
                <SendIcon />
                {t("send")}
              </Button>
            )}
          </div>
          <p className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span>{t("disclaimer")}</span>
            {draft.length > maxLength * 0.8 ? (
              <span className="shrink-0 font-mono tabular-nums">
                {draft.length} / {maxLength}
              </span>
            ) : null}
          </p>
        </div>
      </form>
    </div>
  );
}
