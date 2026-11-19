"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat } from "@/i18n/use-format";
import type { Tone } from "@/lib/api/types";
import { recordHref, routes } from "@/lib/routes";

import { useMarkRead } from "../mutations";
import { useNotifications, useUnreadCount } from "../queries";
import type { Notification } from "../types";

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-tone-neutral",
  info: "bg-tone-info",
  success: "bg-tone-success",
  warning: "bg-tone-warning",
  danger: "bg-tone-danger",
};

/** Where a notification leads: its record, its task, or the jobs page. */
function notificationHref(notification: Notification): string | null {
  if (notification.task_id != null) return routes.tasks;
  if (notification.resource && notification.record_id) return recordHref(notification.resource, notification.record_id);
  if (notification.job_id) return routes.jobs;
  return null;
}

/** The bell in the header: unread count, the list, mark as read. */
export function NotificationBell({ className }: { className?: string }) {
  const t = useTranslations("notifications");
  const format = useFormat();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unread = useUnreadCount();
  const notifications = useNotifications(unreadOnly, open);
  const markRead = useMarkRead();
  const count = unread.data ?? 0;
  const entries = notifications.data?.pages.flatMap((page) => page.data) ?? [];

  const openNotification = (notification: Notification) => {
    if (!notification.read_at) markRead.mutate(notification.id);
    const href = notificationHref(notification);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative", className)}
            aria-label={count > 0 ? t("openWithCount", { count }) : t("open")}
          />
        }
      >
        <BellIcon />
        {count > 0 ? (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[0.5625rem] leading-4 text-brand-foreground">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] gap-0 p-0">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <p className="mr-auto text-sm font-medium">{t("title")}</p>
          <Button variant="ghost" size="xs" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(!unreadOnly)}>
            {unreadOnly ? t("showAll") : t("showUnread")}
          </Button>
          <Button variant="ghost" size="xs" disabled={count === 0 || markRead.isPending} onClick={() => markRead.mutate("all")}>
            {t("markAllRead")}
          </Button>
        </header>
        <ul className="scrollbar-slim max-h-[min(28rem,70svh)] overflow-y-auto">
          {notifications.isPending ? (
            <li className="flex flex-col gap-2 p-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </li>
          ) : notifications.isError ? (
            <li className="p-4 text-center text-sm text-destructive">{t("loadFailed")}</li>
          ) : entries.length === 0 ? (
            <li className="p-6 text-center text-sm text-muted-foreground">{unreadOnly ? t("emptyUnread") : t("empty")}</li>
          ) : (
            entries.map((notification) => (
              <li key={notification.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={cn(
                    "flex w-full gap-2.5 px-3 py-2.5 text-left outline-none hover:bg-accent/60 focus-visible:bg-accent/60",
                    notification.read_at && "opacity-65",
                  )}
                >
                  <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_DOT[notification.tone] ?? TONE_DOT.neutral)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{notification.title}</span>
                    <span className="block text-sm break-words text-muted-foreground">{notification.message}</span>
                    {notification.created_at ? (
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        {format.relative(notification.created_at)}
                      </span>
                    ) : null}
                  </span>
                  {notification.read_at ? null : <span className="sr-only">{t("unread")}</span>}
                </button>
              </li>
            ))
          )}
          {notifications.hasNextPage ? (
            <li className="p-2 text-center">
              <Button variant="ghost" size="sm" disabled={notifications.isFetchingNextPage} onClick={() => notifications.fetchNextPage()}>
                {t("loadMore")}
              </Button>
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
