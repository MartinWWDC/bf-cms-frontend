import axios, { type AxiosRequestConfig, isAxiosError } from "axios";

import { clearAuthToken, getAuthToken } from "./auth-token";
import type { ApiErrorBody } from "./types";

/**
 * Axios instance for the BikeFlip CMS API (the `cms/` module of bf-backend, routes under `/cms/v1`).
 *
 * Rules, from `cms/docs/conventions.md`:
 * - Bearer token on every request. No cookies, no CSRF handshake.
 * - Labels and messages are translated by the backend from `Accept-Language`.
 * - Relative dates and day boundaries use the timezone in `X-Timezone`.
 * - Success is `{ data, meta? }`; an error is `{ error: { code, message, fields?, details } }`.
 * - Every response carries `X-Request-Id`; show it in error states so a problem can be traced.
 */

const CMS_API_URL = process.env.NEXT_PUBLIC_CMS_API_URL ?? "";

export const API_BASE_URL = `${CMS_API_URL}/cms/v1`;

export const DEFAULT_LOCALE = "en";

let locale: string = DEFAULT_LOCALE;

/** Interface language of the signed-in admin: en, de, it, es or fr. */
export function setApiLocale(next: string) {
  locale = next;
}

/** The language sent as `Accept-Language`, for the few requests that cannot use the Axios client. */
export function getApiLocale(): string {
  return locale;
}

/** IANA name of the browser's time zone, sent as `X-Timezone`. */
export function getApiTimeZone(): string | undefined {
  return browserTimeZone();
}

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * A failed request, in one shape whatever went wrong.
 *
 * `message` comes translated from the backend and can be shown as it is. It is empty when
 * the request never reached the API (`code: "network_error"`); use `useErrorMessage()` to
 * get a text for every case.
 */
export class ApiError extends Error {
  /** HTTP status; `undefined` when there was no response. */
  readonly status: number | undefined;
  /** Stable error code from the API, e.g. `validation_failed`, `stale_record`. */
  readonly code: string;
  /** Per-field messages, only for `validation_failed`. Keys use dots: `name.de`, `input.file`. */
  readonly fields: Record<string, string[]>;
  /** Extra data for specific codes, described in the docs where they occur. */
  readonly details: Record<string, unknown>;
  /** `X-Request-Id` of the response. */
  readonly requestId: string | undefined;
  /** Seconds to wait, from `Retry-After` or `details.retry_after`. */
  readonly retryAfter: number | undefined;

  constructor(init: {
    status?: number;
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    details?: Record<string, unknown>;
    requestId?: string;
    retryAfter?: number;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.fields = init.fields ?? {};
    this.details = init.details ?? {};
    this.requestId = init.requestId;
    this.retryAfter = init.retryAfter;
  }
}

function toNumber(value: unknown): number | undefined {
  const number = Number(value);
  return value !== undefined && value !== null && value !== "" && Number.isFinite(number) ? number : undefined;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!isAxiosError(error)) {
    return new ApiError({ code: "unexpected", message: error instanceof Error ? error.message : "" });
  }
  const response = error.response;
  if (!response) {
    return new ApiError({ code: error.code === "ECONNABORTED" ? "timeout" : "network_error", message: "" });
  }

  const body = (response.data as Partial<ApiErrorBody> | undefined)?.error;
  const details = body?.details && !Array.isArray(body.details) ? body.details : {};
  return new ApiError({
    status: response.status,
    code: body?.code ?? `http_${response.status}`,
    message: body?.message ?? "",
    fields: body?.fields,
    details,
    requestId: response.headers["x-request-id"] as string | undefined,
    retryAfter: toNumber(response.headers["retry-after"]) ?? toNumber(details.retry_after),
  });
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
  timeout: 120_000,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  config.headers.set("Accept-Language", locale);
  const timeZone = browserTimeZone();
  if (timeZone) config.headers.set("X-Timezone", timeZone);
  return config;
});

api.interceptors.response.use(
  (response) => {
    // A page instead of JSON means the request did not reach the CMS API: the API address is
    // missing or wrong (`NEXT_PUBLIC_CMS_API_URL`), and this app's own server answered.
    const type = String(response.headers["content-type"] ?? "");
    const expectsJson = !response.config.responseType || response.config.responseType === "json";
    if (expectsJson && response.status !== 204 && typeof response.data === "string" && !type.includes("json")) {
      return Promise.reject(new ApiError({ status: response.status, code: "not_cms_api", message: "" }));
    }
    return response;
  },
  (error: unknown) => {
    const apiError = toApiError(error);
    // The session is gone (expired, idle too long, revoked or password changed).
    if (apiError.status === 401 && apiError.code === "unauthenticated") clearAuthToken();
    return Promise.reject(apiError);
  },
);

/** `{ data, meta }` of a successful response. */
export interface Envelope<TData, TMeta = undefined> {
  data: TData;
  meta: TMeta;
}

/** GET and return `data`. */
export async function getData<TData>(url: string, config?: AxiosRequestConfig): Promise<TData> {
  const response = await api.get<Envelope<TData>>(url, config);
  return response.data.data;
}

/** GET and return `{ data, meta }`. */
export async function getEnvelope<TData, TMeta>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<Envelope<TData, TMeta>> {
  const response = await api.get<Envelope<TData, TMeta>>(url, config);
  return response.data;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return isApiError(error) ? error.status : undefined;
}

export function getApiErrorCode(error: unknown): string | undefined {
  return isApiError(error) ? error.code : undefined;
}

/** A fresh key per user intent, reused when that same intent is retried (`conventions.md` section 8). */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
