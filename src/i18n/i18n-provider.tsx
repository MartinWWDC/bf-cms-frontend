"use client";

import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";

import { setApiLocale } from "@/lib/api/client";

import { defaultLocale, type Locale, type Messages } from "./config";
import { getPreferredLocale, subscribeToPreferredLocale } from "./locale-store";
import { defaultMessages, loadMessages } from "./messages";

interface ActiveLanguage {
  locale: Locale;
  messages: Messages;
}

const subscribeToNothing = () => () => {};
const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getServerTimeZone = () => "UTC";

/**
 * Provides translations and locale-aware formatting to the whole app.
 *
 * The language is a per-admin preference, not part of the URL, so there is no locale
 * routing: pages are prerendered once in English and the browser switches to the admin's
 * language. The previous language stays on screen until the new one has loaded, so the UI
 * never shows raw message keys.
 *
 * On a language change the API client starts sending the new `Accept-Language` and all
 * cached data is refetched, because labels and errors from the backend are translated too.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const preferred = useSyncExternalStore(
    subscribeToPreferredLocale,
    getPreferredLocale,
    () => defaultLocale,
  );
  const timeZone = useSyncExternalStore(subscribeToNothing, getBrowserTimeZone, getServerTimeZone);
  const [active, setActive] = useState<ActiveLanguage>({
    locale: defaultLocale,
    messages: defaultMessages,
  });

  useEffect(() => {
    if (preferred === active.locale) return;
    let cancelled = false;
    loadMessages(preferred).then((messages) => {
      if (cancelled) return;
      setApiLocale(preferred);
      setActive({ locale: preferred, messages });
      void queryClient.invalidateQueries();
    });
    return () => {
      cancelled = true;
    };
  }, [preferred, active.locale, queryClient]);

  useEffect(() => {
    document.documentElement.lang = active.locale;
  }, [active.locale]);

  return (
    <NextIntlClientProvider locale={active.locale} messages={active.messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
