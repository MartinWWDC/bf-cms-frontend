import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Where the chosen interface language is kept in the browser.
 *
 * For now this is the only source. Once login exists, the admin's saved language from
 * `/me` should seed this store on sign-in, and changing it should also save it on the
 * backend (build plan: per-admin language setting).
 */

const STORAGE_KEY = "bf-cms.locale";
const CHANGE_EVENT = "bf-cms:locale-change";

function readStored(): Locale | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return null;
  }
}

/** First browser language we support, e.g. "de-AT" -> "de". */
function fromBrowser(): Locale | null {
  for (const tag of window.navigator.languages ?? []) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}

export function getPreferredLocale(): Locale {
  return readStored() ?? fromBrowser() ?? defaultLocale;
}

export function setPreferredLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // The choice then lasts only until the page is reloaded.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToPreferredLocale(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  // Keeps other open tabs in sync.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
