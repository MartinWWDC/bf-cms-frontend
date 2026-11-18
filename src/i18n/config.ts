import type en from "../../messages/en.json";

/** Interface languages: the same five as the public site (bf-frontend). */
export const locales = ["en", "de", "it", "es", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** English is the source of truth: its keys define what every other language must contain. */
export type Messages = typeof en;

/** Each language under its own name, for the language switcher. Never translated. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  it: "Italiano",
  es: "Español",
  fr: "Français",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
