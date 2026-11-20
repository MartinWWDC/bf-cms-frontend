import { isMasked, isMoney, isReference, type Translated } from "@/lib/api/types";

import type { Field } from "../types";

/** A record value turned into what the API takes back on save. */
export function toInputValue(field: Field, value: unknown): unknown {
  if (value === undefined || isMasked(value)) return field.type === "password" ? "" : null;
  if (field.translated) return { ...((value ?? {}) as Translated) };
  if (field.type === "money") return isMoney(value) ? value.amount : null;
  if (field.type === "relation_one" || field.type === "admin") {
    return isReference(value) ? value.id : ((value as { id?: unknown } | null)?.id ?? null);
  }
  return value ?? null;
}

export function isSameValue(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
