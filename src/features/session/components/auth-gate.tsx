"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useHydrated } from "@/hooks/use-hydrated";
import { isLocale } from "@/i18n/config";
import { getPreferredLocale, setPreferredLocale } from "@/i18n/locale-store";

import { useAuthToken } from "../hooks/use-auth-token";
import { useMe } from "../queries";

/**
 * Wraps every signed-in screen. Without a token the visitor is sent to login and comes
 * back to the page they asked for. A `401` on any request clears the token, which lands
 * here too. Once `/me` is known, its language becomes the interface language.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const token = useAuthToken();
  const { data: me } = useMe();

  useEffect(() => {
    if (!hydrated || token !== null) return;
    // Nothing of the previous session may stay in memory.
    queryClient.clear();
    const here = `${window.location.pathname}${window.location.search}`;
    router.replace(here === "/" ? "/login" : `/login?next=${encodeURIComponent(here)}`);
  }, [hydrated, token, router, queryClient]);

  const savedLocale = me?.locale;
  useEffect(() => {
    if (isLocale(savedLocale) && savedLocale !== getPreferredLocale()) setPreferredLocale(savedLocale);
  }, [savedLocale]);

  if (!hydrated || token === null) return null;
  return children;
}
