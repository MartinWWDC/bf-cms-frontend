"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { MetricParams, MetricRangeKey } from "../types";

/** Filters are kept as `f.{key}=value`, apart from the range parameters. */
const FILTER_PREFIX = "f.";

export interface DashboardStatePatch {
  range?: MetricRangeKey | null;
  from?: string | null;
  to?: string | null;
  compare?: boolean;
  /** One filter; `null` clears it. */
  filter?: { key: string; value: string | null };
}

/**
 * The range, comparison and filters of a dashboard, kept in the URL so a view can be
 * shared. Without `range` in the URL every card uses its own default range.
 */
export function useDashboardState() {
  const searchParams = useSearchParams();

  const params = useMemo<MetricParams>(() => {
    const filters: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith(FILTER_PREFIX) && value) filters[key.slice(FILTER_PREFIX.length)] = value;
    }
    return {
      range: (searchParams.get("range") as MetricRangeKey | null) ?? null,
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      compare: searchParams.get("compare") !== "0",
      filters,
    };
  }, [searchParams]);

  const setState = useCallback((patch: DashboardStatePatch) => {
    const next = new URLSearchParams(window.location.search);
    const set = (key: string, value: string | null | undefined) => (value ? next.set(key, value) : next.delete(key));

    if (patch.range !== undefined) {
      set("range", patch.range);
      if (patch.range !== "custom") {
        next.delete("from");
        next.delete("to");
      }
    }
    if (patch.from !== undefined) set("from", patch.from);
    if (patch.to !== undefined) set("to", patch.to);
    if (patch.compare !== undefined) set("compare", patch.compare ? null : "0");
    if (patch.filter) set(`${FILTER_PREFIX}${patch.filter.key}`, patch.filter.value);

    const query = next.toString();
    window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, []);

  return [params, setState] as const;
}
