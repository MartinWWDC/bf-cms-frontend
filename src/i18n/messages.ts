import en from "../../messages/en.json";

import type { Locale, Messages } from "./config";

/**
 * One loader per language. English ships with the app (it is the fallback); the others
 * load on demand, so nobody downloads languages they do not use.
 *
 * Each loader is typed as `Messages`, so a language file that is missing a key fails the
 * type check. `npm run i18n:check` additionally catches extra keys and placeholder drift.
 */
const loaders: Record<Locale, () => Promise<Messages>> = {
  en: async () => en,
  de: () => import("../../messages/de.json").then((module) => module.default),
  it: () => import("../../messages/it.json").then((module) => module.default),
  es: () => import("../../messages/es.json").then((module) => module.default),
  fr: () => import("../../messages/fr.json").then((module) => module.default),
};

export const defaultMessages: Messages = en;

export function loadMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}
