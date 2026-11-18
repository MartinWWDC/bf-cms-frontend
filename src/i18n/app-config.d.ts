import type { Locale, Messages } from "./config";

/**
 * Tells next-intl the shape of our messages, so `useTranslations("…")` and `t("…")` are
 * checked at compile time: a typo or a removed key is a type error, not a runtime surprise.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
