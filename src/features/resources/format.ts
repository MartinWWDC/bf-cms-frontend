import type { MoneyValue } from "./types";

/**
 * Display formatting. The locale is fixed for now; it will follow the admin's interface
 * language once `/me` is real.
 */
const LOCALE = "en-GB";

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

const regionNames = new Intl.DisplayNames([LOCALE], { type: "region" });

export function formatMoney({ amount, currency }: MoneyValue) {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(amount / 100);
}

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

export function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatCountry(code: string) {
  return regionNames.of(code) ?? code;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
