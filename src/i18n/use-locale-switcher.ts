"use client";

import { useLocale } from "next-intl";

import { localeNames, locales } from "./config";
import { setPreferredLocale } from "./locale-store";

/** The current language, the available ones, and a setter. For language pickers. */
export function useLocaleSwitcher() {
  const locale = useLocale();
  return { locale, locales, localeNames, setLocale: setPreferredLocale };
}
