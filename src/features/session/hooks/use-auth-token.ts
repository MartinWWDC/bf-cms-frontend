"use client";

import { useSyncExternalStore } from "react";

import { getAuthToken, subscribeToAuthToken } from "@/lib/api/auth-token";

/** The bearer token, or `null` when nobody is signed in. Always `null` on the server. */
export function useAuthToken() {
  return useSyncExternalStore(subscribeToAuthToken, getAuthToken, () => null);
}
