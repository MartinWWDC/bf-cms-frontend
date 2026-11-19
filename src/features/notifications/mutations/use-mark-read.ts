import { useMutation, useQueryClient } from "@tanstack/react-query";

import { markAllNotificationsRead, markNotificationRead } from "../api/notifications.api";
import { notificationKeys } from "../queries/keys";

/** Marks one notification as read, or all of them when called with `"all"`. */
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (target: number | "all") =>
      target === "all" ? markAllNotificationsRead() : markNotificationRead(target),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
