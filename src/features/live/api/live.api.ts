import { api, getData } from "@/lib/api/client";

import type { LiveSettings } from "../types";

export function fetchLiveSettings(): Promise<LiveSettings> {
  return getData<LiveSettings>("/live");
}

/** Authorizes the connection for the admin's private channel. Answers the Pusher `{ auth }`. */
export async function authorizeLiveChannel(socketId: string, channelName: string): Promise<{ auth: string }> {
  const response = await api.post<{ auth: string }>("/live/auth", { socket_id: socketId, channel_name: channelName });
  return response.data;
}
