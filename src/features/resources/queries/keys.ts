import type { ListParams } from "../types";

/**
 * Query keys for a resource, from broad to narrow. Mutations invalidate by prefix:
 * `resourceKeys.lists(resource)` refreshes every page, sort and search of a list.
 */
export const resourceKeys = {
  all: (resource: string) => ["resources", resource] as const,
  contract: (resource: string) => [...resourceKeys.all(resource), "contract"] as const,
  lists: (resource: string) => [...resourceKeys.all(resource), "list"] as const,
  list: (resource: string, params: ListParams) => [...resourceKeys.lists(resource), params] as const,
  records: (resource: string) => [...resourceKeys.all(resource), "record"] as const,
  record: (resource: string, id: string) => [...resourceKeys.records(resource), id] as const,
};
