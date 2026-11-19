import { api, getData } from "@/lib/api/client";

import type { NotificationList } from "../types";

export async function fetchNotifications(page: number, unreadOnly: boolean): Promise<NotificationList> {
  const response = await api.get<NotificationList>("/notifications", {
    params: { page, per_page: 30, unread: unreadOnly ? 1 : undefined },
  });
  return response.data;
}

export async function fetchUnreadCount(): Promise<number> {
  const data = await getData<{ unread_count: number }>("/notifications/unread-count");
  return data.unread_count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
