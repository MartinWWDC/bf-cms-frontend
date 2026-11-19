import { useQueries } from "@tanstack/react-query";

import { fetchResourceRecords } from "../api/resources.api";
import type { ListParams, ViewTab } from "../types";
import { resourceKeys } from "./keys";

export interface TabCount {
  total: number;
  /** A big resource stopped counting at its cap: show the total with a plus. */
  capped: boolean;
}

/**
 * Counts for the tabs of a view that the contract marks `count: true`.
 *
 * `field-types.md` names a counts endpoint (`.../views/{view}/counts`) that the API does
 * not route yet, so each count is the `meta.total` of that tab's own list, asked for one
 * row and only the id, the same way the backend counts its menu badges. They share the
 * list key prefix, so every write to the resource refreshes them.
 */
export function useTabCounts(resource: string, view: string | undefined, tabs: ViewTab[]): Record<string, TabCount> {
  const counted = tabs.filter((tab) => tab.count);
  const results = useQueries({
    queries: counted.map((tab) => {
      const params: ListParams = { view, tab: tab.key, perPage: 1, fields: ["id"] };
      return {
        queryKey: resourceKeys.list(resource, params),
        queryFn: () => fetchResourceRecords(resource, params),
        staleTime: 60_000,
        enabled: view !== undefined,
      };
    }),
  });

  const counts: Record<string, TabCount> = {};
  counted.forEach((tab, index) => {
    const meta = results[index]?.data?.meta;
    if (meta) counts[tab.key] = { total: meta.total, capped: meta.total_capped };
  });
  return counts;
}
