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
    const languageNames = new Intl.DisplayNames([locale], { type: "language" });
    const safe = (lookup: () => string | undefined, fallback: string) => {
      try {
        return lookup() ?? fallback;
      } catch {
        // An unknown code throws a RangeError.
        return fallback;
      }
    };

    return {
      /** `amount` is in minor units (cents). */
      money: ({ amount, currency }: { amount: number; currency: string }) =>
        safe(() => format.number(amount / 100, { style: "currency", currency }), `${amount / 100} ${currency}`),
      number: (value: number, maximumFractionDigits?: number) =>
        format.number(value, maximumFractionDigits === undefined ? undefined : { maximumFractionDigits }),
      /** `value` is already a percentage: `12.5` means 12.5 %. */
      percent: (value: number) => format.number(value / 100, { style: "percent", maximumFractionDigits: 1 }),
      /** A calendar date (`2026-11-18`) or the date part of a date-time. */
      date: (iso: string) =>
        format.dateTime(new Date(iso), {
          day: "2-digit",
          month: "short",
          year: "numeric",
          // A date without a time is a calendar day, not a moment: do not shift it by the time zone.
          ...(iso.length <= 10 ? { timeZone: "UTC" } : {}),
        }),
      time: (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" }),
      dateTime: (iso: string) =>
        format.dateTime(new Date(iso), {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      /** "3 hours ago", "in 2 days". */
      relative: (iso: string) => format.relativeTime(new Date(iso), new Date()),
      country: (code: string) => safe(() => regionNames.of(code.toUpperCase()), code),
      language: (code: string) => safe(() => languageNames.of(code), code),
      fileSize: (bytes: number) => {
        if (bytes < 1024) return format.number(bytes, { style: "unit", unit: "byte", unitDisplay: "narrow" });
        if (bytes < 1024 * 1024) {
          return format.number(bytes / 1024, { style: "unit", unit: "kilobyte", unitDisplay: "narrow", maximumFractionDigits: 0 });
        }
        return format.number(bytes / (1024 * 1024), {
          style: "unit",
          unit: "megabyte",
          unitDisplay: "narrow",
          maximumFractionDigits: 1,
        });
      },
    };
  }, [format, locale]);
}
