import { useQuery } from "@tanstack/react-query";

import { fetchUnreadCount } from "../api/notifications.api";
import { notificationKeys } from "./keys";

/**
 * The badge on the bell. Polled: the live channel (`GET /live`, Pusher protocol) would push
 * it, but polling is the documented fallback and needs no extra client.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
