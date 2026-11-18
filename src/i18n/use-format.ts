"use client";

import { useMemo } from "react";
import { useFormatter, useLocale } from "next-intl";

/**
 * Locale-aware formatting for values shown in the UI. Always format through this hook
 * (never `toLocaleString` or a hard-coded locale), so numbers, money and dates follow the
 * admin's language and time zone.
 */
export function useFormat() {
  const format = useFormatter();
  const locale = useLocale();

  return useMemo(() => {
    const regionNames = new Intl.DisplayNames([locale], { type: "region" });
    return {
      /** `amount` is in minor units (cents). */
      money: ({ amount, currency }: { amount: number; currency: string }) =>
        format.number(amount / 100, { style: "currency", currency }),
      number: (value: number) => format.number(value),
      date: (iso: string) =>
        format.dateTime(new Date(iso), { day: "2-digit", month: "short", year: "numeric" }),
      time: (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" }),
      country: (code: string) => regionNames.of(code) ?? code,
    };
  }, [format, locale]);
}
