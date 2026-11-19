import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateRoleHomeDashboard } from "../api/access.api";
import { accessKeys } from "../queries/keys";

export function useUpdateRoleHomeDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, dashboard }: { roleId: number; dashboard: string | null }) =>
      updateRoleHomeDashboard(roleId, dashboard),
    onSuccess: (result) => queryClient.setQueryData(accessKeys.homeDashboard(result.role_id), result),
  });
}
