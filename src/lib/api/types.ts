/**
 * Shapes every CMS endpoint shares, written from `cms/docs/openapi.json`
 * (`components.schemas`) and `conventions.md` sections 3, 4 and 11.
 *
 * Feature-specific shapes live in each feature's `types.ts`.
 */

/** A tone is mapped to a colour by the frontend; the backend never sends colours. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** Ids are opaque: some are numbers, some strings (UUIDs). Send them back as received. */
export type RecordId = string | number;

/** `amount` is in minor units (cents). */
export interface Money {
  amount: number;
  currency: string;
}

/** A sensitive value. The real one only comes from the reveal endpoint. */
export interface Masked {
  masked: true;
  preview: string;
}

/** A linked record. Extra keys are fields of the linked record asked for with a dotted name. */
export interface Reference {
  id: RecordId;
  resource: string;
  title: string | null;
  [field: string]: unknown;
}

/** One entry per language; `null` where there is no text yet. */
export type Translated = Record<string, string | null>;

/** An admin as embedded in notes, history and assignments. */
export interface AdminRef {
  id: number;
  name: string;
}

export interface StoredFile {
  name: string;
  size: number;
  mime: string;
  url: string;
}

export interface StoredImage {
  id?: RecordId;
  position?: number;
  url: string;
  thumb_url: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
}

/** `meta` of feeds without a total (history, notes, notifications). */
export interface PageMeta {
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    details: Record<string, unknown>;
  };
}

/** Answer of anything that was queued: bulk actions, exports, bulk assignment. */
export interface QueuedJob {
  job_id: string;
}

export function isMasked(value: unknown): value is Masked {
  return typeof value === "object" && value !== null && (value as { masked?: unknown }).masked === true;
}

export function isMoney(value: unknown): value is Money {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Money).amount === "number" &&
    typeof (value as Money).currency === "string"
  );
}

export function isReference(value: unknown): value is Reference {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as Reference).resource === "string"
  );
}
