"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { jobKeys } from "@/features/jobs/queries";
import type { Job } from "@/features/jobs/types";
import { notificationKeys } from "@/features/notifications/queries";
import { taskKeys } from "@/features/tasks/queries";

import { authorizeLiveChannel } from "../api/live.api";
import { useLiveSettings } from "../queries";

/**
 * Connects the admin's private live channel and writes what it pushes into the query
 * cache, so job progress, the notification badge and task counts update without waiting
 * for the next poll. Renders nothing. Polling stays on as the documented fallback: where
 * `GET /live` says `enabled: false`, or the connection fails, nothing changes.
 */
export function LiveBridge() {
  const queryClient = useQueryClient();
  const { data: settings } = useLiveSettings();

  useEffect(() => {
    if (!settings?.enabled || settings.protocol !== "pusher" || !settings.key || !settings.channel) return;
    const { key, channel: channelName, cluster, host, port, scheme } = settings;
    let disposed = false;
    let disconnect: (() => void) | undefined;

    // The client is only downloaded where a live channel exists.
    void import("pusher-js").then(({ default: Pusher }) => {
      if (disposed) return;
      const pusher = new Pusher(key, {
        cluster: cluster ?? "",
        ...(host
          ? {
              wsHost: host,
              wsPort: port ?? undefined,
              wssPort: port ?? undefined,
              forceTLS: scheme === "https",
              enabledTransports: ["ws", "wss"] as ("ws" | "wss")[],
            }
          : {}),
        channelAuthorization: {
          customHandler: (params, callback) => {
            authorizeLiveChannel(params.socketId, params.channelName).then(
              (data) => callback(null, data),
              (error: unknown) => callback(error instanceof Error ? error : new Error("live auth failed"), null),
            );
          },
        },
      });
      const channel = pusher.subscribe(channelName);

      channel.bind("job.updated", (job: Job) => {
        if (job?.id) queryClient.setQueryData(jobKeys.detail(job.id), job);
        void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      });
      const onNotifications = (payload: { unread_count?: number }) => {
        if (typeof payload?.unread_count === "number") {
          queryClient.setQueryData(notificationKeys.unreadCount(), payload.unread_count);
        }
        void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      };
      channel.bind("notification.created", onNotifications);
      channel.bind("notifications.read", onNotifications);
      const onTasks = () => void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      channel.bind("task.updated", onTasks);
      channel.bind("tasks.counts", onTasks);

      disconnect = () => {
        channel.unbind_all();
        pusher.unsubscribe(channelName);
        pusher.disconnect();
      };
    });

    return () => {
      disposed = true;
      disconnect?.();
    };
  }, [settings, queryClient]);

  return null;
}
