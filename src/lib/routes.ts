import type { RecordId } from "@/lib/api/types";

/**
 * Where things live in the app. The API never sends URLs of this app, only resource, view,
 * record and page names; every link is built here.
 */

export interface ResourceLinkQuery {
  tab?: string | null;
  /** Free-text search. */
  q?: string | null;
  /** Filter in the API's filter grammar. */
  filter?: unknown;
  sort?: string | null;
  groupBy?: string | null;
  savedView?: RecordId | null;
  record?: RecordId | null;
}

/** The generic list of a resource, optionally on one view, tab, filter or open record. */
export function resourceHref(resource: string, view?: string | null, query: ResourceLinkQuery = {}): string {
  const path = view ? `/r/${resource}/${view}` : `/r/${resource}`;
  const params = new URLSearchParams();
  if (query.savedView != null) params.set("saved", String(query.savedView));
  if (query.tab) params.set("tab", query.tab);
  if (query.q) params.set("q", query.q);
  if (query.filter != null) params.set("filter", JSON.stringify(query.filter));
  if (query.sort) params.set("sort", query.sort);
  if (query.groupBy) params.set("group", query.groupBy);
  if (query.record != null) params.set("record", String(query.record));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** One record, opened in the drawer over its resource list. */
export function recordHref(resource: string, id: RecordId): string {
  return resourceHref(resource, null, { record: id });
}

/** A fixed screen named by a navigation `page` node: `roles`, `staff`, `audit`, `tasks`, `dashboards/{key}`. */
export function pageHref(page: string): string {
  return `/${page}`;
}

export const routes = {
  home: "/",
  login: "/login",
  sessions: "/account/sessions",
  jobs: "/jobs",
  tasks: "/tasks",
  assistant: "/assistant",
  warehouseScan: "/warehouse/scan",
  warehouseLabels: "/warehouse/labels",
  dashboard: (key: string) => `/dashboards/${key}`,
} as const;
