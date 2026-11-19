import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateAdminRoles } from "../api/access.api";
import { accessKeys } from "../queries/keys";

export function useUpdateAdminRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ adminId, roles }: { adminId: number; roles: string[] }) => updateAdminRoles(adminId, roles),
    onSuccess: (access) => {
      queryClient.setQueryData(accessKeys.adminAccess(access.admin.id), access);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: accessKeys.staff(), refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: accessKeys.roles() }),
      ]);
    },
  });
}
