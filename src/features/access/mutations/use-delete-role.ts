import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteRole } from "../api/access.api";
import { accessKeys } from "../queries/keys";

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accessKeys.roles() }),
  });
}
