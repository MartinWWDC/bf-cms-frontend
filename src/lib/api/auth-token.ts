/**
 * Where the CMS bearer token is kept in the browser.
 *
 * The API issues a token after login + two-factor (`conventions.md` section 2). It is stored
 * in `localStorage` so every tab of the same browser shares one session: staff open records
 * in new tabs all day, and a per-tab store would ask for a two-factor code each time.
 * The backend ends a session after 12 hours, after 60 minutes without a request, or when it
 * is revoked; a `401 unauthenticated` then clears the token here.
 */

const STORAGE_KEY = "bf-cms.session";
const CHANGE_EVENT = "bf-cms:session-change";

interface StoredSession {
  token: string;
  /** ISO time the backend said the token expires at. */
  expiresAt: string;
}

let cached: StoredSession | null | undefined;

function read(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.token !== "string" || typeof parsed.expiresAt !== "string") return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return null;
  }
}

function current(): StoredSession | null {
  if (cached === undefined) cached = read();
  return cached;
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getAuthToken(): string | null {
  return current()?.token ?? null;
}

/** Called after `POST auth/two-factor` or `auth/two-factor/setup` answered with a token. */
export function setAuthToken(token: string, expiresAt: string) {
  cached = { token, expiresAt };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // The session then lasts only until the page is reloaded.
  }
  notify();
}

/** Called on sign-out and whenever the API answers `401 unauthenticated`. */
export function clearAuthToken() {
  if (current() === null) return;
  cached = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to remove.
  }
  notify();
}

export function subscribeToAuthToken(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    // Another tab signed in or out.
    cached = undefined;
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
