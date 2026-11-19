import { useMutation, useQueryClient } from "@tanstack/react-query";

import { navigationKeys } from "@/features/navigation/queries";

import { deleteDashboard } from "../api/dashboards.api";
import { dashboardKeys } from "../queries/keys";

export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDashboard,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.list() }),
        queryClient.invalidateQueries({ queryKey: navigationKeys.tree() }),
      ]),
  });
}
