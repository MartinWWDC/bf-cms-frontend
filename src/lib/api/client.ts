import axios, { isAxiosError } from "axios";

/**
 * Axios instance for the BikeFlip CMS API (the `cms/` module of bf-backend, routes under `/cms/v1`).
 *
 * Auth is a bearer token returned by login + two-factor, sent on every request.
 * There are no cookies and no CSRF handshake (unlike bf-frontend's marketplace client).
 * The backend translates labels and error messages based on `Accept-Language`.
 */

const CMS_API_URL = process.env.NEXT_PUBLIC_CMS_API_URL ?? "";

export const API_BASE_URL = `${CMS_API_URL}/cms/v1`;

export const DEFAULT_LOCALE = "en";

let authToken: string | null = null;
let locale: string = DEFAULT_LOCALE;

/** Set after login / two-factor, clear (null) on logout or a 401. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

/** Interface language of the signed-in admin: en, de, it, es or fr. */
export function setApiLocale(next: string) {
  locale = next;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 120_000,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.set("Authorization", `Bearer ${authToken}`);
  }
  config.headers.set("Accept-Language", locale);
  return config;
});

export function getApiErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

/**
 * Best-effort message for a failed request. The exact CMS error envelope is defined in
 * `cms/docs/conventions.md`; tighten this once those docs are available.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: { message?: string } }
      | undefined;
    return data?.error?.message ?? data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
