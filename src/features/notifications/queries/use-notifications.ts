import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchNotifications } from "../api/notifications.api";
import { notificationKeys } from "./keys";

export function useNotifications(unreadOnly: boolean, enabled = true) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: ({ pageParam }) => fetchNotifications(pageParam, unreadOnly),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.has_more ? last.meta.page + 1 : undefined),
    enabled,
    staleTime: 0,
  });
}
