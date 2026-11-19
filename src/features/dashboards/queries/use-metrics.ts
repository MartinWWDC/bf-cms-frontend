import { useQuery } from "@tanstack/react-query";

import { fetchMetrics } from "../api/dashboards.api";
import { dashboardKeys } from "./keys";

/** Every metric the admin may see, for the personal dashboard editor. */
export function useMetrics(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.metrics(),
    queryFn: fetchMetrics,
    enabled,
    staleTime: 10 * 60_000,
  });
}
