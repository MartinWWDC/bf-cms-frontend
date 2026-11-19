"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat } from "@/i18n/use-format";
import { useErrorToast } from "@/lib/api/use-error-message";

import { useDeleteConversation } from "../mutations";
import { useConversations } from "../queries";
import type { AssistantConversation } from "../types";

interface ConversationListProps {
  activeId: number | null;
  /** `null` starts a new chat. */
  onSelect: (id: number | null) => void;
  /** No new chat or delete while an answer is being written. */
  disabled?: boolean;
}

/** The admin's own conversations, last active first. They are private. */
export function ConversationList({ activeId, onSelect, disabled = false }: ConversationListProps) {
  const t = useTranslations("assistant.conversations");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const toastError = useErrorToast();
  const conversations = useConversations();
  const remove = useDeleteConversation();
  const [deleting, setDeleting] = useState<AssistantConversation | null>(null);
  const entries = conversations.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 p-3">
        <Button className="w-full" variant="outline" disabled={disabled} onClick={() => onSelect(null)}>
          <PlusIcon />
          {t("new")}
        </Button>
      </div>

      <ul aria-label={t("label")} className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.isPending ? (
          <li className="flex flex-col gap-2 p-1">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </li>
        ) : conversations.isError ? (
          <li className="p-3 text-sm">
            <p className="text-destructive">{t("loadFailed")}</p>
            <button type="button" className="mt-1 underline underline-offset-4" onClick={() => conversations.refetch()}>
              {tCommon("tryAgain")}
            </button>
          </li>
        ) : entries.length === 0 ? (
          <li className="p-3 text-sm text-muted-foreground">{t("empty")}</li>
        ) : (
          entries.map((conversation) => (
            <li key={conversation.id} className="group/item relative">
              <button
                type="button"
                aria-current={conversation.id === activeId ? "true" : undefined}
                disabled={disabled && conversation.id !== activeId}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-md py-1.5 pr-8 pl-2.5 text-left outline-none hover:bg-accent/60 focus-visible:bg-accent/60 disabled:opacity-50",
                  conversation.id === activeId && "bg-accent",
                )}
              >
                <span className="truncate text-sm">{conversation.title ?? t("untitled")}</span>
                <span className="font-mono text-[0.6875rem] text-muted-foreground">
                  {conversation.last_message_at ? format.relative(conversation.last_message_at) : t("noMessages")}
                </span>
              </button>
              <button
                type="button"
                aria-label={t("delete", { title: conversation.title ?? t("untitled") })}
                disabled={disabled}
                onClick={() => setDeleting(conversation)}
                className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground opacity-0 outline-none group-hover/item:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring disabled:hidden pointer-coarse:opacity-100"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </li>
          ))
        )}
        {conversations.hasNextPage ? (
          <li className="p-1 text-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={conversations.isFetchingNextPage}
              onClick={() => conversations.fetchNextPage()}
            >
              {tCommon("loadMore")}
            </Button>
          </li>
        ) : null}
      </ul>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { title: deleting?.title ?? t("untitled") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (!deleting) return;
                const id = deleting.id;
                remove.mutate(id, {
                  onSuccess: () => {
                    if (id === activeId) onSelect(null);
                  },
                  onError: toastError,
                  onSettled: () => setDeleting(null),
                });
              }}
            >
              {tCommon("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
