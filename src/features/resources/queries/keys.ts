import type { RecordId } from "@/lib/api/types";

import type { ListParams } from "../types";

/**
 * Query keys for a resource, from broad to narrow. Mutations invalidate by prefix:
 * `resourceKeys.lists(resource)` refreshes every page, sort and filter of a list, and
 * `resourceKeys.record(resource, id)` everything known about one record (detail, screen,
 * related lists, notes, history).
 */
export const resourceKeys = {
  root: ["resources"] as const,
  all: (resource: string) => [...resourceKeys.root, resource] as const,
  contract: (resource: string) => [...resourceKeys.all(resource), "contract"] as const,
  lists: (resource: string) => [...resourceKeys.all(resource), "list"] as const,
  list: (resource: string, params: ListParams) => [...resourceKeys.lists(resource), params] as const,
  records: (resource: string) => [...resourceKeys.all(resource), "record"] as const,
  record: (resource: string, id: RecordId) => [...resourceKeys.records(resource), String(id)] as const,
  detail: (resource: string, id: RecordId) => [...resourceKeys.record(resource, id), "detail"] as const,
  screen: (resource: string, id: RecordId) => [...resourceKeys.record(resource, id), "screen"] as const,
  related: (resource: string, id: RecordId, relation: string, params: ListParams) =>
    [...resourceKeys.record(resource, id), "related", relation, params] as const,
  notes: (resource: string, id: RecordId, linked: boolean) =>
    [...resourceKeys.record(resource, id), "notes", { linked }] as const,
  history: (resource: string, id: RecordId, types: string[]) =>
    [...resourceKeys.record(resource, id), "history", types] as const,
  savedViews: (resource: string) => [...resourceKeys.all(resource), "saved-views"] as const,
  assignmentSummary: (resource: string) => [...resourceKeys.all(resource), "assignment-summary"] as const,
  staff: (query: string) => ["staff", query] as const,
};
