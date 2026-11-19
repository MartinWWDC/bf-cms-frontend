import { useMutation, useQueryClient } from "@tanstack/react-query";

import { navigationKeys } from "@/features/navigation/queries";

import { createDashboard, updateDashboard } from "../api/dashboards.api";
import { dashboardKeys } from "../queries/keys";
import type { DashboardInput } from "../types";

/** Creates a personal dashboard, or changes one when `key` is given. */
export function useSaveDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, input }: { key?: string; input: DashboardInput }) =>
      key === undefined ? createDashboard(input) : updateDashboard(key, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.list() }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.details() }),
        queryClient.invalidateQueries({ queryKey: navigationKeys.tree() }),
      ]),
  });
}
