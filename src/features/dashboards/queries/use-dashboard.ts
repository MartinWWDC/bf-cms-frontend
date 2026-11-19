import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchDashboard } from "../api/dashboards.api";
import type { MetricParams } from "../types";
import { dashboardKeys } from "./keys";

/** Heavy metrics are calculated in the background: ask again while a card is pending. */
const PENDING_REFETCH_MS = 4_000;

export function useDashboard(key: string | null, params: MetricParams) {
  return useQuery({
    queryKey: dashboardKeys.detail(key ?? "", params),
    queryFn: () => fetchDashboard(key as string, params),
    enabled: key !== null,
    placeholderData: keepPreviousData,
    // Results are cached by the backend for 15 minutes; `cached` and `calculated_at` say so.
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.data?.cards.some((card) => card.value?.status === "pending") ? PENDING_REFETCH_MS : false,
  });
}
