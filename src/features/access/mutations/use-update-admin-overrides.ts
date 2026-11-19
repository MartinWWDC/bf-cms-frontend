import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateAdminOverrides } from "../api/access.api";
import { accessKeys } from "../queries/keys";
import type { OverrideEffect } from "../types";

export function useUpdateAdminOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ adminId, overrides }: { adminId: number; overrides: Record<string, OverrideEffect> }) =>
      updateAdminOverrides(adminId, overrides),
    onSuccess: (access) => queryClient.setQueryData(accessKeys.adminAccess(access.admin.id), access),
  });
}
