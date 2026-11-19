import { useQuery } from "@tanstack/react-query";

import { fetchDashboardOptions } from "../api/access.api";
import { accessKeys } from "./keys";

/** Built-in dashboards a role's home dashboard can be chosen from. */
export function useDashboardOptions(enabled = true) {
  return useQuery({
    queryKey: accessKeys.dashboardOptions(),
    queryFn: fetchDashboardOptions,
    enabled,
    staleTime: 5 * 60_000,
    select: (dashboards) => dashboards.filter((dashboard) => dashboard.type === "built_in"),
  });
}
