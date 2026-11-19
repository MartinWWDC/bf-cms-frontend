import { isReference, type RecordId } from "@/lib/api/types";

import type { Action, Contract, Field, ResourceRecord, View, ViewTab } from "../types";

export function getField(contract: Contract, name: string): Field | undefined {
  return contract.fields.find((field) => field.name === name);
}

/**
 * The value of a field in a record. A field of a linked record (`buyer.email`) comes
 * nested in the linked record: `{ buyer: { id, resource, title, email } }`.
 */
export function getValue(record: Record<string, unknown>, name: string): unknown {
  if (name in record) return record[name];
  let value: unknown = record;
  for (const part of name.split(".")) {
    if (typeof value !== "object" || value === null) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

/** The view named in the URL, or the resource's first view. */
export function findView(contract: Contract, key: string | null | undefined): View | undefined {
  return contract.views.find((view) => view.key === key) ?? contract.views[0];
}

export function findTab(view: View | undefined, key: string | null | undefined): ViewTab | undefined {
  return view?.tabs.find((tab) => tab.key === key) ?? view?.tabs[0];
}

/** Fields that can be a list column: `fields` can name any field shown in the list or the detail. */
export function getColumnChoices(contract: Contract): Field[] {
  return contract.fields.filter(
    (field) => (field.in_list || field.in_detail) && field.type !== "relation_many" && field.type !== "password",
  );
}

export function resolveFields(contract: Contract, names: string[]): Field[] {
  return names.map((name) => getField(contract, name)).filter((field): field is Field => field !== undefined);
}

export function getAction(contract: Contract, key: string): Action | undefined {
  return contract.actions.find((action) => action.key === key);
}

/** A record's name for headers and links: its title field, else its id. */
export function getRecordTitle(contract: Contract, record: ResourceRecord, metaTitle?: string | null): string {
  if (metaTitle) return metaTitle;
  const value = getValue(record, contract.title_field);
  if (typeof value === "string" && value) return value;
  if (typeof value === "number") return String(value);
  if (isReference(value) && value.title) return value.title;
  return `#${record.id}`;
}

/** `-created_at` to the table's sort state and back. Only the first field is shown in the header. */
export function parseSort(sort: string | null | undefined): { field: string; desc: boolean } | null {
  const first = sort?.split(",")[0]?.trim();
  if (!first) return null;
  return first.startsWith("-") ? { field: first.slice(1), desc: true } : { field: first, desc: false };
}

export function serializeSort(field: string, desc: boolean): string {
  return desc ? `-${field}` : field;
}

export function sameIds(a: RecordId | null | undefined, b: RecordId | null | undefined) {
  return a != null && b != null && String(a) === String(b);
}
