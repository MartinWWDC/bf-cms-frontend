import { useQuery } from "@tanstack/react-query";

import { fetchDashboards } from "../api/dashboards.api";
import { dashboardKeys } from "./keys";

/** The dashboards the admin may open, with the home dashboard in `meta.home`. */
export function useDashboards(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.list(),
    queryFn: fetchDashboards,
    enabled,
    staleTime: 5 * 60_000,
  });
}
